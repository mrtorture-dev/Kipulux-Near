/**
 * scripts/demo/run-demo-near.js
 * Script de Demostración E2E en 1 Comando para NEAR HACKATHON 2026
 * Responsable: Fredy (Backend & Systems Integration Lead)
 *
 * Flujo Completo:
 * 1. Manufactura & Minteo Autorizado en NEAR Protocol (Artesano)
 * 2. Despacho y Transferencia de Custodia Digital B2B (Artesano -> Tienda)
 * 3. Comercialización B2C con Certificación Fiscal SUNAT (Tienda -> Cliente)
 * 4. Verificación de Trazabilidad y Enlaces a NEARBlocks Explorer
 */

const nearService = require('../../services/nearService');

async function runDemo() {
    console.log('================================================================');
    console.log('   🚀 KIPULUX: DEMOSTRACIÓN END-TO-END SOBRE NEAR PROTOCOL');
    console.log('      Track: Real-World & NFTs ($250,000 USD Prize Pool)');
    console.log('================================================================\n');

    const SKU = 'KIPU-CUERO-999';
    const ARTESANO = 'artesano_nieto.testnet';
    const TIENDA = 'tienda_cusco.testnet';
    const CLIENTE = 'comprador_lujo.testnet';
    const FACTURA_HASH = '0x8f2d5c31b819f72a441e8093d94b08e2b8618e4726487a329431e7c54179e89b';
    const BOLETA = 'B001-00055443';

    // PASO 1: Minteo
    console.log('📌 [Paso 1/3] Artesano Nieto manufactura prenda y acuña Pasaporte Digital...');
    const mintRes = await nearService.mintAuthorized(
        ARTESANO,
        SKU,
        'ipfs://bafkreidvlo3m2x7d4xve2zrq5o2b7a42i4x4w3bxgp5n6h4k3q7f2s6vdu',
        {
            lote: 'LOTE-NIETO-003',
            descripcion: 'Casaca de Cuero de Alpaca y Badana Premium Hecha a Mano en Cusco.',
            media: 'https://app.kipulux.com/uploads/cuero-999.jpg'
        }
    );
    console.log(`   ✅ Token ID:     ${mintRes.nearTokenId}`);
    console.log(`   ✅ Estado NEAR:   ${mintRes.status}`);
    console.log(`   ✅ Tx Hash:       ${mintRes.nearTxHash}`);
    console.log(`   🔗 Explorer:      ${mintRes.explorerUrl}\n`);

    // PASO 2: Custodia B2B
    console.log('📌 [Paso 2/3] Transferencia de custodia logística B2B hacia Tienda Cusco...');
    const custodiaRes = await nearService.transferirCustodia(mintRes.tokenId, TIENDA);
    console.log(`   ✅ Custodio:      ${TIENDA}`);
    console.log(`   ✅ Estado NEAR:   ${custodiaRes.status}`);
    console.log(`   ✅ Tx Hash:       ${custodiaRes.nearTxHash}`);
    console.log(`   🔗 Explorer:      ${custodiaRes.explorerUrl}\n`);

    // PASO 3: Venta B2C y Certificación Fiscal
    console.log(`📌 [Paso 3/3] Venta comercial B2C con Certificación Fiscal SUNAT (${BOLETA})...`);
    const ventaRes = await nearService.registrarVenta(mintRes.tokenId, CLIENTE, FACTURA_HASH, BOLETA);
    console.log(`   ✅ Propietario:   ${CLIENTE}`);
    console.log(`   ✅ Hash SUNAT:    ${FACTURA_HASH}`);
    console.log(`   ✅ Estado NEAR:   ${ventaRes.status}`);
    console.log(`   ✅ Tx Hash:       ${ventaRes.nearTxHash}`);
    console.log(`   🔗 Explorer:      ${ventaRes.explorerUrl}\n`);

    console.log('================================================================');
    console.log('   🎉 DEMO E2E COMPLETADA CON ÉXITO: Phygital + NEAR Protocol');
    console.log('================================================================');
}

runDemo().catch(err => {
    console.error('❌ Error en ejecución de demo:', err);
    process.exit(1);
});
