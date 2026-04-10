import { Module } from "@nestjs/common";
import { Contract, FetchRequest, JsonRpcProvider, Wallet } from "ethers";
import { env } from "../config/env";
import abi from "./abi/PrivateVoting.json";
import {
  BLOCKCHAIN_CONTRACT,
  BLOCKCHAIN_PROVIDER,
} from "./blockchain.constants";
import { BlockchainService } from "./blockchain.service";

@Module({
  providers: [
    {
      provide: BLOCKCHAIN_PROVIDER,
      useFactory: () => {
        if (!env.rpcUrl) {
          throw new Error("Thiếu RPC_URL trong file .env");
        }

        const request = new FetchRequest(env.rpcUrl);
        request.timeout = env.rpcTimeoutMs;
        request.setHeader("User-Agent", "private-voting-backend");

        return new JsonRpcProvider(request, undefined, {
          polling: true,
          pollingInterval: env.rpcPollingIntervalMs,
          batchMaxCount: 1,
        });
      },
    },
    {
      provide: BLOCKCHAIN_CONTRACT,
      inject: [BLOCKCHAIN_PROVIDER],
      useFactory: (provider: JsonRpcProvider) => {
        if (!env.contractAddress) {
          throw new Error("Thiếu CONTRACT_ADDRESS trong file .env");
        }

        if (!env.privateKey) {
          throw new Error("Thiếu PRIVATE_KEY trong file .env");
        }

        const wallet = new Wallet(env.privateKey, provider);

        return new Contract(env.contractAddress, abi, wallet);
      },
    },
    BlockchainService,
  ],
  exports: [BlockchainService, BLOCKCHAIN_PROVIDER, BLOCKCHAIN_CONTRACT],
})
export class BlockchainModule {}
