const express = require('express');
const neo4j = require('neo4j-driver');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');
const multer = require('multer');
const path = require('path');
const { ejecutarVentaOnChain, ejecutarMintOnChain, ejecutarTransferenciaOnChain } = require('./services/blockchain');
const { validateBody, loginSchema, ventaSchema, crearProductoSchema, registrarArtesanoSchema, registrarClienteSchema, transferenciaTiendaSchema } = require('./middlewares/validation');
const { subirAIPFS } = require('./services/ipfs');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

const upload = multer({ storage: multer.memoryStorage() });

// ==========================================
// A2) CONFIGURACIÓN DE SWAGGER DOCUMENTACIÓN
// ==========================================
const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Kipulux Corporativo Web2.5 API',
        version: '1.0.0',
        description: 'API interactiva de Kipulux para la trazabilidad y certificación de cuero en Perú.',
    },
    servers: [
        {
            url: 'http://localhost:3005',
            description: 'Servidor de Desarrollo Local',
        },
    ],
    components: {
        securitySchemes: {
            BearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
    },
};

const swaggerOptions = {
    swaggerDefinition,
    apis: [__filename], // Documentar directamente en este archivo
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ==========================================
// B) INICIALIZACIÓN DEL DRIVER OFICIAL DE NEO4J
// ==========================================
const uri = process.env.NEO4J_URI || 'neo4j://127.0.0.1:7687';
const user = process.env.NEO4J_USER || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'Tu_Contraseña_De_Neo4j_Desktop_Aquí';
const jwtSecret = process.env.JWT_SECRET || 'Kipulux_Clave_Secreta_Segura_2026';

// KMS Simulado para el resguardo cifrado de Claves Privadas de Proveedores
const encryptionAlgorithm = 'aes-256-cbc';
const kmsKey = crypto.scryptSync(jwtSecret, 'salt_kms_2026', 32);

function cifrarClavePrivada(privateKeyString) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(encryptionAlgorithm, kmsKey, iv);
    let encrypted = cipher.update(privateKeyString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
}

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

// Verificar la conexión inicial al DBMS Neo4j
driver.verifyConnectivity()
    .then(() => console.log(`[Neo4j] Conexión establecida con éxito en ${uri}`))
    .catch(err => console.error('[Neo4j] Error crítico al conectar a la base de datos:', err));

// ==========================================
// C) MIDDLEWARE DE SEGURIDAD (authenticateToken)
// ==========================================
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Capturar "Bearer <TOKEN>"

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    }

    jwt.verify(token, jwtSecret, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido o expirado.' });
        }
        
        // Inyectamos el DNI/RUC decodificado del token en la solicitud
        req.user = {
            DNI_O_RUC: decoded.DNI_O_RUC
        };
        next();
    });
}

/**
 * @swagger
 * /api/productos/{sku}:
 *   get:
 *     summary: Consulta del Pasaporte Digital del Producto (Trazabilidad)
 *     description: Obtiene la información histórica del producto y su genealogía de lotes de cuero de forma segura. Protegido contra BOLA (solo el comprador del NFT puede ver su trazabilidad).
 *     tags:
 *       - Flujo Cliente
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: sku
 *         in: path
 *         required: true
 *         description: Código SKU único de la pieza física.
 *         schema:
 *           type: string
 *         example: "KIPU-CUERO-001"
 *     responses:
 *       200:
 *         description: Pasaporte digital encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sku:
 *                   type: string
 *                 status:
 *                   type: string
 *                 Foto_Producto:
 *                   type: string
 *                 taller_artesano:
 *                   type: string
 *                 RUC_Fabricante:
 *                   type: string
 *                 Nro_Comprobante_Pago:
 *                   type: string
 *                 Hash_Comprobante_Pago:
 *                   type: string
 *                 lotes:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Token no proporcionado.
 *       403:
 *         description: Token inválido.
 *       404:
 *         description: Producto no encontrado o no autorizado.
 */
app.get('/api/productos/:sku', authenticateToken, async (req, res) => {
    const { sku } = req.params;
    const { DNI_O_RUC } = req.user; // DNI extraído de forma segura desde el JWT decodificado

    const session = driver.session();

    // Consulta Cypher Parametrizada con Query Anchoring (Anclaje al Cliente por DNI y propiedad PROPIEDAD_DE)
    const query = `
        MATCH (c:Cliente {DNI_O_RUC_Comprador: $dni_o_ruc})<-[r:PROPIEDAD_DE]-(p:Producto {SKU_Producto_Final: $sku})
        MATCH (art:Artesano)-[:CONFECCIONÓ]->(p)
        MATCH (p)-[:HEREDA_DE]->(loteInmediato:LoteCuero)
        MATCH path = (loteInmediato)-[:SUBDIVIDIDO_DE*0..]->(loteAncestro:LoteCuero)
        OPTIONAL MATCH (p)-[:ENTREGADO_A]->(t:Tienda)
        WITH p, art, path, r, t
        ORDER BY length(path) DESC
        LIMIT 1
        RETURN 
            p.SKU_Producto_Final AS sku,
            p.status AS status,
            p.Foto_Producto AS Foto_Producto,
            p.PDF_Certificado_Previo AS PDF_Certificado_Previo,
            art.nombre_taller AS taller_artesano,
            art.RUC_Fabricante AS RUC_Fabricante,
            r.Nro_Comprobante_Pago AS Nro_Comprobante_Pago,
            r.Hash_Comprobante_Pago AS Hash_Comprobante_Pago,
            t.nombre_tienda AS nombre_tienda,
            t.id_tienda AS id_tienda,
            [node IN nodes(path) | {
                ID_Lote_Cuero_Utilizado: node.ID_Lote_Cuero_Utilizado,
                ruc_curtiembre: node.ruc_curtiembre,
                PDF_Certificado_Previo: node.PDF_Certificado_Previo
            }] AS lotes
    `;

    try {
        const result = await session.run(query, {
            sku: sku,
            dni_o_ruc: DNI_O_RUC
        });

        // Si la consulta no devuelve registros, el camino está roto (o no le pertenece al cliente)
        if (result.records.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado o no autorizado para este usuario.' });
        }

        const record = result.records[0];
        const responseData = {
            sku: record.get('sku'),
            status: record.get('status'),
            Foto_Producto: record.get('Foto_Producto'),
            PDF_Certificado_Previo: record.get('PDF_Certificado_Previo'),
            taller_artesano: record.get('taller_artesano'),
            RUC_Fabricante: record.get('RUC_Fabricante'),
            Nro_Comprobante_Pago: record.get('Nro_Comprobante_Pago'),
            Hash_Comprobante_Pago: record.get('Hash_Comprobante_Pago'),
            nombre_tienda: record.get('nombre_tienda'),
            id_tienda: record.get('id_tienda'),
            lotes: record.get('lotes')
        };

        return res.status(200).json(responseData);

    } catch (error) {
        console.error('[API] Error ejecutando la consulta en Neo4j:', error);
        return res.status(500).json({ error: 'Error interno al consultar la trazabilidad del producto.' });
    } finally {
        // Aseguramos el cierre de la sesión de Neo4j
        await session.close();
    }
});

