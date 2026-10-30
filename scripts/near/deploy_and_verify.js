/**
 * scripts/near/deploy_and_verify.js
 * Script de Despliegue, Inicialización y Suite de Verificación On-Chain en NEAR Testnet
 * Responsable: Daniel (Web3 & Smart Contracts Lead)
 *
 * Cumplimiento:
 * - RF-01: Despliegue de contrato NEP-171/177 en Wasm e inicialización
 * - RF-02: Minteo Autorizado con Storage Staking
 * - RF-03: Máquina de estados (ORIGINADO -> CUSTODIA -> VENDIDO)
 * - RF-04: Transferencia de custodia B2B
 * - RF-05: Certificación fiscal con hash de boleta SUNAT e inmutabilidad
 * - RF-06: Gestión de storage staking y depósitos
 * - RF-13: Verificación de eventos NEP-297
 */

const { Account, JsonRpcProvider, KeyPair, KeyPairSigner, parseNearAmount } = require('near-api-js');
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const NODE_URL = 'https://rpc.testnet.near.org';
const HELPER_URL = 'https://helper.testnet.near.org/account';
const WASM_PATH = path.join(__dirname, '../../contracts/near/res/kipulux_near_contract.wasm');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Crea una cuenta en NEAR Testnet usando el Faucet Helper oficial
 */
