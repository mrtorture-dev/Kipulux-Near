/**
 * services/nearService.js
 * Servicio Relayer Corporativo Gasless para Kipulux sobre NEAR Protocol
 * Responsable: Fredy (Backend & Systems Integration Lead)
 *
 * Cumplimiento:
 * - RF-07: Conexión RPC NEAR Testnet, KeyPairSigner y firmado de transacciones corporativas
 * - RF-08: Métodos adaptadores (mintAuthorized, transferirCustodia, registrarVenta)
 * - Compatibilidad gasless para Artesanos y Tiendas
 */

const { Account, JsonRpcProvider, KeyPair, KeyPairSigner, parseNearAmount } = require('near-api-js');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.near') });
require('dotenv').config(); // Fallback to root .env

const NETWORK_ID = process.env.NEAR_NETWORK_ID || 'testnet';
const NODE_URL = process.env.NEAR_NODE_URL || 'https://rpc.testnet.near.org';
const CONTRACT_NAME = process.env.NEAR_CONTRACT_NAME || 'kipulux-core.testnet';
const RELAYER_ACCOUNT_ID = process.env.NEAR_RELAYER_ACCOUNT_ID || 'kipulux-relayer.testnet';
const RELAYER_PRIVATE_KEY = process.env.NEAR_RELAYER_PRIVATE_KEY;
const MOCK_FALLBACK = process.env.NEAR_MOCK_FALLBACK !== 'false';

let relayerAccount = null;
let provider = null;
let isInitialized = false;

/**
 * Inicializa la conexión con el nodo NEAR y carga la cuenta Relayer con KeyPairSigner
 */
async function initNear() {
    if (isInitialized && relayerAccount) return { relayerAccount, CONTRACT_NAME };

    try {
        if (!RELAYER_PRIVATE_KEY || RELAYER_PRIVATE_KEY.includes('xxx')) {
            console.warn('[NEAR Relayer] No se detectó clave privada válida en .env.near. Operando en modo Mock/Fallback');
            return null;
        }

        const keyPair = KeyPair.fromString(RELAYER_PRIVATE_KEY);
        const signer = new KeyPairSigner(keyPair);
        provider = new JsonRpcProvider({ url: NODE_URL });
        relayerAccount = new Account(RELAYER_ACCOUNT_ID, provider, signer);

        isInitialized = true;
        console.log(`[NEAR Relayer] Inicializado con éxito. Relayer: ${RELAYER_ACCOUNT_ID}, Contrato: ${CONTRACT_NAME}`);
        return { relayerAccount, CONTRACT_NAME };
    } catch (err) {
        console.error('[NEAR Relayer] Error al inicializar conexión con NEAR RPC:', err.message);
        if (MOCK_FALLBACK) {
            console.warn('[NEAR Relayer] MOCK_FALLBACK activado. Los métodos generarán recibos simulados compatibles.');
            return null;
        }
        throw err;
    }
}

/**
 * Genera un mock hash y receiptId para pruebas locales o cuando no hay RPC disponible
 */
function generarMockReceipt(prefix, tokenId) {
    const randomHex = crypto.randomBytes(16).toString('hex');
    const mockTxHash = `near_${prefix}_${randomHex}`;
    const mockReceiptId = `rec_${crypto.randomBytes(8).toString('hex')}`;
    return {
        nearTxHash: mockTxHash,
        receiptId: mockReceiptId,
        explorerUrl: `https://testnet.nearblocks.io/txns/${mockTxHash}`,
        isMock: true
    };
}

/**
 * RF-02 / RF-08: Minteo Autorizado de Pasaporte Digital (NEP-171 / NEP-177)
 * Invocado cuando el Artesano finaliza la manufactura de la prenda.
 *
 * @param {string} artesanoId - Identificador o NEAR Account ID del artesano
 * @param {string} sku - Código SKU único de la prenda
 * @param {string} tokenUri - URI de metadatos IPFS
 * @param {object} extraMeta - Metadatos de cuero, taller y lote
 */
async function mintAuthorized(artesanoId, sku, tokenUri, extraMeta = {}) {
    const tokenId = sku.startsWith('KIPU-') ? sku : `KIPU-${sku}`;
    console.log(`[NEAR Relayer] Iniciando mint_authorized para SKU: ${sku}, TokenId: ${tokenId}`);

    try {
        const client = await initNear();

        if (client && client.relayerAccount) {
            const gas = BigInt('300000000000000'); // 300 TGas
            const deposit = parseNearAmount ? BigInt(parseNearAmount('0.05')) : BigInt('50000000000000000000000');

            const outcome = await client.relayerAccount.callFunctionRaw({
                contractId: CONTRACT_NAME,
                methodName: 'mint_authorized',
                args: {
                    token_id: tokenId,
                    receiver_id: artesanoId || RELAYER_ACCOUNT_ID,
                    token_metadata: {
                        title: `Pasaporte Digital ${sku}`,
                        description: extraMeta.descripcion || 'Pasaporte Digital de Origen KipuLux verificado en NEAR Protocol.',
                        media: extraMeta.media || '',
                        media_hash: extraMeta.mediaHash || null,
                        copies: 1,
                        issued_at: Date.now().toString(),
                        extra: JSON.stringify({
                            sku,
                            tokenUri,
                            lote: extraMeta.lote || '',
                            artesano: artesanoId,
                            estado_trazabilidad: 'ORIGINADO',
                            ...extraMeta
                        })
                    }
                },
                gas,
                deposit
            });

            const txHash = outcome.transaction_outcome?.id || outcome.transaction?.hash;
            const receiptId = outcome.receipts_outcome?.[0]?.id || txHash;

            return {
                tokenId,
                nearTokenId: tokenId,
                nearTxHash: txHash,
                receiptId,
                status: 'ORIGINADO',
                blockchainStatus: 'CONFIRMED',
                explorerUrl: `https://testnet.nearblocks.io/txns/${txHash}`,
                isMock: false
            };
        }
    } catch (error) {
        console.error(`[NEAR Relayer] Falló llamada on-chain mint_authorized: ${error.message}`);
        if (!MOCK_FALLBACK) throw error;
    }

    // Fallback Mock para desarrollo simultáneo
    const mock = generarMockReceipt('mint', tokenId);
    return {
        tokenId,
        nearTokenId: tokenId,
        nearTxHash: mock.nearTxHash,
        receiptId: mock.receiptId,
        status: 'ORIGINADO',
        blockchainStatus: 'CONFIRMED',
        explorerUrl: mock.explorerUrl,
        isMock: true
    };
}

