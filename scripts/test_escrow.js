const path = require('path');
const nearService = require(path.join(__dirname, '../services/nearService'));

async function testEscrow() {
    console.log('--- Probando Escrow con Regalía ---');
    const res = await nearService.ejecutarReventaEscrow('KIPU-CUERO-999', 'cliente-vendedor.testnet', 'cliente-comprador.testnet', '10.0', 10);
    console.log('Escrow result:', res);
}
testEscrow();
