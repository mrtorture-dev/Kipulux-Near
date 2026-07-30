const neo4j = require('neo4j-driver');
const crypto = require('crypto');
require('dotenv').config();

// ==========================================
// 1. CONFIGURACIÓN DE CONEXIÓN A NEO4J
// ==========================================
const uri = process.env.NEO4J_URI || 'neo4j://127.0.0.1:7687';
const user = process.env.NEO4J_USER || 'neo4j';
const password = process.env.NEO4J_PASSWORD || '';
const jwtSecret = process.env.JWT_SECRET || '';

// KMS Simulado para cifrar claves privadas de prueba
const encryptionAlgorithm = 'aes-256-cbc';
const kmsKey = crypto.scryptSync(jwtSecret, 'salt_kms_2026', 32);

function cifrarClavePrivada(privateKeyString) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(encryptionAlgorithm, kmsKey, iv);
    let encrypted = cipher.update(privateKeyString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
}

console.log(`[Sembrado] Inicializando conexión a Neo4j en: ${uri}`);
const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

async function ejecutarSembrado() {
    const session = driver.session();
    
    try {
        // Verificar conectividad con Neo4j
        await driver.verifyConnectivity();
        console.log('[Neo4j] Conexión establecida con éxito.');

        // ==========================================
        // 2. PURGA TOTAL INICIAL (MATCH (n) DETACH DELETE n)
        // ==========================================
        console.log('[Neo4j] Purgando base de datos completa...');
        await session.executeWrite(async (tx) => {
            await tx.run('MATCH (n) DETACH DELETE n');
        });
        console.log('[Neo4j] Base de datos vaciada (0 nodos, 0 relaciones).');

        // ==========================================
        // 2B. AUTOMATIZACIÓN DE CONSTRAINTS
        // ==========================================
        console.log('[Neo4j] Creando restricciones de unicidad...');
        await session.executeWrite(async (tx) => {
            await tx.run('CREATE CONSTRAINT artesano_ruc IF NOT EXISTS FOR (a:Artesano) REQUIRE a.RUC_Fabricante IS UNIQUE');
            await tx.run('CREATE CONSTRAINT lotecuero_id IF NOT EXISTS FOR (l:LoteCuero) REQUIRE l.ID_Lote_Cuero_Utilizado IS UNIQUE');
            await tx.run('CREATE CONSTRAINT producto_sku IF NOT EXISTS FOR (p:Producto) REQUIRE p.SKU_Producto_Final IS UNIQUE');
            await tx.run('CREATE CONSTRAINT cliente_dni IF NOT EXISTS FOR (c:Cliente) REQUIRE c.DNI_O_RUC_Comprador IS UNIQUE');
        });
        console.log('[Neo4j] Restricciones creadas con éxito.');

        // ==========================================
        // 3. CONSULTA DE INYECCIÓN DE DATOS SERIALIZADOS
        // ==========================================
        // Cifrado de claves privadas de prueba
        const encryptedPKeyArtesano = cifrarClavePrivada('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'); // Cuenta #1
        const encryptedPKeyTienda = cifrarClavePrivada('0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca87a5c15bfa4ee227a4e4d'); // Cuenta #2

        console.log('[Sembrado] Inyectando datos serializados del MVP de Kipulux...');
        
        const query = `
            // A. Crear Cadena de Suministro de Cuero (3 Niveles)
            CREATE (lotePadre:LoteCuero {
                ID_Lote_Cuero_Utilizado: "LOTE-PADRE-001",
                ruc_curtiembre: "20777888999",
                PDF_Certificado_Previo: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
            })
            CREATE (loteHijo:LoteCuero {
                ID_Lote_Cuero_Utilizado: "LOTE-HIJO-002",
                ruc_curtiembre: "20777888999",
                PDF_Certificado_Previo: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
            })
            CREATE (loteNieto:LoteCuero {
                ID_Lote_Cuero_Utilizado: "LOTE-NIETO-003",
                ruc_curtiembre: "20777888999",
                PDF_Certificado_Previo: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
            })
            
            // Relaciones cronológicas de la genealogía del cuero
            CREATE (loteHijo)-[:SUBDIVIDIDO_DE]->(lotePadre)
            CREATE (loteNieto)-[:SUBDIVIDIDO_DE]->(loteHijo)
            
            // B. Crear Tienda Cusco y otras boutiques autorizadas
            CREATE (tienda:Tienda {
                id_tienda: "20600123456",
                nombre_tienda: "ALDA Boutique - Cusco",
                username: "tienda_cusco",
                password: "Tienda123!",
                email: "tienda.cusco@kipulux.com",
                eth_address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
                encrypted_private_key: $encryptedPKeyTienda
            })
            CREATE (tiendaMiraflores:Tienda {
                id_tienda: "20600999999",
                nombre_tienda: "ALDA Boutique - Miraflores",
                username: "tienda_miraflores",
                password: "Tienda123!",
                email: "tienda.miraflores@kipulux.com",
                eth_address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
                encrypted_private_key: $encryptedPKeyTienda
            })
            CREATE (tiendaSanIsidro:Tienda {
                id_tienda: "20600888888",
                nombre_tienda: "ALDA Boutique - San Isidro",
                username: "tienda_sanisidro",
                password: "Tienda123!",
                email: "tienda.sanisidro@kipulux.com",
                eth_address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
                encrypted_private_key: $encryptedPKeyTienda
            })
            CREATE (tiendaJockey:Tienda {
                id_tienda: "20600777777",
                nombre_tienda: "ALDA Boutique - Jockey Plaza",
                username: "tienda_jockey",
                password: "Tienda123!",
                email: "tienda.jockey@kipulux.com",
                eth_address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
                encrypted_private_key: $encryptedPKeyTienda
            })

            // C. Crear Artesano Formal
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

            // D. Crear Cliente Juan Pérez
            CREATE (cliente:Cliente {
                DNI_O_RUC_Comprador: "00792282",
                nombre_completo: "Juan Pérez",
                username: "cliente_juan",
                password: "Cliente123!",
                email: "juan.perez@gmail.com",
                wallet_address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906"
            })
        `;

        await session.executeWrite(async (tx) => {
            await tx.run(query, {
                encryptedPKeyArtesano,
                encryptedPKeyTienda
            });
        });
        console.log('[Sembrado] Datos sembrados con éxito.');

        // ==========================================
        // 5. AUDITORÍA Y CONTEO DE REGISTROS
        // ==========================================
        const countNodesResult = await session.run('MATCH (n) RETURN count(n) AS nodeCount');
        const countRelsResult = await session.run('MATCH ()-[r]->() RETURN count(r) AS relCount');
        
        const nodeCount = countNodesResult.records[0].get('nodeCount').toString();
        const relCount = countRelsResult.records[0].get('relCount').toString();

        console.log('\n======================================================');
        console.log(`[Éxito] Sembrado de Kipulux completado.`);
        console.log(`- Nodos creados en total: ${nodeCount}`);
        console.log(`  (Deberían ser 7: 3 Lotes de cuero, 1 Artesano, 3 Productos)`);
        console.log(`- Relaciones creadas en total: ${relCount}`);
        console.log(`  (Deberían ser 14: 2 de subdivisión de lote, 12 de trazabilidad dual)`);
        console.log('======================================================\n');

    } catch (error) {
        console.error('[Error] Fallo crítico durante el sembrado de datos:', error);
    } finally {
        // Cerrar sesión y driver de forma segura
        console.log('[Neo4j] Cerrando la sesión activa...');
        await session.close();
        console.log('[Neo4j] Cerrando driver...');
        await driver.close();
        console.log('[Sembrado] Conexiones finalizadas de forma segura.');
    }
}

// Ejecutar el sembrado
if (require.main === module) {
    ejecutarSembrado();
}

module.exports = { ejecutarSembrado };
