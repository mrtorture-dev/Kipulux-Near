const fs = require('fs');
const path = require('path');
const envContent = `RPC_URL=http://127.0.0.1:8545
CHAIN_ID=31337
VAULT_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password_here
JWT_SECRET=your_jwt_secret_key_here
PORT=3005
NEO4J_OR_BLOCKCHAIN_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
`;
fs.writeFileSync(path.join(__dirname, '..', '.env'), envContent, 'utf8');
console.log('Successfully wrote .env file!');
