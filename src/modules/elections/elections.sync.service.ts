import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BlockchainService } from "../../blockchain/blockchain.service";
import { env } from "../../config/env";

@Injectable()
export class ElectionsSyncService implements OnModuleInit {
  private readonly logger = new Logger(ElectionsSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchainService: BlockchainService,
  ) {}

  onModuleInit() {
    this.logger.log("ElectionsSyncService initialized");
  }

  // onModuleInit() {
  //    this.startEventListeners().catch((error) => {
  //      this.logger.error("Start listeners failed", error as Error);
  //    });

  //    setInterval(() => {
  //      this.syncAll().catch((error) => {
  //        this.logger.error("Auto sync failed", error as Error);
  //      });
  //    }, env.syncIntervalMs);
  //  }

  async syncAll() {
    const count = await this.blockchainService.getElectionCount();
    for (let electionId = 0; electionId < count; electionId++) {
      await this.syncElection(electionId);
    }
  }

  async syncElection(contractElectionId: number) {
    const election =
      await this.blockchainService.getElection(contractElectionId);

    let results: number[] = [];
    try {
      results = await this.blockchainService.getResults(contractElectionId);
    } catch {
      results = new Array(election.candidates.length).fill(0);
    }

    const totalVotes = results.reduce((sum, item) => sum + item, 0);

    const existingElection = await this.prisma.election.findUnique({
      where: { contractElectionId },
    });

    let dbElectionId: number;

    if (!existingElection) {
      const created = await this.prisma.election.create({
        data: {
          contractElectionId,
          title: election.title,
          startTime: BigInt(election.startTime),
          endTime: BigInt(election.endTime),
          isPublic: election.isPublic,
          isClosed: election.isClosed,
          creator: election.creator,
          totalVotes,
        },
      });
      dbElectionId = created.id;
    } else {
      const updated = await this.prisma.election.update({
        where: { contractElectionId },
        data: {
          title: election.title,
          startTime: BigInt(election.startTime),
          endTime: BigInt(election.endTime),
          isPublic: election.isPublic,
          isClosed: election.isClosed,
          creator: election.creator,
          totalVotes,
        },
      });
      dbElectionId = updated.id;
    }

    for (let i = 0; i < election.candidates.length; i++) {
      const name = election.candidates[i];
      const voteCount = results[i] || 0;

      await this.prisma.candidate.upsert({
        where: {
          electionId_index: {
            electionId: dbElectionId,
            index: i,
          },
        },
        update: { name, voteCount },
        create: { electionId: dbElectionId, index: i, name, voteCount },
      });
    }
  }

  async startEventListeners() {
    const contract = this.blockchainService.getContract();

    contract.on("ElectionCreated", async (electionId) => {
      await this.syncElection(Number(electionId));
    });

    contract.on("ElectionClosed", async (electionId) => {
      await this.syncElection(Number(electionId));
    });

    contract.on("VoteSubmitted", async (electionId, voter, event) => {
      await this.syncElection(Number(electionId));

      const dbElection = await this.prisma.election.findUnique({
        where: { contractElectionId: Number(electionId) },
      });

      if (!dbElection) return;

      const txHash = event?.log?.transactionHash || null;

      await this.prisma.voteEvent.upsert({
        where: {
          txHash:
            txHash || `fallback-${Number(electionId)}-${voter}-${Date.now()}`,
        },
        update: {},
        create: {
          electionId: dbElection.id,
          voter,
          txHash,
        },
      });
    });
  }
}