/**
 * @swagger
 * /api/productos/vender:
 *   post:
 *     summary: Certificación y Registro de Venta E2E
 *     description: Permite registrar una venta. Verifica que la Tienda emisora posea la custodia del NFT (relación ENTREGADO_A). El backend calcula el hash SHA-256 de la boleta SUNAT, llama a registrarVenta on-chain (cambio de estado a VENDIDO y transferencia de propiedad) y actualiza Neo4j vinculándolo a la Tienda y al Comprador.
 *     tags:
 *       - Flujo Tienda
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - SKU_Producto_Final
 *               - DNI_O_RUC_Comprador
 *               - Nro_Comprobante_Pago
 *               - wallet_address_comprador
 *               - xml_boleta
 *             properties:
 *               SKU_Producto_Final:
 *                 type: string
 *                 example: "KIPU-CUERO-001"
 *               DNI_O_RUC_Comprador:
 *                 type: string
 *                 example: "00792282"
 *               Nro_Comprobante_Pago:
 *                 type: string
 *                 example: "B001-00029384"
 *               wallet_address_comprador:
 *                 type: string
 *                 example: "0x85303C737976118D09559c5D7cdBE2cF44B6C318"
 *               xml_boleta:
 *                 type: string
 *                 example: "<invoice><issuer>Alda</issuer><total>250.00</total></invoice>"
 *               id_tienda:
 *                 type: string
 *                 example: "20600123456"
 *     responses:
 *       200:
 *         description: Venta registrada con éxito.
 *       400:
 *         description: Parámetros inválidos, el producto no está en la tienda o ya está vendido.
 *       403:
 *         description: No autorizado.
 *       500:
 *         description: Error interno al procesar transacción blockchain o Neo4j.
 */
app.post('/api/productos/vender', authenticateToken, validateBody(ventaSchema), async (req, res) => {
    const { SKU_Producto_Final, DNI_O_RUC_Comprador, Nro_Comprobante_Pago, wallet_address_comprador, xml_boleta } = req.body;
    const tiendaRuc = req.user.DNI_O_RUC;

    if (!SKU_Producto_Final || !DNI_O_RUC_Comprador || !Nro_Comprobante_Pago || !wallet_address_comprador || !xml_boleta) {
        return res.status(400).json({ error: 'Faltan parámetros obligatorios: SKU_Producto_Final, DNI_O_RUC_Comprador, Nro_Comprobante_Pago, wallet_address_comprador y xml_boleta.' });
    }

    const session = driver.session();

    try {
        // 1. Obtener el Token ID, Estado y validar custodia en Neo4j
        const findResult = await session.run(
            `MATCH (p:Producto {SKU_Producto_Final: $sku})-[r:ENTREGADO_A]->(t:Tienda {id_tienda: $tiendaRuc}) 
             RETURN p.nft_token_id AS tokenId, p.status AS status`,
            { sku: SKU_Producto_Final, tiendaRuc }
        );

        if (findResult.records.length === 0) {
            return res.status(400).json({ error: 'La tienda no posee la custodia de este producto o el producto no existe.' });
        }

        const record = findResult.records[0];
        const status = record.get('status');
        const tokenId = record.get('tokenId');

        if (status === 'VENDIDO') {
            return res.status(400).json({ error: 'El producto ya figura como VENDIDO en la base de datos.' });
        }

        if (!tokenId) {
            return res.status(400).json({ error: 'El producto no posee un NFT Token ID registrado.' });
        }

        console.log(`[API Venta] Iniciando transacción de venta coordinada. SKU: ${SKU_Producto_Final}, TokenID: ${tokenId}`);

        // 2. Firmar y registrar en zkSyscoin la venta (Cambio de estado y Hash de boleta)
        const { txHash, hashSUNAT } = await ejecutarVentaOnChain(tokenId, wallet_address_comprador, xml_boleta);

        console.log(`[API Venta] Confirmada transacción blockchain: ${txHash}. Actualizando Neo4j...`);

        // 3. Actualizar Neo4j (Tienda, Producto, Cliente y Venta B2C)
        await session.run(`
            MATCH (p:Producto {SKU_Producto_Final: $sku})
            MATCH (t:Tienda {id_tienda: $tiendaRuc})
            MERGE (c:Cliente {DNI_O_RUC_Comprador: $dni_o_ruc})
            ON CREATE SET c.nombre_completo = 'Comprador Kipulux', c.wallet_address = $wallet_address
            ON MATCH SET c.wallet_address = $wallet_address
            SET p.status = 'VENDIDO'
            MERGE (t)-[rv:VENDIÓ]->(p)
            SET rv.Nro_Comprobante_Pago = $nro_comprobante,
                rv.Hash_Comprobante_Pago = $hash_boleta,
                rv.tx_hash_venta = $txHash,
                rv.fecha = datetime()
            MERGE (p)-[:PROPIEDAD_DE {
                fecha: datetime(),
                Hash_Comprobante_Pago: $hash_boleta,
                Nro_Comprobante_Pago: $nro_comprobante,
                tx_hash_venta: $txHash
            }]->(c)
            MERGE (p)-[:VENDIDO_A {
                fecha: datetime(),
                Hash_Comprobante_Pago: $hash_boleta,
                Nro_Comprobante_Pago: $nro_comprobante,
                tx_hash_venta: $txHash
            }]->(c)
        `, {
            sku: SKU_Producto_Final,
            tiendaRuc,
            dni_o_ruc: DNI_O_RUC_Comprador,
            wallet_address: wallet_address_comprador,
            hash_boleta: hashSUNAT,
            nro_comprobante: Nro_Comprobante_Pago,
            txHash
        });

        console.log(`[API Venta] Éxito. Grafo de venta actualizado.`);

        return res.status(200).json({
            message: 'Venta procesada y certificada con éxito en zkSyscoin y Neo4j.',
            sku: SKU_Producto_Final,
            tokenId,
            comprador: DNI_O_RUC_Comprador,
            hashSUNAT,
            txHash
        });

    } catch (error) {
        console.error('[API Venta] Error procesando la venta híbrida:', error);
        return res.status(500).json({ 
            error: 'Error interno en la transacción coordinada de venta.', 
            details: error.message 
        });
    } finally {
        await session.close();
    }
});

