import { HardhatUserConfig } from "hardhat/config";
import "@oasisprotocol/sapphire-hardhat";
import "@nomicfoundation/hardhat-toolbox";
import "./tasks";
import * as dotenv from "dotenv";

dotenv.config();

// accounts
const accounts = process.env.PRIVATE_KEY
  ? [process.env.PRIVATE_KEY]
  : {
      mnemonic: "test test test test test test test test test test test junk",
      path: "m/44'/60'/0'/0",
      initialIndex: 0,
      count: 20,
      passphrase: "",
    };

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "paris",
    },
  },

  /** 👉 BẬT SOURCIFY (QUAN TRỌNG NHẤT) */
  sourcify: {
    enabled: true,
  },

  networks: {
    sapphire: {
      url: "https://sapphire.oasis.io",
      chainId: 0x5afe, // 23294
      accounts,
    },

    "sapphire-testnet": {
      url: "https://testnet.sapphire.oasis.io",
      chainId: 0x5aff, // 23295
      accounts,
    },

    "sapphire-localnet": {
      url: "http://localhost:8545",
      chainId: 0x5afd,
      accounts,
    },
  },
};

export default config;
