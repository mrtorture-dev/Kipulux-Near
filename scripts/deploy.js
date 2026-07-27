const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  
  console.log(`[Deploy] Iniciando despliegue de KipuluxTrazabilidad con la cuenta: ${deployerAddress}`);
  
  const balance = await ethers.provider.getBalance(deployerAddress);
  console.log(`[Deploy] Balance de la cuenta de despliegue: ${ethers.formatEther(balance)} SYS`);

  // Obtener la fábrica del contrato
  const KipuluxTrazabilidad = await ethers.getContractFactory("KipuluxTrazabilidad");
  
  // Forzar un gasPrice mínimo razonable en Mainnet para evitar que quede atrapada
  const feeData = await ethers.provider.getFeeData();
  let gasPrice = feeData.gasPrice || ethers.parseUnits("0.1", "gwei");
  const minGasPrice = ethers.parseUnits("0.1", "gwei");
  if (gasPrice < minGasPrice) {
    gasPrice = minGasPrice;
  }
  console.log(`[Deploy] Usando gasPrice: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

  // Desplegar el contrato pasando el deployerAddress (Relayer) como propietario inicial
  console.log("[Deploy] Desplegando KipuluxTrazabilidad...");
  const contract = await KipuluxTrazabilidad.deploy(deployerAddress, { gasPrice });
  const txHash = contract.deploymentTransaction().hash;
  console.log(`[Deploy] Transacción de despliegue enviada. Hash: ${txHash}`);
  console.log(`[Deploy] Esperando confirmación de bloques en Syscoin Explorer: https://explorer.syscoin.org/tx/${txHash}`);
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log(`[Deploy] ¡Contrato desplegado con éxito! Dirección: ${contractAddress}`);

  // Mintear tokens de prueba 1, 2 y 3 para sincronizar con los productos de Neo4j
  console.log("[Deploy] Minteando tokens de prueba 1, 2 y 3 para el relayer...");
  for (let i = 1; i <= 3; i++) {
    const tx = await contract.mintAuthorized(deployerAddress, `ipfs://mock-metadata-token-${i}`, { gasPrice });
    await tx.wait();
    console.log(`[Deploy] Token ${i} minteado con éxito.`);
  }

  // -------------------------------------------------------------
  // DESPLIEGUE DEL MARKETPLACE (ESCROW)
  // -------------------------------------------------------------
  console.log("[Deploy] Desplegando KipuluxMarketplace...");
  const KipuluxMarketplace = await ethers.getContractFactory("KipuluxMarketplace");
  const marketplace = await KipuluxMarketplace.deploy(contractAddress, deployerAddress, { gasPrice });
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log(`[Deploy] ¡Marketplace desplegado con éxito! Dirección: ${marketplaceAddress}`);

  // Inyectar automáticamente las direcciones en el archivo .env
  const envPath = path.join(__dirname, "..", ".env");
  let envContent = "";
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }

  const contractKey = "NEO4J_OR_BLOCKCHAIN_CONTRACT_ADDRESS";
  const mktKey = "MARKETPLACE_CONTRACT_ADDRESS";
  
  // Actualizar Trazabilidad
  if (envContent.includes(contractKey)) {
    const regex = new RegExp(`${contractKey}=.*`, "g");
    envContent = envContent.replace(regex, `${contractKey}=${contractAddress}`);
    console.log(`[Deploy] Actualizada variable ${contractKey} en archivo .env`);
  } else {
    envContent += `\n${contractKey}=${contractAddress}\n`;
    console.log(`[Deploy] Agregada variable ${contractKey} al archivo .env`);
  }

  // Actualizar Marketplace
  if (envContent.includes(mktKey)) {
    const regexMkt = new RegExp(`${mktKey}=.*`, "g");
    envContent = envContent.replace(regexMkt, `${mktKey}=${marketplaceAddress}`);
    console.log(`[Deploy] Actualizada variable ${mktKey} en archivo .env`);
  } else {
    envContent += `\n${mktKey}=${marketplaceAddress}\n`;
    console.log(`[Deploy] Agregada variable ${mktKey} al archivo .env`);
  }

  try {
    fs.writeFileSync(envPath, envContent.trim() + "\n", "utf8");
    console.log("[Deploy] Archivo .env guardado exitosamente.");
  } catch (error) {
    console.warn("[Deploy] Advertencia: No se pudo escribir en el archivo .env:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[Deploy] Error crítico durante el despliegue:", error);
    process.exit(1);
  });
