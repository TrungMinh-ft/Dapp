import { Module } from '@nestjs/common';
import { Contract, FetchRequest, JsonRpcProvider, Network } from 'ethers';
import { env } from '../config/env';
import abi from './abi/PrivateVoting.json';
import { BLOCKCHAIN_CONTRACT, BLOCKCHAIN_PROVIDER } from './blockchain.constants';
import { BlockchainService } from './blockchain.service';

const SAPPHIRE_TESTNET = new Network('sapphire-testnet', 0x5aff);

@Module({
  providers: [
    {
      provide: BLOCKCHAIN_PROVIDER,
      useFactory: () => {
        const request = new FetchRequest(env.oasisRpcUrl);
        request.timeout = env.rpcTimeoutMs;
        request.setHeader('User-Agent', 'private-voting-backend');

        return new JsonRpcProvider(request, SAPPHIRE_TESTNET, {
          polling: true,
          pollingInterval: env.rpcPollingIntervalMs,
          staticNetwork: SAPPHIRE_TESTNET,
          batchMaxCount: 1,
        });
      },
    },
    {
      provide: BLOCKCHAIN_CONTRACT,
      inject: [BLOCKCHAIN_PROVIDER],
      useFactory: (provider: JsonRpcProvider) => new Contract(env.contractAddress, abi, provider),
    },
    BlockchainService,
  ],
  exports: [BlockchainService, BLOCKCHAIN_PROVIDER, BLOCKCHAIN_CONTRACT],
})
export class BlockchainModule {}