/**
 * RF-04 / RF-08: Transferencia de Custodia Digital B2B (Artesano -> Tienda)
 *
 * @param {string} tokenId - ID del token (KIPU-SKU)
 * @param {string} tiendaId - Cuenta NEAR o RUC de la tienda receptora
 */
async function transferirCustodia(tokenId, tiendaId) {
    console.log(`[NEAR Relayer] Transferencia de custodia para Token: ${tokenId} hacia Tienda: ${tiendaId}`);

    try {
        const client = await initNear();
        if (client && client.relayerAccount) {
            const outcome = await client.relayerAccount.callFunctionRaw({
                contractId: CONTRACT_NAME,
                methodName: 'transferir_custodia',
                args: {
                    token_id: tokenId,
                    nueva_tienda: tiendaId
                },
                gas: BigInt('150000000000000'), // 150 TGas
                deposit: BigInt('1') // 1 yoctoNEAR
            });

            const txHash = outcome.transaction_outcome?.id || outcome.transaction?.hash;
            return {
                tokenId,
                nearTxHash: txHash,
                receiptId: outcome.receipts_outcome?.[0]?.id || txHash,
                status: 'CUSTODIA',
                blockchainStatus: 'CONFIRMED',
                explorerUrl: `https://testnet.nearblocks.io/txns/${txHash}`,
                isMock: false
            };
        }
    } catch (error) {
        console.error(`[NEAR Relayer] Error en transferir_custodia on-chain: ${error.message}`);
        if (!MOCK_FALLBACK) throw error;
    }

    const mock = generarMockReceipt('custodia', tokenId);
    return {
        tokenId,
        nearTxHash: mock.nearTxHash,
        receiptId: mock.receiptId,
        status: 'CUSTODIA',
        blockchainStatus: 'CONFIRMED',
        explorerUrl: mock.explorerUrl,
        isMock: true
    };
}

/**
 * RF-05 / RF-08: Registro de Venta B2C y Certificación Fiscal (Hash SUNAT)
 * Sella el hash de la boleta de la SUNAT y transfiere el NFT al cliente final.
 *
 * @param {string} tokenId - ID del token
 * @param {string} compradorAccount - Cuenta NEAR del comprador (o Relayer custodial)
 * @param {string} facturaXmlHash - Hash SHA-256 de la factura electrónica
 * @param {string} numeroBoleta - Número oficial de boleta (ej. B001-00055443)
 */
async function registrarVenta(tokenId, compradorAccount, facturaXmlHash, numeroBoleta) {
    console.log(`[NEAR Relayer] Registrando venta en NEAR para Token: ${tokenId}, Boleta: ${numeroBoleta}`);

    try {
        const client = await initNear();
        if (client && client.relayerAccount) {
            const outcome = await client.relayerAccount.callFunctionRaw({
                contractId: CONTRACT_NAME,
                methodName: 'registrar_venta',
                args: {
                    token_id: tokenId,
                    comprador: compradorAccount || RELAYER_ACCOUNT_ID,
                    hash_sunat: facturaXmlHash,
                    numero_boleta: numeroBoleta
                },
                gas: BigInt('200000000000000'),
                deposit: BigInt('1')
            });

            const txHash = outcome.transaction_outcome?.id || outcome.transaction?.hash;
            return {
                tokenId,
                nearTxHash: txHash,
                receiptId: outcome.receipts_outcome?.[0]?.id || txHash,
                status: 'VENDIDO',
                blockchainStatus: 'CONFIRMED',
                explorerUrl: `https://testnet.nearblocks.io/txns/${txHash}`,
                isMock: false
            };
        }
    } catch (error) {
        console.error(`[NEAR Relayer] Error en registrar_venta on-chain: ${error.message}`);
        if (!MOCK_FALLBACK) throw error;
    }

    const mock = generarMockReceipt('venta', tokenId);
    return {
        tokenId,
        nearTxHash: mock.nearTxHash,
        receiptId: mock.receiptId,
        status: 'VENDIDO',
        blockchainStatus: 'CONFIRMED',
        explorerUrl: mock.explorerUrl,
        isMock: true
    };
}

module.exports = {
    initNear,
    mintAuthorized,
    transferirCustodia,
    registrarVenta
};
