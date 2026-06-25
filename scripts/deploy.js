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
  
  // Desplegar el contrato pasando el deployerAddress (Relayer) como propietario inicial
  console.log("[Deploy] Desplegando KipuluxTrazabilidad...");
  const contract = await KipuluxTrazabilidad.deploy(deployerAddress);
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log(`[Deploy] ¡Contrato desplegado con éxito! Dirección: ${contractAddress}`);

  // Mintear tokens de prueba 1, 2 y 3 para sincronizar con los productos de Neo4j
  console.log("[Deploy] Minteando tokens de prueba 1, 2 y 3 para el relayer...");
  for (let i = 1; i <= 3; i++) {
    const tx = await contract.mintAuthorized(deployerAddress, `ipfs://mock-metadata-token-${i}`);
    await tx.wait();
    console.log(`[Deploy] Token ${i} minteado con éxito.`);
  }

  // Inyectar automáticamente la dirección del contrato en el archivo .env
  const envPath = path.join(__dirname, "..", ".env");
  let envContent = "";
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }

  const contractKey = "NEO4J_OR_BLOCKCHAIN_CONTRACT_ADDRESS";
  const newLine = `${contractKey}=${contractAddress}`;
  
  if (envContent.includes(contractKey)) {
    // Reemplazar la línea existente
    const regex = new RegExp(`${contractKey}=.*`, "g");
    envContent = envContent.replace(regex, newLine);
    console.log(`[Deploy] Actualizada variable ${contractKey} en archivo .env`);
  } else {
    // Agregar la nueva variable al final
    envContent += `\n${newLine}\n`;
    console.log(`[Deploy] Agregada variable ${contractKey} al archivo .env`);
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
