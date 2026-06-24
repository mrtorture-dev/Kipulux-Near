const { createPublicClient, createWalletClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { syscoinTestnet } = require('viem/chains');

async function main() {
  // Configuración de red y billetera
  const vaultPrivateKey = '0x0000000000000000000000000000000000000000000000000000000000000000';
  const account = privateKeyToAccount(vaultPrivateKey);
  const vaultAddress = account.address;
  const contractAddress = '0x43488c09cc0dac4acaa6747e556b6150f863b813'; // Contrato en origin
  
  const publicClient = createPublicClient({ 
    chain: syscoinTestnet, 
    transport: http('https://syscoin-tanenbaum-evm.publicnode.com') 
  });
  
  const walletClient = createWalletClient({ 
    account, 
    chain: syscoinTestnet, 
    transport: http('https://syscoin-tanenbaum-evm.publicnode.com') 
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

  // Generar Metadata para DNI 00792282
  const metadata = {
    name: "Certificado de Compra DNI 00792282",
    description: "Certificado Oficial de Origen para Billetera de cuero negro BC007NN",
    image: "https://alda.com.pe/wp-content/uploads/2025/07/Billetera-caballero_Mesa-de-trabajo-1-copia-18.png",
    attributes: [
      { trait_type: "DNI Cliente", value: "00792282" },
      { trait_type: "SKU", value: "BC007NN" },
      { trait_type: "Producto", value: "Billetera de cuero negro" },
      { trait_type: "Fecha Compra", value: "08/07/2022" },
      { trait_type: "Estado", value: "Certificado en Syscoin" }
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
    console.log(`Esperando confirmación en Syscoin Tanenbaum...`);
    
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash,
      timeout: 300000
    });
    
    const tokenId = BigInt(receipt.logs[0]?.topics[3] || '0').toString();
    console.log(`¡NFT Minteado exitosamente!`);
    console.log(`TokenId: ${tokenId}`);
    console.log(`Puedes verlo en el explorador de Syscoin: https://tanenbaum.io/tx/${hash}`);
    
  } catch(err) {
    console.error(`Error minteando el certificado:`, err);
  }
}

main().catch(console.error);
