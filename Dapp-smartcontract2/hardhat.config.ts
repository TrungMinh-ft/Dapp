import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@oasisprotocol/sapphire-hardhat";
import "@nomicfoundation/hardhat-verify";

import dotenv from "dotenv";
dotenv.config();

const nodeMajorVersion = Number(process.versions.node.split(".")[0]);
if (![20, 22, 24].includes(nodeMajorVersion)) {
  throw new Error(
    `Unsupported Node.js ${process.versions.node}. Use Node 20 LTS, 22 LTS, or 24 LTS for Hardhat in this project.`,
  );
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    // ĐÃ ĐỔI TÊN: sapphire_testnet (Khớp với lệnh bạn hay gõ)
    sapphire_testnet: {
      url: "https://testnet.sapphire.oasis.io", // Dùng .io sẽ ổn định hơn
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 0x5aff, // 23295
      timeout: 120000,
    },
  },
  sourcify: {
    enabled: true,
    apiUrl: "https://sourcify.dev/server",
    browserUrl: "https://repo.sourcify.dev",
  },
};

export default config;