/**
 * @swagger
 * /api/auth/mock-login:
 *   post:
 *     summary: Login por credenciales (Username o Email)
 *     description: Emite un token JWT firmado válido por 2 horas tras verificar las credenciales del actor (Tienda, Artesano o Cliente) en el grafo Neo4j.
 *     tags:
 *       - Autenticación y Debug
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Nombre de usuario o correo electrónico del actor.
 *                 example: "tienda_cusco"
 *               password:
 *                 type: string
 *                 description: Contraseña del actor.
 *                 example: "Tienda123!"
 *     responses:
 *       200:
 *         description: Login exitoso, devuelve el token Bearer y datos del usuario.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 tokenType:
 *                   type: string
 *                   example: Bearer
 *                 expiresIn:
 *                   type: string
 *                   example: 2h
 *                 type:
 *                   type: string
 *                   example: Tienda
 *                 dni_o_ruc:
 *                   type: string
 *                   example: "20600123456"
 *       401:
 *         description: Identificador o contraseña incorrectos.
 *       400:
 *         description: Error de validación Zod.
 */
app.post('/api/auth/mock-login', validateBody(loginSchema), async (req, res) => {
    const { identifier, password } = req.body;
    const session = driver.session();

    try {
        const result = await session.run(`
            MATCH (u)
            WHERE (u:Artesano OR u:Tienda OR u:Cliente) 
              AND (u.username = $identifier OR u.email = $identifier)
            RETURN labels(u)[0] AS type, u.password AS password, 
                   COALESCE(u.RUC_Fabricante, u.id_tienda, u.DNI_O_RUC_Comprador) AS dni_o_ruc
        `, { identifier });

        if (result.records.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas (usuario no encontrado).' });
        }

        const record = result.records[0];
        const dbPassword = record.get('password');
        const dni_o_ruc = record.get('dni_o_ruc');
        const type = record.get('type');

        if (dbPassword !== password) {
            return res.status(401).json({ error: 'Contraseña incorrecta.' });
        }

        const token = jwt.sign(
            { DNI_O_RUC: dni_o_ruc, type },
            jwtSecret,
            { expiresIn: '2h' }
        );

        return res.status(200).json({
            accessToken: token,
            tokenType: 'Bearer',
            expiresIn: '2h',
            type,
            dni_o_ruc
        });

    } catch (error) {
        console.error('[API Auth] Error en mock-login:', error);
        return res.status(500).json({ error: 'Error interno en la autenticación.' });
    } finally {
        await session.close();
    }
});

// ==========================================
// E2) ENDPOINT AUXILIAR DE SEMBRADO (POST /api/debug/seed)
// ==========================================
/**
 * @swagger
 * /api/debug/seed:
 *   post:
 *     summary: Inicialización y Sembrado del Grafo (Debug/Test)
 *     description: Purga el grafo completo de Neo4j, crea las restricciones de unicidad de forma transaccional y siembra los datos iniciales de prueba (Lotes de cuero en genealogía de 3 niveles, Tienda de base, Artesano de base y Productos con credenciales y relaciones correctas).
 *     tags:
 *       - Autenticación y Debug
 *     responses:
 *       200:
 *         description: Base de datos de Neo4j purgada y sembrada con éxito.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 nodos:
 *                   type: string
 *                 relaciones:
 *                   type: string
 *       500:
 *         description: Error interno al purgar o sembrar el grafo en Neo4j.
 */
