import { Module } from '@nestjs/common';
import { JsonRpcProvider, Contract } from 'ethers';
import { env } from '../config/env';
import abi from './abi/PrivateVoting.json';
import { BLOCKCHAIN_CONTRACT, BLOCKCHAIN_PROVIDER } from './blockchain.constants';
import { BlockchainService } from './blockchain.service';

@Module({
  providers: [
    {
      provide: BLOCKCHAIN_PROVIDER,
      useFactory: () => new JsonRpcProvider(env.oasisRpcUrl),
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