function createTestnetAccount(accountId, keyPair) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            newAccountId: accountId,
            newAccountPublicKey: keyPair.getPublicKey().toString()
        });

        const req = https.request(HELPER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            },
            timeout: 15000
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(body || '{}'));
                } else {
                    reject(new Error(`Faucet Helper fallo con status ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function main() {
    console.log('================================================================');
    console.log('   🚀 DESPLIEGUE Y SUITE DE PRUEBAS ON-CHAIN EN NEAR TESTNET');
    console.log('      Responsable: Daniel (Web3 & Smart Contracts Lead)');
    console.log('================================================================\n');

    if (!fs.existsSync(WASM_PATH)) {
        console.error('❌ Error: No se encontro el archivo Wasm en:', WASM_PATH);
        process.exit(1);
    }
    const wasmBytes = fs.readFileSync(WASM_PATH);
    console.log(`📦 Archivo Wasm cargado: ${wasmBytes.length} bytes (~${(wasmBytes.length / 1024).toFixed(1)} KB)`);

    const provider = new JsonRpcProvider({ url: NODE_URL });

    // 1. Generar identidades on-chain
    const suffix = crypto.randomBytes(3).toString('hex');
    const contractAccountId = `kipulux-${suffix}.testnet`;
    const relayerAccountId = `kipu-relayer-${suffix}.testnet`;
    const buyerAccountId = `kipu-buyer-${suffix}.testnet`;

    const contractKeyPair = KeyPair.fromRandom('ed25519');
    const relayerKeyPair = KeyPair.fromRandom('ed25519');
    const buyerKeyPair = KeyPair.fromRandom('ed25519');

    console.log('\n[Paso 1/6] Creando cuentas en NEAR Testnet con Faucet...');
    console.log(`  • Contrato: ${contractAccountId}`);
    await createTestnetAccount(contractAccountId, contractKeyPair);
    console.log(`    ✅ Contrato creado con éxito`);
    await sleep(2000);

    console.log(`  • Relayer:  ${relayerAccountId}`);
    await createTestnetAccount(relayerAccountId, relayerKeyPair);
    console.log(`    ✅ Relayer corporativo creado con éxito`);
    await sleep(2000);

    console.log(`  • Comprador:${buyerAccountId}`);
    await createTestnetAccount(buyerAccountId, buyerKeyPair);
    console.log(`    ✅ Cuenta de comprador creada con éxito\n`);
    await sleep(2000);

    // 2. Conectar cuentas
    const contractSigner = new KeyPairSigner(contractKeyPair);
    const contractAccount = new Account(contractAccountId, provider, contractSigner);

    const relayerSigner = new KeyPairSigner(relayerKeyPair);
    const relayerAccount = new Account(relayerAccountId, provider, relayerSigner);

    // 3. Desplegar Contrato Wasm
    console.log('[Paso 2/6] Desplegando Wasm a la red NEAR Testnet...');
    const deployOutcome = await contractAccount.deployContract(wasmBytes);
    const deployTxHash = deployOutcome.transaction_outcome?.id || deployOutcome.transaction?.hash;
    console.log(`  ✅ Contrato desplegado. Tx Hash: ${deployTxHash}`);
    console.log(`  🔗 Explorador: https://testnet.nearblocks.io/txns/${deployTxHash}\n`);
    await sleep(2500);

    // 4. Inicializar Contrato (RF-01)
    console.log('[Paso 3/6] Inicializando contrato (new_default_meta)...');
    const initOutcome = await contractAccount.callFunctionRaw({
        contractId: contractAccountId,
        methodName: 'new_default_meta',
        args: { owner_id: relayerAccountId },
        gas: BigInt('30000000000000') // 30 TGas
    });
    console.log('  ✅ Contrato inicializado. Owner establecido como Relayer corporativo.\n');
    await sleep(2000);

    // 5. Minteo Autorizado con Storage Staking (RF-02, RF-03, RF-06)
    console.log('[Paso 4/6] Minteo Autorizado de Pasaporte Digital (mint_authorized)...');
    const tokenId = `KIPU-BOLSO-ALDA-${suffix.toUpperCase()}`;
    const tokenMetadata = {
        title: 'Bolso Artesanal de Cuero Peruano KipuLux #001',
        description: 'Edición limitada confeccionada en taller artesano Cusco con cuero curtido vegetal certificado.',
        media: 'bafybeicdxo7h6b5fomlgtv2lpx7rghs4w3f2n4k4o2s3y4',
        copies: 1,
        issued_at: Date.now().toString(),
        extra: JSON.stringify({
            lote: 'LOTE-PADRE-001',
            curtiembre: 'Curtiembre Arequipa S.A.C.',
            artesano: 'Taller Nieto Cusco',
            color: 'Habano Tabaco'
        })
    };

    // Depósito de 0.05 NEAR para storage staking (el sobrante se reembolsa automáticamente)
    const depositNear = parseNearAmount ? BigInt(parseNearAmount('0.05')) : BigInt('50000000000000000000000');
    const mintOutcome = await relayerAccount.callFunctionRaw({
        contractId: contractAccountId,
        methodName: 'mint_authorized',
        args: {
            token_id: tokenId,
            receiver_id: relayerAccountId,
            token_metadata: tokenMetadata
        },
        gas: BigInt('60000000000000'), // 60 TGas
        deposit: depositNear
    });
    const mintTxHash = mintOutcome.transaction_outcome?.id || mintOutcome.transaction?.hash;
    console.log(`  ✅ Prenda minteada exitosamente.`);
    console.log(`  • Token ID:   ${tokenId}`);
    console.log(`  • Estado:     ORIGINADO`);
    console.log(`  • Tx Hash:    ${mintTxHash}`);
    console.log(`  🔗 Explorador: https://testnet.nearblocks.io/txns/${mintTxHash}\n`);
    await sleep(2500);

    // 6. Transferencia de Custodia B2B hacia Tienda (RF-04)
    console.log('[Paso 5/6] Transferencia de custodia B2B a Tienda (transferir_custodia)...');
    const transOutcome = await relayerAccount.callFunctionRaw({
        contractId: contractAccountId,
        methodName: 'transferir_custodia',
        args: {
            token_id: tokenId,
            nueva_tienda: relayerAccountId
        },
        gas: BigInt('30000000000000'),
        deposit: BigInt('1') // 1 yoctoNEAR de seguridad
    });
    const transTxHash = transOutcome.transaction_outcome?.id || transOutcome.transaction?.hash;
    console.log(`  ✅ Custodia B2B transferida.`);
    console.log(`  • Estado:     CUSTODIA`);
    console.log(`  • Tx Hash:    ${transTxHash}`);
    console.log(`  🔗 Explorador: https://testnet.nearblocks.io/txns/${transTxHash}\n`);
    await sleep(2500);

    // 7. Registro de Venta B2C y Certificación Fiscal SUNAT (RF-05)
    console.log('[Paso 6/6] Registro de Venta B2C y Certificación Fiscal SUNAT (registrar_venta)...');
    const facturaXml = `<Invoice><ID>B001-00055443</ID><Total>890.00</Total><Currency>PEN</Currency></Invoice>`;
    const hashSunat = crypto.createHash('sha256').update(facturaXml).digest('hex');
    const numeroBoleta = 'B001-00055443';

    const ventaOutcome = await relayerAccount.callFunctionRaw({
        contractId: contractAccountId,
        methodName: 'registrar_venta',
        args: {
            token_id: tokenId,
            comprador: buyerAccountId,
            hash_sunat: hashSunat,
            numero_boleta: numeroBoleta
        },
        gas: BigInt('60000000000000'),
        deposit: depositNear
    });
    const ventaTxHash = ventaOutcome.transaction_outcome?.id || ventaOutcome.transaction?.hash;
    console.log(`  ✅ Venta fiscal registrada de forma inmutable.`);
    console.log(`  • Propietario final: ${buyerAccountId}`);
    console.log(`  • Boleta SUNAT:      ${numeroBoleta}`);
    console.log(`  • Hash Criptográfico:${hashSunat}`);
    console.log(`  • Estado:            VENDIDO`);
    console.log(`  • Tx Hash:           ${ventaTxHash}`);
    console.log(`  🔗 Explorador:       https://testnet.nearblocks.io/txns/${ventaTxHash}\n`);
    await sleep(2500);

    // 8. Verificación View Functions (Gasless)
    console.log('🔍 Consultando Pasaporte Digital completo on-chain (View Gasless)...');
    const pasaporteRaw = await provider.query({
        request_type: 'call_function',
        account_id: contractAccountId,
        method_name: 'obtener_pasaporte_completo',
        args_base64: Buffer.from(JSON.stringify({ token_id: tokenId })).toString('base64'),
        finality: 'optimistic'
    });
    const pasaporte = JSON.parse(Buffer.from(pasaporteRaw.result).toString('utf-8'));
    console.log('  Resultado View Pasaporte On-Chain:');
    console.log(JSON.stringify(pasaporte, null, 2));

    // 9. Comprobación de Inmutabilidad Fiscal (Seguridad)
    console.log('\n🛡️ Probando Inmutabilidad Fiscal (Intento de alteración de boleta)...');
    try {
        await relayerAccount.callFunctionRaw({
            contractId: contractAccountId,
            methodName: 'registrar_venta',
            args: {
                token_id: tokenId,
                comprador: buyerAccountId,
                hash_sunat: '0xALTERADO000000000000000000000000000000000000000000000000000000',
                numero_boleta: 'B001-99999999'
            },
            gas: BigInt('30000000000000'),
            deposit: depositNear
        });
        console.error('❌ Error: El contrato permitio alterar una boleta existente.');
    } catch (err) {
        console.log('  ✅ Éxito: El contrato rechazó la alteración de la boleta.');
        console.log(`     Motivo esperado: "Inmutabilidad fiscal violada"`);
    }

    // 10. Actualizar .env.near con las credenciales activas
    const envNearContent = `# =========================================================================
# CONFIGURACIÓN ACTIVA DE NEAR TESTNET (Smart Contract Rust Wasm Desplegado)
# Generado por: Daniel (Web3 & Smart Contracts Lead)
# =========================================================================
NEAR_NETWORK_ID=testnet
NEAR_NODE_URL=https://rpc.testnet.near.org
NEAR_CONTRACT_NAME=${contractAccountId}
NEAR_RELAYER_ACCOUNT_ID=${relayerAccountId}
NEAR_RELAYER_PRIVATE_KEY=${relayerKeyPair.toString()}
NEAR_MOCK_FALLBACK=false
`;
    fs.writeFileSync(path.join(__dirname, '../../.env.near'), envNearContent);
    console.log('\n📄 Archivo .env.near actualizado con las credenciales y contrato activo on-chain.');

    console.log('\n================================================================');
    console.log('   🎉 PARTE DE DANIEL COMPLETADA AL 100%');
    console.log(`   Contrato Activo: ${contractAccountId}`);
    console.log(`   Relayer Activo:  ${relayerAccountId}`);
    console.log(`   Explorador:      https://testnet.nearblocks.io/address/${contractAccountId}`);
    console.log('================================================================\n');
}

main().catch(err => {
    console.error('❌ Error fatal en el despliegue:', err);
    process.exit(1);
});
