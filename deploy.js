const fs = require('fs');
const solc = require('solc');
const { createWalletClient, createPublicClient, http, defineChain } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

// 1. Contrato Solidity Plano
const source = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AldaCertificate {
    string public name = "Alda Certificate";
    string public symbol = "ALDA";
    address public owner;
    uint256 private _nextTokenId;

    mapping(uint256 => address) private _owners;
    mapping(uint256 => string) private _tokenURIs;
    
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    constructor() {
        owner = msg.sender;
    }

    function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
        return
            interfaceId == 0x01ffc9a7 || // ERC165
            interfaceId == 0x80ac58cd || // ERC721
            interfaceId == 0x5b5e139f;   // ERC721Metadata
    }

    function mintAuthorized(address to, string memory tokenURI_) public returns (uint256) {
        require(msg.sender == owner, "Not owner");
        uint256 tokenId = _nextTokenId++;
        _owners[tokenId] = to;
        _tokenURIs[tokenId] = tokenURI_;
        emit Transfer(address(0), to, tokenId);
        return tokenId;
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address o = _owners[tokenId];
        require(o != address(0), "Invalid token");
        return o;
    }

    function tokenURI(uint256 tokenId) public view returns (string memory) {
        require(_owners[tokenId] != address(0), "Invalid token");
        return _tokenURIs[tokenId];
    }
}
`;

const input = {
  language: 'Solidity',
  sources: {
    'AldaCertificate.sol': {
      content: source,
    },
  },
  settings: {
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode'],
      },
    },
  },
};

console.log("Compilando contrato...");
const output = JSON.parse(solc.compile(JSON.stringify(input)));
if(output.errors) {
    console.error("Errores de compilacion:", output.errors);
}

const contract = output.contracts['AldaCertificate.sol']['AldaCertificate'];
const abi = contract.abi;
const bytecode = contract.evm.bytecode.object;

const zkSysTestnet = defineChain({
  id: 57057,
  name: 'zkSYS Genesis Testnet',
  network: 'zksys-testnet',
  nativeCurrency: { name: 'Syscoin', symbol: 'SYS', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc-zk.tanenbaum.io'] } },
});

require('dotenv').config();

async function main() {
    console.log("Preparando despliegue...");
    const privateKey = process.env.VAULT_PRIVATE_KEY || '';
    const account = privateKeyToAccount(privateKey);
    
    const walletClient = createWalletClient({
      account,
      chain: zkSysTestnet,
      transport: http('https://rpc-zk.tanenbaum.io')
    });
    const publicClient = createPublicClient({
        chain: zkSysTestnet,
        transport: http('https://rpc-zk.tanenbaum.io')
    });

    console.log("Desplegando desde:", account.address);
    const hash = await walletClient.deployContract({
      abi,
      bytecode: `0x${bytecode}`,
    });
    console.log("Tx hash de despliegue:", hash);
    console.log("Esperando confirmacion...");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Contrato desplegado en:", receipt.contractAddress);

    // Escribir la nueva dirección en un archivo o log
    fs.writeFileSync('contractAddress.txt', receipt.contractAddress);
}

main().catch(console.error);