app.post('/api/debug/seed', async (req, res) => {
    const session = driver.session();
    try {
        await session.executeWrite(async (tx) => {
            await tx.run('MATCH (n) DETACH DELETE n');
        });

        // Asegurar la existencia de restricciones de unicidad antes del sembrado
        await session.executeWrite(async (tx) => {
            await tx.run('CREATE CONSTRAINT artesano_ruc IF NOT EXISTS FOR (a:Artesano) REQUIRE a.RUC_Fabricante IS UNIQUE');
            await tx.run('CREATE CONSTRAINT lotecuero_id IF NOT EXISTS FOR (l:LoteCuero) REQUIRE l.ID_Lote_Cuero_Utilizado IS UNIQUE');
            await tx.run('CREATE CONSTRAINT producto_sku IF NOT EXISTS FOR (p:Producto) REQUIRE p.SKU_Producto_Final IS UNIQUE');
            await tx.run('CREATE CONSTRAINT cliente_dni IF NOT EXISTS FOR (c:Cliente) REQUIRE c.DNI_O_RUC_Comprador IS UNIQUE');
        });

        const encryptedPKeyArtesano = cifrarClavePrivada('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'); // Cuenta #1
        const encryptedPKeyTienda = cifrarClavePrivada('0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca87a5c15bfa4ee227a4e4d'); // Cuenta #2

        const query = `
            CREATE (lotePadre:LoteCuero {
                ID_Lote_Cuero_Utilizado: "LOTE-PADRE-001",
                ruc_curtiembre: "20777888999",
                PDF_Certificado_Previo: "QmXoypizjW3WknFixtdKL9B2D7QsNTkwVKzEA48g8Ss65D"
            })
            CREATE (loteHijo:LoteCuero {
                ID_Lote_Cuero_Utilizado: "LOTE-HIJO-002",
                ruc_curtiembre: "20777888999",
                PDF_Certificado_Previo: "QmXoypizjW3WknFixtdKL9B2D7QsNTkwVKzEA48g8Ss65D"
            })
            CREATE (loteNieto:LoteCuero {
                ID_Lote_Cuero_Utilizado: "LOTE-NIETO-003",
                ruc_curtiembre: "20777888999",
                PDF_Certificado_Previo: "QmYwAPJ88CZ21GCg69B3Y9ff62XSp23tKCTsF4C4rJ8B1D"
            })
            
            CREATE (loteHijo)-[:SUBDIVIDIDO_DE]->(lotePadre)
            CREATE (loteNieto)-[:SUBDIVIDIDO_DE]->(loteHijo)

            CREATE (tienda:Tienda {
                id_tienda: "20600123456",
                nombre_tienda: "Tienda Cusco - Kipulux",
                username: "tienda_cusco",
                password: "Tienda123!",
                email: "tienda.cusco@kipulux.com",
                eth_address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
                encrypted_private_key: $encryptedPKeyTienda
            })

            CREATE (artesano:Artesano {
                RUC_Fabricante: "20555444333",
                nombre_taller: "Taller Alda Sur - Cusco",
                username: "artesano_cusco",
                password: "Artesano123!",
                email: "taller.aldasur@gmail.com",
                ubigeo: "080101",
                eth_address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
                encrypted_private_key: $encryptedPKeyArtesano
            })

            CREATE (cliente:Cliente {
                DNI_O_RUC_Comprador: "00792282",
                nombre_completo: "Juan Pérez",
                username: "cliente_juan",
                password: "Cliente123!",
                email: "juan.perez@gmail.com",
                wallet_address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906"
            })

            CREATE (p1:Producto {
                SKU_Producto_Final: "KIPU-CUERO-001",
                status: "EN_TIENDA",
                nft_token_id: "1",
                Foto_Producto: "https://alda.com.pe/billetera-001.png"
            })
            CREATE (p2:Producto {
                SKU_Producto_Final: "KIPU-CUERO-002",
                status: "ORIGINADO",
                nft_token_id: "2",
                Foto_Producto: "https://alda.com.pe/cartera-002.png"
            })
            CREATE (p3:Producto {
                SKU_Producto_Final: "KIPU-CUERO-003",
                status: "EN_TIENDA",
                nft_token_id: "3",
                Foto_Producto: "https://alda.com.pe/bolso-003.png"
            })

            CREATE (p1)-[:PROVIENE_DE]->(loteNieto)
            CREATE (p1)-[:HEREDA_DE]->(loteNieto)
            CREATE (p1)-[:CONFECCIONADO_POR]->(artesano)
            CREATE (artesano)-[:CONFECCIONÓ]->(p1)
            CREATE (p1)-[:ENTREGADO_A {fecha_transferencia: datetime()}]->(tienda)

            CREATE (p2)-[:PROVIENE_DE]->(loteNieto)
            CREATE (p2)-[:HEREDA_DE]->(loteNieto)
            CREATE (p2)-[:CONFECCIONADO_POR]->(artesano)
            CREATE (artesano)-[:CONFECCIONÓ]->(p2)

            CREATE (p3)-[:PROVIENE_DE]->(loteNieto)
            CREATE (p3)-[:HEREDA_DE]->(loteNieto)
            CREATE (p3)-[:CONFECCIONADO_POR]->(artesano)
            CREATE (artesano)-[:CONFECCIONÓ]->(p3)
            CREATE (p3)-[:ENTREGADO_A {fecha_transferencia: datetime()}]->(tienda)
        `;

        await session.executeWrite(async (tx) => {
            await tx.run(query, {
                encryptedPKeyArtesano,
                encryptedPKeyTienda
            });
        });

        const countNodesResult = await session.run('MATCH (n) RETURN count(n) AS nodeCount');
        const countRelsResult = await session.run('MATCH ()-[r]->() RETURN count(r) AS relCount');
        
        const nodeCount = countNodesResult.records[0].get('nodeCount').toString();
        const relCount = countRelsResult.records[0].get('relCount').toString();

        return res.status(200).json({
            message: 'Base de datos de Neo4j sembrada exitosamente.',
            nodos: nodeCount,
            relaciones: relCount
        });
    } catch (error) {
        console.error('[API Sembrado] Error sembrando base de datos:', error);
        return res.status(500).json({ error: 'Error al sembrar base de datos.', details: error.message });
    } finally {
        await session.close();
    }
});

