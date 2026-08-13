require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      evmVersion: "cancun"
    }
  },
  networks: {
    zksyscoin: {
      url: process.env.BLOCKCHAIN_RPC || "https://rpc-zk.tanenbaum.io/",
      chainId: 57057,
      accounts: process.env.VAULT_PRIVATE_KEY ? [process.env.VAULT_PRIVATE_KEY] : []
    },
    syscoinMainnet: {
      url: "https://syscoin-evm.publicnode.com",
      chainId: 57,
      accounts: process.env.VAULT_PRIVATE_KEY ? [process.env.VAULT_PRIVATE_KEY] : []
    },
    arbitrumSepolia: {
      url: process.env.ARBITRUM_RPC_URL || process.env.BLOCKCHAIN_RPC || "https://sepolia-rollup.arbitrum.io/rpc",
      chainId: 421614,
      accounts: process.env.VAULT_PRIVATE_KEY ? [process.env.VAULT_PRIVATE_KEY] : []
    }
  }
};
