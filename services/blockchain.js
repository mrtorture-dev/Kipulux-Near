const { createPublicClient, createWalletClient, http, defineChain, decodeEventLog, getAddress } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const crypto = require('crypto');
require('dotenv').config();

// ==========================================
// 1. CONFIGURACIÓN DE RED ZKSYSCOIN TANENBAUM
// ==========================================
const zkSyscoinTanenbaum = defineChain({
  id: Number(process.env.CHAIN_ID) || 57057,
  name: 'zkSyscoin Tanenbaum Testnet',
  network: 'zksyscoin-tanenbaum',
  nativeCurrency: {
    decimals: 18,
    name: 'Syscoin',
    symbol: 'SYS',
  },
  rpcUrls: {
    default: {
      http: [process.env.RPC_URL || process.env.BLOCKCHAIN_RPC || 'https://rpc-zk.tanenbaum.io/'],
    },
    public: {
      http: [process.env.RPC_URL || process.env.BLOCKCHAIN_RPC || 'https://rpc-zk.tanenbaum.io/'],
    },
  },
});

const rawPrivateKey = process.env.VAULT_PRIVATE_KEY;
const compromisedKey = '0x0000000000000000000000000000000000000000000000000000000000000000';

if (!rawPrivateKey || rawPrivateKey.trim() === '' || rawPrivateKey.trim() === compromisedKey) {
  console.error('[Relayer Error] La variable de entorno VAULT_PRIVATE_KEY no está configurada, está vacía o contiene la clave de pruebas comprometida.');
  process.exit(1);
}

// Asegurar prefijo 0x para la llave privada
const privateKey = rawPrivateKey.startsWith('0x') ? rawPrivateKey : `0x${rawPrivateKey}`;
const account = privateKeyToAccount(privateKey);

const contractAddress = process.env.NEO4J_OR_BLOCKCHAIN_CONTRACT_ADDRESS || '0x43488c09cc0dac4acaa6747e556b6150f863b813';

// Clientes de Viem
const publicClient = createPublicClient({
  chain: zkSyscoinTanenbaum,
  transport: http()
});

const walletClient = createWalletClient({
  account,
  chain: zkSyscoinTanenbaum,
  transport: http()
});

// ABI mínimo para interactuar con KipuluxTrazabilidad.sol
const contractABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "string", "name": "tokenURI_", "type": "string" }
    ],
    "name": "mintAuthorized",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "internalType": "address", "name": "tienda", "type": "address" }
    ],
    "name": "transferirCustodia",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "internalType": "address", "name": "comprador", "type": "address" },
      { "internalType": "bytes32", "name": "Hash_Comprobante_Pago_", "type": "bytes32" }
    ],
    "name": "registrarVenta",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "from", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
      { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" }
    ],
    "name": "Transfer",
    "type": "event"
  }
];

/**
 * Mintea un NFT en la Blockchain representando el origen del cuero.
 * @param {string} toAddress Dirección destino que recibirá el NFT
 * @param {string} metadataURI URI del archivo de metadatos (Base64 o IPFS CID)
 * @returns {Promise<{tokenId: string, txHash: string}>}
 */
async function ejecutarMintOnChain(toAddress, metadataURI) {
  console.log(`[Blockchain] Minteando NFT para: ${toAddress}...`);
  try {
    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: contractABI,
      functionName: 'mintAuthorized',
      args: [getAddress(toAddress), metadataURI]
    });

    console.log(`[Blockchain] Tx de minteo enviada: ${hash}. Esperando confirmación...`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Decodificar el tokenId del evento Transfer
    let tokenId = null;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: contractABI,
          data: log.data,
          topics: log.topics
        });
        if (decoded.eventName === 'Transfer') {
          tokenId = decoded.args.tokenId.toString();
          break;
        }
      } catch (e) {
        // Ignorar si no coincide la firma del evento
      }
    }

    // Fallback de decodificación directa
    if (!tokenId && receipt.logs[0] && receipt.logs[0].topics[3]) {
      tokenId = BigInt(receipt.logs[0].topics[3]).toString();
    }

    console.log(`[Blockchain] NFT Minteado con éxito. Token ID: ${tokenId}`);
    return { tokenId, txHash: hash };
  } catch (error) {
    console.error(`[Blockchain] Error en mintAuthorized:`, error);
    throw error;
  }
}

/**
 * Registra la venta on-chain, calcula el hash de la boleta y transfiere el NFT al comprador.
 * @param {string|number} tokenId ID del NFT a transferir
 * @param {string} compradorAddress Wallet del comprador final
 * @param {string} xmlBoletaString Contenido XML de la boleta de venta
 * @returns {Promise<{txHash: string, hashSUNAT: string}>}
 */
async function ejecutarVentaOnChain(tokenId, compradorAddress, xmlBoletaString) {
  console.log(`[Blockchain] Registrando venta para TokenID ${tokenId}...`);
  try {
    // 1. Calcular hash SHA-256 nativo de la boleta XML
    const hashHex = crypto.createHash('sha256').update(xmlBoletaString).digest('hex');
    const bytes32Hash = `0x${hashHex}`;

    console.log(`[Blockchain] Hash SUNAT calculado (bytes32): ${bytes32Hash}`);

    // 2. Invocar la transacción en el contrato inteligente
    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: contractABI,
      functionName: 'registrarVenta',
      args: [BigInt(tokenId), getAddress(compradorAddress), bytes32Hash]
    });

    console.log(`[Blockchain] Tx de venta enviada: ${hash}. Esperando confirmación...`);
    await publicClient.waitForTransactionReceipt({ hash });

    console.log(`[Blockchain] Venta registrada on-chain con éxito.`);
    return { txHash: hash, hashSUNAT: bytes32Hash };
  } catch (error) {
    console.error(`[Blockchain] Error en registrarVenta:`, error);
    throw error;
  }
}

/**
 * Transfiere la custodia on-chain del NFT de la wallet del artesano a la tienda.
 * @param {string|number} tokenId ID del NFT
 * @param {string} tiendaAddress Wallet de la tienda destino
 * @returns {Promise<{txHash: string}>}
 */
async function ejecutarTransferenciaOnChain(tokenId, tiendaAddress) {
  console.log(`[Blockchain] Transfiriendo custodia de TokenID ${tokenId} a tienda ${tiendaAddress}...`);
  try {
    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: contractABI,
      functionName: 'transferirCustodia',
      args: [BigInt(tokenId), getAddress(tiendaAddress)]
    });

    console.log(`[Blockchain] Tx de transferencia enviada: ${hash}. Esperando confirmación...`);
    await publicClient.waitForTransactionReceipt({ hash });

    console.log(`[Blockchain] Custodia transferida on-chain con éxito.`);
    return { txHash: hash };
  } catch (error) {
    console.error(`[Blockchain] Error en transferirCustodia:`, error);
    throw error;
  }
}

module.exports = {
  ejecutarMintOnChain,
  ejecutarVentaOnChain,
  ejecutarTransferenciaOnChain
};
