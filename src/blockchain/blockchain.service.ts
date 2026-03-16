import { Inject, Injectable } from '@nestjs/common';
import { Contract, JsonRpcProvider } from 'ethers';
import { BLOCKCHAIN_CONTRACT, BLOCKCHAIN_PROVIDER } from './blockchain.constants';

@Injectable()
export class BlockchainService {
  constructor(
    @Inject(BLOCKCHAIN_PROVIDER)
    private readonly provider: JsonRpcProvider,
    @Inject(BLOCKCHAIN_CONTRACT)
    private readonly contract: Contract,
  ) {}

  getProvider() {
    return this.provider;
  }

  getContract() {
    return this.contract;
  }

  async getElectionCount(): Promise<number> {
    const count = await this.contract.getElectionCount();
    return Number(count);
  }

  async getElection(electionId: number) {
    const data = await this.contract.getElection(electionId);
    return {
      id: Number(data.id),
      title: data.title,
      candidates: data.candidates as string[],
      startTime: Number(data.startTime),
      endTime: Number(data.endTime),
      isPublic: data.isPublic,
      isClosed: data.isClosed,
      creator: data.creator,
    };
  }

  async getResults(electionId: number): Promise<number[]> {
    const results = await this.contract.getResults(electionId);
    return results.map((item: bigint) => Number(item));
  }

  async getTotalVotes(electionId: number): Promise<number> {
    const total = await this.contract.getTotalVotes?.(electionId);
    return Number(total ?? 0);
  }

  async hasUserVoted(electionId: number, wallet: string): Promise<boolean> {
    return this.contract.hasUserVoted(electionId, wallet);
  }

  async isVoterAuthorized(electionId: number, wallet: string): Promise<boolean> {
    return this.contract.isVoterAuthorized(electionId, wallet);
  }
}
