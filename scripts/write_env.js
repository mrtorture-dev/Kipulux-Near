const fs = require('fs');
const path = require('path');
require('dotenv').config();

const envContent = `RPC_URL=${process.env.RPC_URL || 'http://127.0.0.1:8545'}
CHAIN_ID=${process.env.CHAIN_ID || '31337'}
VAULT_PRIVATE_KEY=${process.env.VAULT_PRIVATE_KEY || ''}
NEO4J_URI=${process.env.NEO4J_URI || 'bolt://localhost:7687'}
NEO4J_USER=${process.env.NEO4J_USER || 'neo4j'}
NEO4J_PASSWORD=${process.env.NEO4J_PASSWORD || ''}
JWT_SECRET=${process.env.JWT_SECRET || ''}
PORT=${process.env.PORT || '3005'}
CONTRACT_ADDRESS=${process.env.CONTRACT_ADDRESS || ''}
NEO4J_ACCEPT_LICENSE_AGREEMENT=${process.env.NEO4J_ACCEPT_LICENSE_AGREEMENT || 'yes'}
NODE_ENV=${process.env.NODE_ENV || 'development'}
CORS_ORIGINS=${process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000'}
`;

fs.writeFileSync(path.join(__dirname, '..', '.env'), envContent, 'utf8');
console.log('Successfully wrote .env file from environment variables!');
