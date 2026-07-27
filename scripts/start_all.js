const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 1. Set environment variables
process.env.RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
process.env.CHAIN_ID = process.env.CHAIN_ID || "31337";
process.env.VAULT_PRIVATE_KEY = process.env.VAULT_PRIVATE_KEY || "";
process.env.NEO4J_URI = process.env.NEO4J_URI || "bolt://localhost:7687";
process.env.NEO4J_USER = process.env.NEO4J_USER || "neo4j";
process.env.NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || "";
process.env.JWT_SECRET = process.env.JWT_SECRET || "";
process.env.PORT = process.env.PORT || "3005";
process.env.CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "";

// Write .env file
const envContent = `RPC_URL=${process.env.RPC_URL}
CHAIN_ID=${process.env.CHAIN_ID}
VAULT_PRIVATE_KEY=${process.env.VAULT_PRIVATE_KEY}
NEO4J_URI=${process.env.NEO4J_URI}
NEO4J_USER=${process.env.NEO4J_USER}
NEO4J_PASSWORD=${process.env.NEO4J_PASSWORD}
JWT_SECRET=${process.env.JWT_SECRET}
PORT=${process.env.PORT}
CONTRACT_ADDRESS=${process.env.CONTRACT_ADDRESS}
`;
fs.writeFileSync(path.join(__dirname, '..', '.env'), envContent, 'utf8');
console.log('[StartAll] Wrote .env file successfully.');

// 2. Start Hardhat Node
console.log('[StartAll] Starting Hardhat node...');
const hardhatNode = spawn('npx.cmd', ['hardhat', 'node'], { stdio: 'inherit', shell: true });
hardhatNode.on('error', (err) => {
    console.error('[StartAll] Failed to start Hardhat node:', err);
});

// Wait for Hardhat node to start
setTimeout(() => {
    console.log('[StartAll] Deploying smart contract...');
    try {
        execSync('npx.cmd hardhat run scripts/deploy.js --network localhost', { stdio: 'inherit', shell: true });
        console.log('[StartAll] Smart contract deployed successfully!');
        
        console.log('[StartAll] Seeding Neo4j database...');
        execSync('node scripts/seed_trazabilidad.js', { stdio: 'inherit', shell: true });
        console.log('[StartAll] Database seeded successfully!');
        
        console.log('[StartAll] Starting Express server...');
        // Require server.js to start it in the same process
        require('../server.js');
    } catch (error) {
        console.error('[StartAll] Error during initialization:', error.message);
    }
}, 5000);
