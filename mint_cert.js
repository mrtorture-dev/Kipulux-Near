const { createPublicClient, createWalletClient, http, defineChain } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

const zkSysTestnet = defineChain({
  id: 57057,
  name: 'zkSYS Genesis Testnet',
  network: 'zksys-testnet',
  nativeCurrency: { name: 'Syscoin', symbol: 'SYS', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc-zk.tanenbaum.io'] },
    public: { http: ['https://rpc-zk.tanenbaum.io'] },
  },
  blockExplorers: {
    default: { name: 'Blockscout', url: 'https://explorer-zk.tanenbaum.io' },
  },
});

require('dotenv').config();

async function main() {
  // Configuración de red y billetera
  const vaultPrivateKey = process.env.VAULT_PRIVATE_KEY || '';
  const account = privateKeyToAccount(vaultPrivateKey);
  const vaultAddress = account.address;
  const contractAddress = '0xb278d88fae2c640634d3bcb30edb08ba0afdac04'; // Nuevo contrato con ERC165
  
  const publicClient = createPublicClient({ 
    chain: zkSysTestnet, 
    transport: http('https://rpc-zk.tanenbaum.io') 
  });
  
  const walletClient = createWalletClient({ 
    account, 
    chain: zkSysTestnet, 
    transport: http('https://rpc-zk.tanenbaum.io') 
  });

  // ABI mínimo para mintear
  const originIdNftAbi = [
    {
      "inputs": [
        { "internalType": "address", "name": "to", "type": "address" },
        { "internalType": "string", "name": "tokenURI_", "type": "string" }
      ],
      "name": "mintAuthorized",
      "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];

  // Generar Metadata para el Certificado ALDA
  const descriptionText = "Documento oficial que acredita la legitimidad y los altos estándares de calidad de su producto ALDA. Un símbolo de exclusividad, herencia y elegancia atemporal en cada detalle.\n\n🔗 Certificado Oficial PDF:\nhttps://alda.com.pe/pdf/cert_BC007NN.pdf\n\n✅ Validación del Registro:\nhttps://alda.com.pe/validar/BC007NN";

  const metadata = {
    name: "ALDA Original - Billetera de Cuero",
    description: descriptionText,
    image: "https://alda.com.pe/wp-content/uploads/2025/07/Billetera-caballero_Mesa-de-trabajo-1-copia-18.png",
    external_url: "https://alda.com.pe/", // Un link real a la web de ALDA
    attributes: [
      { trait_type: "ID de Registro", value: "00792282" },
      { trait_type: "SKU", value: "BC007NN" },
      { trait_type: "Producto", value: "Billetera de cuero negro" },
      { trait_type: "Fecha de Compra", value: "08/07/2022" }
    ]
  };

  // Convertir metadata a Data URI para no depender de IPFS en el demo
  const tokenUri = "data:application/json;base64," + Buffer.from(JSON.stringify(metadata)).toString('base64');

  console.log(`Minteando Certificado NFT para el DNI 00792282...`);
  console.log(`Wallet Destino (Demo): ${vaultAddress}`);
  console.log(`Contrato: ${contractAddress}`);

  try {
    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: originIdNftAbi,
      functionName: 'mintAuthorized',
      args: [vaultAddress, tokenUri]
    });
    
    console.log(`Tx enviada: ${hash}`);
    console.log(`Esperando confirmación en zkSYS Genesis Testnet...`);
    
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash,
      timeout: 300000
    });
    
    const tokenId = BigInt(receipt.logs[0]?.topics[3] || '0').toString();
    console.log(`¡NFT Minteado exitosamente!`);
    console.log(`TokenId: ${tokenId}`);
    console.log(`Puedes verlo en el explorador de zkSYS: https://explorer-zk.tanenbaum.io/tx/${hash}`);
    
  } catch(err) {
    console.error(`Error minteando el certificado:`, err);
  }
}

main().catch(console.error);
