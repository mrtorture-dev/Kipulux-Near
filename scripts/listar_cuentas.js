require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const neo4j = require('neo4j-driver');

async function main() {
  const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
  const user = process.env.NEO4J_USER || 'neo4j';
  const password = process.env.NEO4J_PASSWORD || 'your_neo4j_password_here';

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session();
  try {
    console.log('=== CONTEO POR ETIQUETAS ===');
    const counts = await session.run(`
      MATCH (n)
      RETURN labels(n) AS labels, count(n) AS total
      ORDER BY total DESC
    `);
    console.table(counts.records.map(r => ({ labels: r.get('labels').join(', '), total: r.get('total').toNumber ? r.get('total').toNumber() : r.get('total') })));

    console.log('\n=== USUARIOS / CUENTAS REGISTRADAS ===');
    const res = await session.run(`
      MATCH (u)
      WHERE u:Cliente OR u:Artesano OR u:Tienda OR u:Usuario
      RETURN 
        labels(u)[0] AS rol,
        coalesce(u.username, 's/n') AS username,
        coalesce(u.email, 's/n') AS email,
        coalesce(u.nombre_completo, u.nombre_taller, u.nombre_tienda, u.nombre, 's/n') AS nombre,
        coalesce(u.DNI_O_RUC_Comprador, u.RUC_Fabricante, u.id_tienda, u.near_account_id, 's/n') AS identificador,
        coalesce(u.wallet_address, u.near_account_id, 's/n') AS wallet
      LIMIT 100
    `);
    console.table(res.records.map(r => r.toObject()));
  } catch (err) {
    console.error('Error al consultar Neo4j:', err.message);
  } finally {
    await session.close();
    await driver.close();
  }
}

main();