/**
 * @swagger
 * /api/productos/crear:
 *   post:
 *     summary: Registro de Prenda y Mint de NFT (Manufactura)
 *     description: Permite al Artesano registrar la prenda. El backend inyecta su RUC desde el JWT, genera el metadata.json y realiza el mint del NFT on-chain en estado ORIGINADO, asignándolo a la wallet del artesano. Soporta carga de archivos reales (multipart/form-data) o JSON plano de respaldo.
 *     tags:
 *       - Flujo Artesano
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - SKU_Producto_Final
 *               - ID_Lote_Cuero_Utilizado
 *               - Foto_Producto
 *               - PDF_Certificado_Previo
 *             properties:
 *               SKU_Producto_Final:
 *                 type: string
 *                 example: "KIPU-CUERO-004"
 *               ID_Lote_Cuero_Utilizado:
 *                 type: string
 *                 example: "LOTE-NIETO-003"
 *               Foto_Producto:
 *                 type: string
 *                 format: binary
 *               PDF_Certificado_Previo:
 *                 type: string
 *                 format: binary
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - SKU_Producto_Final
 *               - ID_Lote_Cuero_Utilizado
 *               - Foto_Producto
 *               - PDF_Certificado_Previo
 *             properties:
 *               SKU_Producto_Final:
 *                 type: string
 *                 example: "KIPU-CUERO-004"
 *               ID_Lote_Cuero_Utilizado:
 *                 type: string
 *                 example: "LOTE-NIETO-003"
 *               Foto_Producto:
 *                 type: string
 *                 example: "https://alda.com.pe/billetera-001.png"
 *               PDF_Certificado_Previo:
 *                 type: string
 *                 example: "QmYwAPJ88CZ21GCg69B3Y9ff62XSp23tKCTsF4C4rJ8B1D"
 *     responses:
 *       200:
 *         description: Producto creado y NFT minteado exitosamente.
 *       400:
 *         description: Error de validación Zod o el producto ya existe.
 *       403:
 *         description: No autorizado (el emisor no es un artesano registrado).
 *       500:
 *         description: Error interno en el relayer o en Neo4j.
 */
app.post('/api/productos/crear', authenticateToken, upload.fields([
    { name: 'Foto_Producto', maxCount: 1 },
    { name: 'PDF_Certificado_Previo', maxCount: 1 }
]), validateBody(crearProductoSchema), async (req, res) => {
    const { SKU_Producto_Final, ID_Lote_Cuero_Utilizado } = req.body;
    
    // El RUC_Fabricante se obtiene del JWT inyectado en req.user
    const rucFabricante = req.user.DNI_O_RUC;

    let fotoUrl, pdfUrl, pdfCid;

    try {
        // Verificar si la petición contiene archivos (multipart/form-data desde el Frontend)
        if (req.files && req.files['Foto_Producto'] && req.files['Foto_Producto'].length > 0 &&
            req.files['PDF_Certificado_Previo'] && req.files['PDF_Certificado_Previo'].length > 0) {
            
            const fotoFile = req.files['Foto_Producto'][0];
            const pdfFile = req.files['PDF_Certificado_Previo'][0];

            // Generar nombres descriptivos usando el SKU y la extensión original
            const fotoExt = path.extname(fotoFile.originalname) || '.png';
            const pdfExt = path.extname(pdfFile.originalname) || '.pdf';
            
            const fotoName = `foto-${SKU_Producto_Final}${fotoExt}`;
            const pdfName = `certificado-${SKU_Producto_Final}${pdfExt}`;

            // 1. Guardar físicamente la foto en public/uploads/
            const fotoRes = await subirAIPFS(fotoFile.buffer, fotoName);
            fotoUrl = fotoRes.url; // e.g. /uploads/foto-SKU.png

            // 2. Guardar físicamente el PDF en public/uploads/
            const pdfRes = await subirAIPFS(pdfFile.buffer, pdfName);
            pdfUrl = pdfRes.url; // e.g. /uploads/certificado-SKU.pdf
            pdfCid = pdfRes.cid; // CID simulado
        } else {
            // Compatibilidad con JSON (para pruebas automatizadas E2E)
            const { Foto_Producto, PDF_Certificado_Previo } = req.body;
            if (!Foto_Producto || !PDF_Certificado_Previo) {
                return res.status(400).json({ error: 'Falta Foto_Producto o PDF_Certificado_Previo en el payload.' });
            }
            fotoUrl = Foto_Producto;
            pdfUrl = PDF_Certificado_Previo.startsWith('/') ? PDF_Certificado_Previo : `/uploads/certificado-${SKU_Producto_Final}.pdf`;
            pdfCid = PDF_Certificado_Previo;
        }

        // Construir el objeto de Metadatos IPFS
        const metadata = {
            name: `Pasaporte Digital ${SKU_Producto_Final}`,
            description: `Certificado de Origen inmutable para SKU ${SKU_Producto_Final}`,
            image: fotoUrl,
            attributes: [
                { trait_type: "SKU", value: SKU_Producto_Final },
                { trait_type: "Lote Cuero", value: ID_Lote_Cuero_Utilizado },
                { trait_type: "Certificado", value: pdfCid },
                { trait_type: "Certificado_URL", value: pdfUrl }
            ]
        };

        // Escribir físicamente metadata-[SKU].json en public/uploads/
        const metadataBuffer = Buffer.from(JSON.stringify(metadata, null, 2));
        const metadataName = `metadata-${SKU_Producto_Final}.json`;
        const metadataRes = await subirAIPFS(metadataBuffer, metadataName);
        const tokenUri = metadataRes.cid; // Usamos el CID de los metadatos como tokenURI

        const session = driver.session();
        try {
            // A) Verificar que el emisor sea un Artesano registrado y obtener su wallet
            const artesanoCheck = await session.run(
                'MATCH (a:Artesano {RUC_Fabricante: $rucFabricante}) RETURN a.eth_address AS address',
                { rucFabricante: rucFabricante }
            );
            if (artesanoCheck.records.length === 0) {
                return res.status(403).json({ error: 'Acceso denegado. Solo artesanos autorizados pueden fabricar productos.' });
            }
            const artesanoAddress = artesanoCheck.records[0].get('address');
            if (!artesanoAddress) {
                return res.status(400).json({ error: 'El artesano no posee una wallet configurada.' });
            }

            // B) Verificar si ya existe el producto
            const checkResult = await session.run(
                'MATCH (p:Producto {SKU_Producto_Final: $sku}) RETURN p',
                { sku: SKU_Producto_Final }
            );
            if (checkResult.records.length > 0) {
                return res.status(400).json({ error: 'El producto con el SKU especificado ya existe.' });
            }

            // C) Verificar si existe el Lote de Cuero
            const loteCheck = await session.run(
                'MATCH (l:LoteCuero {ID_Lote_Cuero_Utilizado: $loteId}) RETURN l',
                { loteId: ID_Lote_Cuero_Utilizado }
            );
            if (loteCheck.records.length === 0) {
                return res.status(400).json({ error: 'El lote de cuero especificado no existe.' });
            }

            // D) Acuñar NFT en la blockchain asignándoselo a la wallet del artesano
            console.log(`[API Crear] Acuñando NFT de origen para SKU: ${SKU_Producto_Final} en wallet artesano: ${artesanoAddress}...`);
            const { tokenId, txHash } = await ejecutarMintOnChain(artesanoAddress, tokenUri);
            console.log(`[API Crear] NFT Minteado para Artesano. TokenId: ${tokenId}, TxHash: ${txHash}. Guardando en Neo4j...`);

            // E) Persistir en Neo4j y establecer relaciones con el lote y el artesano
            await session.run(`
                MATCH (art:Artesano {RUC_Fabricante: $rucFabricante})
                MATCH (lote:LoteCuero {ID_Lote_Cuero_Utilizado: $loteId})
                CREATE (p:Producto {
                    SKU_Producto_Final: $sku,
                    status: 'ORIGINADO',
                    nft_token_id: $tokenId,
                    tx_hash_mint: $txHash,
                    Foto_Producto: $foto_url,
                    PDF_Certificado_Previo: $pdf_url,
                    fecha_creacion: datetime()
                })
                CREATE (p)-[:PROVIENE_DE]->(lote)
                CREATE (p)-[:HEREDA_DE]->(lote)
                CREATE (p)-[:CONFECCIONADO_POR]->(art)
                CREATE (art)-[:CONFECCIONÓ]->(p)
            `, {
                sku: SKU_Producto_Final,
                loteId: ID_Lote_Cuero_Utilizado,
                rucFabricante: rucFabricante,
                tokenId: tokenId,
                txHash: txHash,
                foto_url: fotoUrl,
                pdf_url: pdfUrl
            });

            return res.status(200).json({
                message: 'Producto registrado y certificado con éxito.',
                SKU_Producto_Final,
                tokenId,
                txHash
            });

        } catch (error) {
            console.error('[API Crear] Error al registrar prenda en base de datos o blockchain:', error);
            return res.status(500).json({ error: 'Error al procesar el registro del producto.', details: error.message });
        } finally {
            await session.close();
        }

    } catch (error) {
        console.error('[API Crear] Error al procesar subida de archivos o metadatos:', error);
        return res.status(500).json({ error: 'Error al procesar archivos de manufactura.', details: error.message });
    }
});

