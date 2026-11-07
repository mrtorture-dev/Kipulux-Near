const neo4j = require('neo4j-driver');
require('dotenv').config();

const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
const user = process.env.NEO4J_USER || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'your_neo4j_password_here';

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

async function main() {
    const sku = process.argv[2] || 'ALD-BES-OBS-0001';
    const targetUser = process.argv[3] || 'demo_1';
    const targetDni = process.argv[4] || '11345678';

    console.log(`Asignando SKU: ${sku} -> Usuario: ${targetUser} (DNI: ${targetDni})...`);
    const session = driver.session();
    try {
        const query = `
            MERGE (c:Cliente {username: $targetUser})
            ON CREATE SET c.DNI_O_RUC_Comprador = $targetDni,
                          c.nombre_completo = 'Coleccionista Demo 1',
                          c.email = 'demo_1@kipulux.pe',
                          c.near_account_id = 'cliente-' + $targetDni + '.kipulux.testnet'
            ON MATCH SET c.DNI_O_RUC_Comprador = $targetDni,
                         c.near_account_id = 'cliente-' + $targetDni + '.kipulux.testnet'
            
            WITH c
            MATCH (p:Producto {SKU_Producto_Final: $sku})
            OPTIONAL MATCH (p)-[r:ENTREGADO_A]->(:Tienda)
            DELETE r
            
            SET p.status = 'VENDIDO',
                p.near_owner = 'cliente-' + $targetDni + '.kipulux.testnet'
            
            MERGE (p)-[:PROPIEDAD_DE {
                fecha: datetime(),
                tx_hash_venta: 'manual_assign_demo1'
            }]->(c)
            
            RETURN p.SKU_Producto_Final AS sku, p.status AS status, c.username AS usuario, c.DNI_O_RUC_Comprador AS dni
        `;
        const res = await session.run(query, { sku, targetUser, targetDni });
        if (res.records.length === 0) {
            console.log(`⚠️ Advertencia: No se encontró el producto con SKU ${sku} en Neo4j.`);
        } else {
            console.log('✅ Asignación exitosa:', res.records[0].toObject());
        }
    } catch(err) {
        console.error('❌ Error:', err.message);
    } finally {
        await session.close();
        await driver.close();
    }
}

main();
