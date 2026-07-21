const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 1. Set environment variables
process.env.RPC_URL = "http://127.0.0.1:8545";
process.env.CHAIN_ID = "31337";
process.env.VAULT_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
process.env.NEO4J_URI = "bolt://localhost:7687";
process.env.NEO4J_USER = "neo4j";
process.env.NEO4J_PASSWORD = "your_neo4j_password_here";
process.env.JWT_SECRET = "your_jwt_secret_key_here";
process.env.PORT = "3005";

// Write .env file
const envContent = `RPC_URL=http://127.0.0.1:8545
CHAIN_ID=31337
VAULT_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password_here
JWT_SECRET=your_jwt_secret_key_here
PORT=3005
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