/**
 * @swagger
 * /api/productos/transferir-a-tienda:
 *   post:
 *     summary: Despacho / Transferencia B2B (Artesano a Tienda)
 *     description: Permite al Artesano transferir la custodia física y criptográfica de una prenda a una Tienda autorizada. El relayer transfiere el NFT on-chain.
 *     tags:
 *       - Flujo Artesano
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - SKU_Producto_Final
 *               - RUC_Tienda_Destino
 *             properties:
 *               SKU_Producto_Final:
 *                 type: string
 *                 example: "KIPU-CUERO-004"
 *               RUC_Tienda_Destino:
 *                 type: string
 *                 example: "20600123456"
 *     responses:
 *       200:
 *         description: Custodia transferida exitosamente en blockchain y Neo4j.
 *       400:
 *         description: Parámetros inválidos, el producto no existe o ya está vendido/custodiado.
 *       403:
 *         description: No autorizado o el producto no pertenece al artesano.
 *       500:
 *         description: Error interno del servidor.
 */
app.post('/api/productos/transferir-a-tienda', authenticateToken, validateBody(transferenciaTiendaSchema), async (req, res) => {
    const { SKU_Producto_Final, RUC_Tienda_Destino } = req.body;
    const rucArtesano = req.user.DNI_O_RUC;

    const session = driver.session();
    try {
        // 1. Validar que el emisor sea un Artesano
        const artesanoCheck = await session.run(
            'MATCH (a:Artesano {RUC_Fabricante: $rucArtesano}) RETURN a',
            { rucArtesano }
        );
        if (artesanoCheck.records.length === 0) {
            return res.status(403).json({ error: 'Acceso denegado. Solo artesanos autorizados pueden transferir productos.' });
        }

        // 2. Validar que la Tienda destino exista y obtener su wallet
        const tiendaCheck = await session.run(
            'MATCH (t:Tienda {id_tienda: $rucTienda}) RETURN t.eth_address AS address',
            { rucTienda: RUC_Tienda_Destino }
        );
        if (tiendaCheck.records.length === 0) {
            return res.status(400).json({ error: 'La tienda destino especificada no existe.' });
        }
        const tiendaAddress = tiendaCheck.records[0].get('address');
        if (!tiendaAddress) {
            return res.status(400).json({ error: 'La tienda destino no posee una wallet configurada.' });
        }

        // 3. Validar que el producto exista y le pertenezca al artesano (y esté en estado ORIGINADO)
        const productCheck = await session.run(
            `MATCH (a:Artesano {RUC_Fabricante: $rucArtesano})-[:CONFECCIONÓ]->(p:Producto {SKU_Producto_Final: $sku}) 
             RETURN p.nft_token_id AS tokenId, p.status AS status`,
            { rucArtesano, sku: SKU_Producto_Final }
        );
        if (productCheck.records.length === 0) {
            return res.status(403).json({ error: 'El producto no pertenece al artesano autenticado o no existe.' });
        }

        const record = productCheck.records[0];
        const status = record.get('status');
        const tokenId = record.get('tokenId');

        if (status !== 'ORIGINADO') {
            return res.status(400).json({ error: `El producto se encuentra en estado ${status} y no puede ser transferido.` });
        }

        if (!tokenId) {
            return res.status(400).json({ error: 'El producto no posee un NFT Token ID registrado.' });
        }

        // 4. Transferir custodia on-chain
        console.log(`[API Transfer] Transfiriendo custodia B2B on-chain para SKU: ${SKU_Producto_Final}, TokenID: ${tokenId}...`);
        const { txHash } = await ejecutarTransferenciaOnChain(tokenId, tiendaAddress);

        // 5. Actualizar Neo4j
        await session.run(`
            MATCH (art:Artesano {RUC_Fabricante: $rucArtesano})-[:CONFECCIONÓ]->(p:Producto {SKU_Producto_Final: $sku})
            MATCH (t:Tienda {id_tienda: $rucTienda})
            SET p.status = 'EN_TIENDA'
            MERGE (p)-[r:ENTREGADO_A]->(t)
            SET r.fecha_transferencia = datetime(),
                r.tx_hash_transferencia = $txHash
        `, {
            rucArtesano,
            sku: SKU_Producto_Final,
            rucTienda: RUC_Tienda_Destino,
            txHash
        });

        console.log(`[API Transfer] Custodia B2B registrada exitosamente en Neo4j.`);
        return res.status(200).json({
            message: 'Custodia del producto transferida exitosamente a la tienda.',
            SKU_Producto_Final,
            tokenId,
            txHash
        });

    } catch (error) {
        console.error('[API Transfer] Error en transferencia B2B:', error);
        return res.status(500).json({ error: 'Error interno en la transferencia B2B.', details: error.message });
    } finally {
        await session.close();
    }
});

