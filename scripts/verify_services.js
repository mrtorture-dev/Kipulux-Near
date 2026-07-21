const { ethers } = require("hardhat");
const http = require("http");

async function main() {
  console.log("--- Service Verification Output ---");

  // 1. Verify Hardhat Node via ethers provider
  try {
    const blockNumber = await ethers.provider.getBlockNumber();
    console.log(`[Hardhat Node] Connected successfully! Current block number: ${blockNumber}`);
    
    // Perform a manual JSON-RPC query
    const chainId = await ethers.provider.send("eth_chainId", []);
    console.log(`[Hardhat Node] JSON-RPC eth_chainId: ${chainId}`);
  } catch (error) {
    console.error(`[Hardhat Node] Connection failed:`, error.message);
  }

  // 2. Verify Express Server on port 3005
  await new Promise((resolve) => {
    const req = http.get("http://localhost:3005/", (res) => {
      console.log(`[Express Server] Connected successfully! Status code: ${res.statusCode}`);
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        console.log(`[Express Server] Response preview: ${data.substring(0, 100)}`);
        resolve();
      });
    });

    req.on("error", (error) => {
      console.error(`[Express Server] Connection failed:`, error.message);
      resolve();
    });
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Verification script failed:", error);
    process.exit(1);
  });
