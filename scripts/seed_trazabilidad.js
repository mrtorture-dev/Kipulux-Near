const neo4j = require('neo4j-driver');
const crypto = require('crypto');
require('dotenv').config();

// ==========================================
// 1. CONFIGURACIÓN DE CONEXIÓN A NEO4J
// ==========================================
const uri = process.env.NEO4J_URI || 'neo4j://127.0.0.1:7687';
const user = process.env.NEO4J_USER || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'Tu_Contraseña_De_Neo4j_Desktop_Aquí';
const jwtSecret = process.env.JWT_SECRET || 'Kipulux_Clave_Secreta_Segura_2026';

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

            // B. Crear Tienda Cusco
            CREATE (tienda:Tienda {
                id_tienda: "20600123456",
                nombre_tienda: "Tienda Cusco - Kipulux",
                username: "tienda_cusco",
                password: "Tienda123!",
                email: "tienda.cusco@kipulux.com",
                eth_address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
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

            // E. Crear Productos Únicos Serializados Físicos
            // Producto 1 (Para flujo de Venta): En almacén de tienda
            CREATE (p1:Producto {
                SKU_Producto_Final: "KIPU-CUERO-001",
                status: "EN_TIENDA",
                nft_token_id: "1",
                Foto_Producto: "https://alda.com.pe/billetera-001.png"
            })

            // Producto 2 (Para flujo de Custodia): Recién terminado en taller
            CREATE (p2:Producto {
                SKU_Producto_Final: "KIPU-CUERO-002",
                status: "ORIGINADO",
                nft_token_id: "2",
                Foto_Producto: "https://alda.com.pe/cartera-002.png"
            })

            // Producto 3 (Para pruebas generales): En almacén de tienda
            CREATE (p3:Producto {
                SKU_Producto_Final: "KIPU-CUERO-003",
                status: "EN_TIENDA",
                nft_token_id: "3",
                Foto_Producto: "https://alda.com.pe/bolso-003.png"
            })

            // Producto 4 (Para el cliente 00792282): Billetera BC007NN
            CREATE (p4:Producto {
                SKU_Producto_Final: "BC007NN",
                status: "VENDIDO",
                nft_token_id: "4",
                tx_hash_mint: "0x4d4f9a1e1f5077bc4ae1241026918ace6dd2934df53b4e5e8c270ac241f8e9bc",
                Foto_Producto: "https://alda.com.pe/wp-content/uploads/2025/07/Billetera-caballero_Mesa-de-trabajo-1-copia-18.png"
            })

            // F. Establecer Relaciones Duales por Compatibilidad con la API
            // Producto 1
            CREATE (p1)-[:PROVIENE_DE]->(loteNieto)
            CREATE (p1)-[:HEREDA_DE]->(loteNieto)
            CREATE (p1)-[:CONFECCIONADO_POR]->(artesano)
            CREATE (artesano)-[:CONFECCIONÓ]->(p1)
            CREATE (p1)-[:ENTREGADO_A {fecha_transferencia: datetime()}]->(tienda)

            // Producto 2
            CREATE (p2)-[:PROVIENE_DE]->(loteNieto)
            CREATE (p2)-[:HEREDA_DE]->(loteNieto)
            CREATE (p2)-[:CONFECCIONADO_POR]->(artesano)
            CREATE (artesano)-[:CONFECCIONÓ]->(p2)

            // Producto 3
            CREATE (p3)-[:PROVIENE_DE]->(loteNieto)
            CREATE (p3)-[:HEREDA_DE]->(loteNieto)
            CREATE (p3)-[:CONFECCIONADO_POR]->(artesano)
            CREATE (artesano)-[:CONFECCIONÓ]->(p3)
            CREATE (p3)-[:ENTREGADO_A {fecha_transferencia: datetime()}]->(tienda)

            // Producto 4 (BC007NN vendido a cliente Juan Pérez)
            CREATE (p4)-[:PROVIENE_DE]->(loteNieto)
            CREATE (p4)-[:HEREDA_DE]->(loteNieto)
            CREATE (p4)-[:CONFECCIONADO_POR]->(artesano)
            CREATE (artesano)-[:CONFECCIONÓ]->(p4)
            CREATE (p4)-[:ENTREGADO_A {fecha_transferencia: datetime()}]->(tienda)
            CREATE (tienda)-[:VENDIÓ {
                fecha: datetime(),
                Nro_Comprobante_Pago: "B001-00029384",
                Hash_Comprobante_Pago: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                tx_hash_venta: "0x5861318621cad4da92880108eaa129d93fe16e97203c9b91abac356478420fec"
            }]->(p4)
            CREATE (p4)-[:PROPIEDAD_DE {
                fecha: datetime(),
                Nro_Comprobante_Pago: "B001-00029384",
                Hash_Comprobante_Pago: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                tx_hash_venta: "0x5861318621cad4da92880108eaa129d93fe16e97203c9b91abac356478420fec"
            }]->(cliente)
            CREATE (p4)-[:VENDIDO_A {
                fecha: datetime(),
                Nro_Comprobante_Pago: "B001-00029384",
                Hash_Comprobante_Pago: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                tx_hash_venta: "0x5861318621cad4da92880108eaa129d93fe16e97203c9b91abac356478420fec"
            }]->(cliente)
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