/**
 * @swagger
 * /api/productos/artesano/{ruc}:
 *   get:
 *     summary: Listado de Prendas por Artesano (Currículum Digital)
 *     description: Obtiene las prendas confeccionadas por un artesano a partir de su RUC.
 *     tags:
 *       - Flujo Artesano
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: ruc
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         example: "20555444333"
 *     responses:
 *       200:
 *         description: Lista de productos asociados al artesano.
 *       500:
 *         description: Error al consultar en Neo4j.
 */
app.get('/api/productos/artesano/:ruc', authenticateToken, async (req, res) => {
    const { ruc } = req.params;
    const session = driver.session();
    try {
        const result = await session.run(`
            MATCH (art:Artesano {RUC_Fabricante: $ruc})-[:CONFECCIONÓ]->(p:Producto)
            RETURN 
                p.SKU_Producto_Final AS SKU_Producto_Final,
                p.status AS status,
                p.nft_token_id AS nft_token_id,
                p.fecha_creacion AS fecha_creacion
            ORDER BY p.fecha_creacion DESC
        `, { ruc });

        const products = result.records.map(record => {
            const dateObj = record.get('fecha_creacion');
            return {
                SKU_Producto_Final: record.get('SKU_Producto_Final'),
                status: record.get('status'),
                nft_token_id: record.get('nft_token_id'),
                fecha_creacion: dateObj ? dateObj.toString() : new Date().toISOString()
            };
        });

        return res.status(200).json(products);
    } catch (error) {
        console.error('[API Artesano Productos] Error:', error);
        return res.status(500).json({ error: 'Error interno al listar prendas.' });
    } finally {
        await session.close();
    }
});

// ==========================================
// E4) ENDPOINTS DE ONBOARDING Y HISTORIAL (MÓDULOS 1 Y 2)
// ==========================================

/**
 * @swagger
 * /api/clientes/registrar:
 *   post:
 *     summary: Registro de Cliente Final (Mapeo confidencial)
 *     description: Registra un cliente de manera aislada en Neo4j vinculando su DNI al nombre real, wallet y credenciales de usuario.
 *     tags:
 *       - Flujo Cliente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - DNI_O_RUC_Comprador
 *               - nombre_completo
 *               - wallet_address
 *               - username
 *               - email
 *               - password
 *             properties:
 *               DNI_O_RUC_Comprador:
 *                 type: string
 *                 example: "00792282"
 *               nombre_completo:
 *                 type: string
 *                 example: "Juan Pérez"
 *               wallet_address:
 *                 type: string
 *                 example: "0x90F79bf6EB2c4f870365E785982E1f101E93b906"
 *               username:
 *                 type: string
 *                 example: "cliente_juan"
 *               email:
 *                 type: string
 *                 example: "juan.perez@gmail.com"
 *               password:
 *                 type: string
 *                 example: "Cliente123!"
 *     responses:
 *       201:
 *         description: Cliente creado exitosamente.
 *       400:
 *         description: Error de validación Zod.
 *       500:
 *         description: Error interno del servidor.
 */
app.post('/api/clientes/registrar', validateBody(registrarClienteSchema), async (req, res) => {
    const { DNI_O_RUC_Comprador, nombre_completo, wallet_address, username, email, password } = req.body;
    const session = driver.session();
    try {
        await session.run(`
            MERGE (c:Cliente {DNI_O_RUC_Comprador: $dni})
            ON CREATE SET c.nombre_completo = $nombre,
                          c.wallet_address = $wallet,
                          c.username = $username,
                          c.email = $email,
                          c.password = $password
            ON MATCH SET c.nombre_completo = $nombre,
                         c.wallet_address = $wallet,
                         c.username = $username,
                         c.email = $email,
                         c.password = $password
        `, {
            dni: DNI_O_RUC_Comprador,
            nombre: nombre_completo,
            wallet: wallet_address,
            username,
            email,
            password
        });
        return res.status(201).json({
            message: 'Cliente registrado exitosamente en la base de datos de grafos.',
            DNI_O_RUC_Comprador,
            nombre_completo,
            wallet_address,
            username,
            email
        });
    } catch (error) {
        console.error('[API Cliente Registro] Error:', error);
        return res.status(500).json({ error: 'Error interno al registrar cliente.', details: error.message });
    } finally {
        await session.close();
    }
});

