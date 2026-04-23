import {
  Inject,
  Injectable,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { Contract, JsonRpcProvider, Signer } from "ethers";
import {
  BLOCKCHAIN_CONTRACT,
  BLOCKCHAIN_PROVIDER,
} from "./blockchain.constants";

interface IVotingContract {
  castVote(
    electionId: bigint | number,
    candidateIndex: bigint | number,
  ): Promise<any>;
  hasUserVoted(electionId: bigint | number, wallet: string): Promise<boolean>;
  isVoterAuthorized(
    electionId: bigint | number,
    wallet: string,
  ): Promise<boolean>;
  getElection(electionId: bigint | number): Promise<any>;
  getResults(electionId: bigint | number): Promise<bigint[]>;
  getElectionCount(): Promise<bigint>;
  getTotalVotes(electionId: bigint | number): Promise<bigint>;
}

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private votingContract: Contract;

  constructor(
    @Inject(BLOCKCHAIN_PROVIDER)
    private readonly provider: JsonRpcProvider,
    @Inject(BLOCKCHAIN_CONTRACT)
    contract: Contract,
  ) {
    this.votingContract = contract;
  }

  getProvider(): JsonRpcProvider {
    return this.provider;
  }

  getContract(): Contract {
    return this.votingContract;
  }

  private async callContract(method: string, ...args: any[]): Promise<any> {
    try {
      await this.provider.getNetwork();
      const fn = this.votingContract[method] as any;
      return await fn.apply(this.votingContract, args);
    } catch (error: any) {
      this.logger.error(`Error calling ${method}: ${error.message}`);
      if (error.code === "TIMEOUT") {
        throw new InternalServerErrorException(
          "Blockchain node không phản hồi (Timeout)",
        );
      }
      throw error;
    }
  }

  async getElectionCount(): Promise<number> {
    try {
      const count = await this.callContract("getElectionCount");
      return Number(count);
    } catch (error) {
      this.logger.error("Error fetching election count", error);
      throw error;
    }
  }

  async getElection(electionId: number) {
    try {
      const data = await this.callContract("getElection", electionId);
      if (!data) return null;

      return {
        id: Number(data.id),
        title: data.title,
        description: data.description,
        candidates: data.candidates,
        startTime: Number(data.startTime),
        endTime: Number(data.endTime),
        isPublic: data.isPublic,
        isClosed: data.isClosed,
        creator: data.creator,
      };
    } catch (error) {
      this.logger.error(`Error fetching election ${electionId}`, error);
      throw error;
    }
  }

  async getResults(electionId: number): Promise<number[]> {
    try {
      const results = await this.callContract("getResults", electionId);
      return results.map((item: bigint) => Number(item));
    } catch (error) {
      this.logger.error(
        `Error fetching results for election ${electionId}`,
        error,
      );
      throw error;
    }
  }

  async getTotalVotes(electionId: number): Promise<number> {
    try {
      const total = await this.callContract("getTotalVotes", electionId);
      return Number(total);
    } catch (error) {
      this.logger.warn(
        `getTotalVotes not available for election ${electionId}`,
        error,
      );
      return 0;
    }
  }

  async hasUserVoted(electionId: number, wallet: string): Promise<boolean> {
    if (!wallet) return false;
    try {
      const voted = await this.callContract("hasUserVoted", electionId, wallet);
      this.logger.log(
        `[hasUserVoted] Election ${electionId}, Wallet ${wallet}: ${voted}`,
      );
      return voted;
    } catch (error) {
      this.logger.error(
        `Error checking if user ${wallet} voted on election ${electionId}`,
        error,
      );
      return false; // ✅ Return false instead of throw
    }
  }

  async isVoterAuthorized(
    electionId: number,
    wallet: string,
  ): Promise<boolean> {
    if (!wallet) return false;
    try {
      const authorized = await this.callContract(
        "isVoterAuthorized",
        electionId,
        wallet,
      );
      this.logger.log(
        `[isVoterAuthorized] Election ${electionId}, Wallet ${wallet}: ${authorized}`,
      );
      return authorized;
    } catch (error) {
      this.logger.error(
        `Error checking if user ${wallet} is authorized for election ${electionId}`,
        error,
      );
      return false; // ✅ Return false instead of throw
    }
  }

  // ✅ MAIN FUNCTION: CAST VOTE
  async castVote(
    electionId: number,
    candidateIndex: number,
    signer: Signer,
  ): Promise<string> {
    try {
      this.logger.log(
        `[castVote] Starting - Election ${electionId}, Candidate ${candidateIndex}`,
      );

      // ✅ Log signer address
      const signerAddress = await signer.getAddress();
      this.logger.log(`[castVote] Signer address: ${signerAddress}`);

      // ✅ Connect contract with signer
      const contractWithSigner = this.votingContract.connect(signer);

      // ✅ Send transaction
      this.logger.log(`[castVote] Sending transaction...`);
      const tx = await (contractWithSigner as any).castVote(
        electionId,
        candidateIndex,
      );
      this.logger.log(`[castVote] Transaction sent: ${tx.hash}`);

      // ✅ Wait for confirmation
      this.logger.log(`[castVote] Waiting for confirmation...`);
      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error("Transaction failed - no receipt");
      }

      this.logger.log(
        `[castVote] ✅ Vote cast successfully! Hash: ${receipt.hash}`,
      );
      return receipt.hash;
    } catch (error: any) {
      this.logger.error(
        `[castVote] ❌ Error casting vote: ${error.message}`,
        error.stack,
      );

      // ✅ Better error handling
      if (error.reason) {
        throw new InternalServerErrorException(
          `Smart contract error: ${error.reason}`,
        );
      }

      if (error.code === "TRANSACTION_REPLACED") {
        throw new InternalServerErrorException(
          `Transaction was replaced: ${error.message}`,
        );
      }

      if (error.code === "CALL_EXCEPTION") {
        throw new InternalServerErrorException(
          `Call exception: ${error.message}`,
        );
      }

      throw new InternalServerErrorException(
        `Failed to cast vote: ${error.message}`,
      );
    }
  }
}