/**
 * @swagger
 * /api/tiendas/registrar-artesano:
 *   post:
 *     summary: Onboarding de Artesano por la Tienda
 *     description: Permite a una Tienda registrar a un Artesano. Genera de forma segura la cuenta y una billetera EVM con clave privada cifrada.
 *     tags:
 *       - Flujo Tienda
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - RUC_Fabricante
 *               - nombre_taller
 *               - email
 *               - ubigeo
 *             properties:
 *               RUC_Fabricante:
 *                 type: string
 *                 example: "20999888777"
 *               nombre_taller:
 *                 type: string
 *                 example: "Taller Premium Cusco"
 *               email:
 *                 type: string
 *                 example: "taller.premium@gmail.com"
 *               ubigeo:
 *                 type: string
 *                 example: "080101"
 *     responses:
 *       201:
 *         description: Artesano registrado con éxito. Devuelve las credenciales de ingreso generadas.
 *       403:
 *         description: Acceso denegado (el actor no es una Tienda autorizada).
 *       500:
 *         description: Error interno del servidor.
 */
app.post('/api/tiendas/registrar-artesano', authenticateToken, validateBody(registrarArtesanoSchema), async (req, res) => {
    const { RUC_Fabricante, nombre_taller, email, ubigeo } = req.body;
    const tiendaRuc = req.user.DNI_O_RUC;

    // Verificar que el actor sea una Tienda (RUC de 11 dígitos)
    if (!tiendaRuc || tiendaRuc.length !== 11) {
        return res.status(403).json({ error: 'Acceso denegado. Solo las tiendas autorizadas con RUC pueden registrar artesanos.' });
    }

    const { generatePrivateKey, privateKeyToAccount } = require('viem/accounts');
    const session = driver.session();

    try {
        // Generar credenciales y cuenta criptográfica
        const privateKey = generatePrivateKey();
        const walletAccount = privateKeyToAccount(privateKey);
        const address = walletAccount.address;

        const username = `artesano_${RUC_Fabricante.substring(7, 11)}_${Math.random().toString(36).substring(2, 6)}`;
        const password = Math.random().toString(36).substring(2, 10);
        
        // Cifrar llave privada para resguardo seguro (KMS)
        const encryptedPrivateKey = cifrarClavePrivada(privateKey);

        // Guardar en Neo4j
        await session.run(`
            MERGE (t:Tienda {id_tienda: $tiendaRuc})
            ON CREATE SET t.nombre_tienda = "Tienda RUC " + $tiendaRuc
            MERGE (a:Artesano {RUC_Fabricante: $RUC_Fabricante})
            ON CREATE SET a.nombre_taller = $nombre_taller,
                          a.email = $email,
                          a.ubigeo = $ubigeo,
                          a.eth_address = $address,
                          a.username = $username,
                          a.password = $password,
                          a.encrypted_private_key = $encryptedPrivateKey
            MERGE (t)-[r:PROVEEDOR_ASOCIADO]->(a)
            ON CREATE SET r.fecha_registro = datetime()
        `, {
            tiendaRuc,
            RUC_Fabricante,
            nombre_taller,
            email,
            ubigeo,
            address,
            username,
            password,
            encryptedPrivateKey
        });

        // Email simulation log (Hiding Raw Private Key for security)
        console.log(`[EMAIL SIMULATION] Enviando credenciales de onboarding al correo: ${email} -> Usuario: ${username} | Contraseña: ${password} | Clave Privada EVM: [ENCRYPTED/KMS_SECURED]`);

        return res.status(201).json({
            message: 'Artesano registrado y credenciales generadas exitosamente.',
            RUC_Fabricante,
            username,
            password,
            address,
            credentials: {
                username,
                password,
                eth_address: address,
                address
            }
        });

    } catch (error) {
        console.error('[API Onboarding] Error registrando artesano:', error);
        return res.status(500).json({ error: 'Error interno al registrar artesano.', details: error.message });
    } finally {
        await session.close();
    }
});

/**
 * @swagger
 * /api/clientes/historial-compras:
 *   get:
 *     summary: Historial de Compras del Cliente Final
 *     description: Obtiene la lista completa de todas las compras asociadas al DNI del cliente autenticado, agrupándolas por la Tienda origen.
 *     tags:
 *       - Flujo Cliente
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Historial de compras agrupado por tienda origen.
 *       500:
 *         description: Error de consulta.
 */
app.get('/api/clientes/historial-compras', authenticateToken, async (req, res) => {
    const dniComprador = req.user.DNI_O_RUC;

    const session = driver.session();
    try {
        const query = `
            MATCH (c:Cliente {DNI_O_RUC_Comprador: $dni})<-[:PROPIEDAD_DE]-(p:Producto)<-[:VENDIÓ]-(t:Tienda)
            RETURN t.id_tienda AS id_tienda,
                   t.nombre_tienda AS nombre_tienda,
                   collect({
                       SKU_Producto_Final: p.SKU_Producto_Final,
                       status: p.status,
                       Foto_Producto: p.Foto_Producto,
                       PDF_Certificado_Previo: p.PDF_Certificado_Previo
                   }) AS productos
        `;

        const result = await session.run(query, { dni: dniComprador });

        const history = result.records.map(record => ({
            id_tienda: record.get('id_tienda'),
            nombre_tienda: record.get('nombre_tienda'),
            productos: record.get('productos')
        }));

        return res.status(200).json(history);
    } catch (error) {
        console.error('[API Historial] Error al consultar compras:', error);
        return res.status(500).json({ error: 'Error interno al consultar historial de compras.' });
    } finally {
        await session.close();
    }
});

// ==========================================
// F) INICIALIZACIÓN DEL LISTENER DE EXPRESS
// ==========================================
const PORT = process.env.PORT || 3000;
const serverInstance = app.listen(PORT, () => {
    console.log(`[Server] Backend Corporativo Kipulux corriendo en http://localhost:${PORT}`);
});

// Manejo elegante del cierre de conexiones
process.on('SIGINT', async () => {
    console.log('[Server] Cerrando servidor Express y driver de Neo4j...');
    await driver.close();
    serverInstance.close(() => {
        console.log('[Server] Backend finalizado con éxito.');
        process.exit(0);
    });
});
