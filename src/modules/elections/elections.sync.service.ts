import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { EventLog } from "ethers";
import { PrismaService } from "../../prisma/prisma.service";
import { BlockchainService } from "../../blockchain/blockchain.service";
import { env } from "../../config/env";

@Injectable()
export class ElectionsSyncService implements OnModuleInit {
  private readonly logger = new Logger(ElectionsSyncService.name);
  private readonly logQueryChunkSize = 100;
  private readonly maxChunksPerEventSyncRun = 5;
  private intervalRef?: NodeJS.Timeout;
  private listenersStarted = false;
  private readonly electionCreationBlockCache = new Map<number, number>();
  private syncAllPromise: Promise<void> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchainService: BlockchainService,
  ) {}

  onModuleInit() {
    this.logger.log("ElectionsSyncService initialized");

    if (env.enableChainListeners) {
      this.startEventListeners().catch((error: unknown) => {
        this.logger.error(
          this.describeSyncError("Start listeners failed", error),
        );
      });
    }

    if (env.syncOnStartup) {
      this.syncAll().catch((error: unknown) => {
        this.logger.error(this.describeSyncError("Initial sync failed", error));
      });
    }

    if (env.enableAutoSync) {
      this.intervalRef = setInterval(() => {
        this.syncAll().catch((error: unknown) => {
          this.logger.error(this.describeSyncError("Auto sync failed", error));
        });
      }, env.syncIntervalMs);
      this.intervalRef.unref();
    }
  }

  async syncAll() {
    if (this.syncAllPromise) {
      return this.syncAllPromise;
    }

    this.syncAllPromise = (async () => {
      const count = await this.blockchainService.getElectionCount();

      for (
        let contractElectionId = 0;
        contractElectionId < count;
        contractElectionId++
      ) {
        await this.syncElectionEvents(contractElectionId);
      }
    })();

    try {
      await this.syncAllPromise;
    } finally {
      this.syncAllPromise = null;
    }
  }

  async syncElection(contractElectionId: number) {
    await this.syncElectionRecord(contractElectionId);
  }

  async syncElectionEvents(contractElectionId: number) {
    const dbElectionId = await this.syncElectionRecord(contractElectionId);
    const voteProgress = await this.syncVoteEvents(
      contractElectionId,
      dbElectionId,
    );
    const authorizeProgress = await this.syncAuthorizedVoters(
      contractElectionId,
      dbElectionId,
      "VoterAuthorized",
    );
    const revokeProgress = await this.syncAuthorizedVoters(
      contractElectionId,
      dbElectionId,
      "VoterRevoked",
    );

    return {
      completed:
        voteProgress.completed &&
        authorizeProgress.completed &&
        revokeProgress.completed,
      nextBlock:
        voteProgress.nextBlock ??
        authorizeProgress.nextBlock ??
        revokeProgress.nextBlock ??
        null,
    };
  }

  private getProposalCode(contractElectionId: number, title: string) {
    const normalizedTitle = title.trim().toLowerCase();

    if (normalizedTitle.includes("lop truong")) return "BLT-2026";
    if (normalizedTitle.includes("chu tich nuoc")) return "CTN-2026";
    if (normalizedTitle.includes("hieu truong")) return "HT-2026";
    if (normalizedTitle.includes("chu tich quoc hoi")) return "CTQH-2026";
    if (normalizedTitle.includes("bo truong bo cong an")) return "BCA-2026";
    if (normalizedTitle.includes("cau thu xuat sac")) return "CTXSN-2026";
    if (normalizedTitle.includes("chu tich cong ty")) return "CTCTY-2026";

    return `OIP-${contractElectionId}`;
  }

  private async syncElectionRecord(contractElectionId: number) {
    const election =
      await this.blockchainService.getElection(contractElectionId);
    const now = Math.floor(Date.now() / 1000);
    const isFinished = election.isClosed || Number(election.endTime) <= now;

    let results: number[] = [];
    let totalVotes = 0;

    if (!isFinished) {
      results = new Array(election.candidates.length).fill(0);
      totalVotes =
        await this.blockchainService.getTotalVotes(contractElectionId);
    } else {
      try {
        results = await this.blockchainService.getResults(contractElectionId);
      } catch (error) {
        if (!this.isResultUnavailableError(error)) {
          throw error;
        }

        results = new Array(election.candidates.length).fill(0);
      }

      totalVotes = results.reduce((sum, item) => sum + item, 0);
    }

    const privacyLevel = election.isPublic ? "PUBLIC" : "ENCRYPTED";

    const existingElection = (await this.prisma.election.findUnique({
      where: { contractElectionId },
      include: {
        candidates: {
          orderBy: { index: "asc" },
        },
      },
    })) as any;

    const resultSummary = this.calculateResultSummary(
      isFinished,
      election.candidates,
      results,
    );

    const proposalCode = this.getProposalCode(
      contractElectionId,
      election.title,
    );

    let dbElectionId: number;

    if (!existingElection) {
      const created = await this.prisma.election.create({
        data: {
          contractElectionId,
          proposalCode,
          title: election.title,
          description: "",
          startTime: BigInt(election.startTime),
          endTime: BigInt(election.endTime),
          isPublic: election.isPublic,
          isClosed: election.isClosed,
          privacyLevel,
          creator: election.creator,
          totalVotes,
          resultSummary,
        } as any,
      });
      dbElectionId = created.id;
    } else {
      const updated = await this.prisma.election.update({
        where: { contractElectionId },
        data: {
          proposalCode: existingElection.proposalCode || proposalCode,
          title: election.title,
          description: existingElection.description,
          startTime: BigInt(election.startTime),
          endTime: BigInt(election.endTime),
          isPublic: election.isPublic,
          isClosed: election.isClosed,
          privacyLevel,
          creator: election.creator,
          totalVotes,
          resultSummary,
        } as any,
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

    return dbElectionId;
  }

  async startEventListeners() {
    if (this.listenersStarted) {
      return;
    }

    const contract = this.blockchainService.getContract();
    this.listenersStarted = true;

    contract.on("ElectionCreated", async (electionId) => {
      await this.syncElection(Number(electionId));
    });

    contract.on("ElectionClosed", async (electionId) => {
      await this.syncElection(Number(electionId));
    });

    contract.on("VoterAuthorized", async (electionId) => {
      await this.syncElectionEvents(Number(electionId));
    });

    contract.on("VoterRevoked", async (electionId) => {
      await this.syncElectionEvents(Number(electionId));
    });

    // ✅ FIX: Extract candidateIndex from event args
    contract.on(
      "VoteSubmitted",
      async (electionId, voter, event) => {
        await this.syncElection(Number(electionId));

        const dbElection = await this.prisma.election.findUnique({
          where: { contractElectionId: Number(electionId) },
        });

        if (!dbElection) return;

        const txHash =
          event?.log?.transactionHash || event?.transactionHash || null;
        if (!txHash) {
          this.logger.warn(
            `[VoteSubmitted] Skipping vote event without transaction hash for election ${Number(electionId)}`,
          );
          return;
        }

        const parsedCandidateIndex = await this.getVoteCandidateIndexFromTx(
          txHash,
          Number(electionId),
        );
        if (!Number.isInteger(parsedCandidateIndex)) {
          this.logger.warn(
            `[VoteSubmitted] Skipping ${txHash}; cannot decode candidateIndex`,
          );
          return;
        }

        await this.prisma.voteEvent.upsert({
          where: { txHash },
          update: {},
          create: {
            electionId: dbElection.id,
            voter: String(voter).toLowerCase(),
            candidateIndex: parsedCandidateIndex,
            txHash,
          },
        });
      },
    );
  }

  private async syncVoteEvents(
    contractElectionId: number,
    dbElectionId: number,
  ) {
    const contract = this.blockchainService.getContract();
    const filter = contract.filters.VoteSubmitted(contractElectionId);
    const progress = await this.queryIncrementalLogs(
      dbElectionId,
      "VoteSubmitted",
      contractElectionId,
      filter,
    );

    for (const log of progress.logs) {
      const event = log as EventLog;
      const voter = String(event.args[1]).toLowerCase();
      const candidateIndex = await this.getVoteCandidateIndexFromTx(
        event.transactionHash,
        contractElectionId,
      );

      if (!Number.isInteger(candidateIndex)) {
        this.logger.warn(
          `[syncVoteEvents] Skipping ${event.transactionHash}; cannot decode candidateIndex`,
        );
        continue;
      }

      await this.prisma.voteEvent.upsert({
        where: { txHash: event.transactionHash },
        update: { voter, candidateIndex },
        create: {
          electionId: dbElectionId,
          voter,
          candidateIndex,
          txHash: event.transactionHash,
        },
      });
    }

    return progress;
  }

  private async getVoteCandidateIndexFromTx(
    txHash: string,
    expectedElectionId: number,
  ) {
    const provider = this.blockchainService.getProvider();
    const contract = this.blockchainService.getContract();
    const tx = await provider.getTransaction(txHash);

    if (!tx?.data) {
      return null;
    }

    let parsed;
    try {
      parsed = contract.interface.parseTransaction({ data: tx.data });
    } catch {
      return null;
    }

    if (!parsed || parsed.name !== "vote") {
      return null;
    }

    const electionId = Number(parsed.args[0]);
    const candidateIndex = Number(parsed.args[1]);

    if (electionId !== expectedElectionId) {
      return null;
    }

    return candidateIndex;
  }

  private async syncAuthorizedVoters(
    contractElectionId: number,
    dbElectionId: number,
    eventName: "VoterAuthorized" | "VoterRevoked",
  ) {
    const contract = this.blockchainService.getContract();
    const filter =
      eventName === "VoterAuthorized"
        ? contract.filters.VoterAuthorized(contractElectionId)
        : contract.filters.VoterRevoked(contractElectionId);
    const progress = await this.queryIncrementalLogs(
      dbElectionId,
      eventName,
      contractElectionId,
      filter,
    );

    for (const log of progress.logs) {
      const event = log as EventLog;
      const wallet = String(event.args[1]).toLowerCase();
      const isAuthorized = eventName === "VoterAuthorized";

      await this.prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO "AuthorizedVoter" ("electionId", "wallet", "isAuthorized", "lastTxHash", "updatedAt")
          VALUES (${dbElectionId}, ${wallet}, ${isAuthorized}, ${event.transactionHash}, NOW())
          ON CONFLICT ("electionId", "wallet")
          DO UPDATE SET
            "isAuthorized" = EXCLUDED."isAuthorized",
            "lastTxHash" = EXCLUDED."lastTxHash",
            "updatedAt" = NOW()
        `,
      );
    }

    return progress;
  }

  private async getElectionCreationBlock(contractElectionId: number) {
    const cached = this.electionCreationBlockCache.get(contractElectionId);
    if (cached !== undefined) {
      return cached;
    }

    const contract = this.blockchainService.getContract();
    const provider = this.blockchainService.getProvider();
    const latestBlock = await provider.getBlockNumber();
    const filter = contract.filters.ElectionCreated(contractElectionId);
    let creationBlock = 0;

    for (
      let endBlock = latestBlock;
      endBlock >= 0;
      endBlock -= this.logQueryChunkSize
    ) {
      const startBlock = Math.max(0, endBlock - this.logQueryChunkSize + 1);
      const logs = await contract.queryFilter(
        filter as never,
        startBlock,
        endBlock,
      );

      if (logs.length > 0) {
        creationBlock = logs[0]!.blockNumber;
        break;
      }

      if (startBlock === 0) {
        break;
      }
    }

    this.electionCreationBlockCache.set(contractElectionId, creationBlock);
    return creationBlock;
  }

  private async queryFilterInChunks(
    filter: any,
    fromBlock: number,
    toBlock: number,
  ) {
    const contract = this.blockchainService.getContract();
    const logs: EventLog[] = [];

    if (toBlock < fromBlock) {
      return logs;
    }

    for (
      let startBlock = fromBlock;
      startBlock <= toBlock;
      startBlock += this.logQueryChunkSize
    ) {
      const endBlock = Math.min(
        startBlock + this.logQueryChunkSize - 1,
        toBlock,
      );
      const chunkLogs = await contract.queryFilter(
        filter as never,
        startBlock,
        endBlock,
      );
      logs.push(...(chunkLogs as EventLog[]));
    }

    return logs;
  }

  private async queryIncrementalLogs(
    dbElectionId: number,
    eventName: "VoteSubmitted" | "VoterAuthorized" | "VoterRevoked",
    contractElectionId: number,
    filter: any,
  ) {
    const provider = this.blockchainService.getProvider();
    const latestBlock = await provider.getBlockNumber();
    const creationBlock =
      await this.getElectionCreationBlock(contractElectionId);
    const lastSyncedBlock = await this.getLastSyncedBlock(
      dbElectionId,
      eventName,
    );
    const fromBlock = Math.max(
      creationBlock,
      lastSyncedBlock === null ? creationBlock : lastSyncedBlock + 1,
    );

    if (latestBlock < fromBlock) {
      return {
        logs: [] as EventLog[],
        completed: true,
        nextBlock: null as number | null,
      };
    }

    const toBlock = Math.min(
      latestBlock,
      fromBlock + this.logQueryChunkSize * this.maxChunksPerEventSyncRun - 1,
    );
    const logs = await this.queryFilterInChunks(filter, fromBlock, toBlock);

    await this.upsertLastSyncedBlock(dbElectionId, eventName, toBlock);

    return {
      logs,
      completed: toBlock >= latestBlock,
      nextBlock: toBlock >= latestBlock ? null : toBlock + 1,
    };
  }

  private async getLastSyncedBlock(
    dbElectionId: number,
    eventName: "VoteSubmitted" | "VoterAuthorized" | "VoterRevoked",
  ) {
    const rows = await this.prisma.$queryRaw<
      Array<{ lastSyncedBlock: number }>
    >(
      Prisma.sql`
        SELECT "lastSyncedBlock"
        FROM "EventSyncCursor"
        WHERE "electionId" = ${dbElectionId} AND "eventName" = ${eventName}
        LIMIT 1
      `,
    );

    return rows[0]?.lastSyncedBlock ?? null;
  }

  private async upsertLastSyncedBlock(
    dbElectionId: number,
    eventName: "VoteSubmitted" | "VoterAuthorized" | "VoterRevoked",
    lastSyncedBlock: number,
  ) {
    await this.prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "EventSyncCursor" ("electionId", "eventName", "lastSyncedBlock", "updatedAt")
        VALUES (${dbElectionId}, ${eventName}, ${lastSyncedBlock}, NOW())
        ON CONFLICT ("electionId", "eventName")
        DO UPDATE SET
          "lastSyncedBlock" = EXCLUDED."lastSyncedBlock",
          "updatedAt" = NOW()
      `,
    );
  }

  private calculateResultSummary(
    isFinished: boolean,
    candidates: string[],
    results: number[],
  ) {
    if (!isFinished || candidates.length === 0 || results.length === 0) {
      return null;
    }

    const totalVotes = results.reduce((sum, voteCount) => sum + voteCount, 0);
    if (totalVotes === 0) {
      return "FINISHED";
    }

    const highestVoteCount = Math.max(...results);
    const leaders = results.filter(
      (voteCount) => voteCount === highestVoteCount,
    );

    if (leaders.length > 1) {
      return "TIED";
    }

    const normalizedCandidates = candidates.map((candidate) =>
      candidate.trim().toUpperCase(),
    );
    const winningIndex = results.findIndex(
      (voteCount) => voteCount === highestVoteCount,
    );
    const winningCandidate = normalizedCandidates[winningIndex] ?? "";

    if (["YES", "APPROVE", "FOR"].includes(winningCandidate)) {
      return "PASSED";
    }

    if (["NO", "REJECT", "AGAINST"].includes(winningCandidate)) {
      return "REJECTED";
    }

    return "FINISHED";
  }

  private describeSyncError(prefix: string, error: unknown) {
    const rpcConnectionIssue = this.findRpcConnectionIssue(error);

    if (!rpcConnectionIssue) {
      return prefix;
    }

    const address = rpcConnectionIssue.address
      ? `${rpcConnectionIssue.address}:${rpcConnectionIssue.port ?? "unknown"}`
      : "unknown endpoint";

    return (
      `${prefix}: cannot reach Sapphire RPC (${rpcConnectionIssue.code ?? "UNKNOWN"} to ${address}). ` +
      "For local frontend/backend development, set SYNC_ON_STARTUP=false and ENABLE_AUTO_SYNC=false. " +
      "Re-enable sync only when the RPC endpoint is reachable."
    );
  }

  private findRpcConnectionIssue(error: unknown): RpcConnectionIssue | null {
    if (!error || typeof error !== "object") {
      return null;
    }

    if (
      "errors" in error &&
      Array.isArray((error as { errors?: unknown[] }).errors)
    ) {
      for (const nestedError of (error as { errors: unknown[] }).errors) {
        const found = this.findRpcConnectionIssue(nestedError);
        if (found) {
          return found;
        }
      }
    }

    if (
      "code" in error &&
      typeof (error as RpcConnectionIssue).code === "string"
    ) {
      const networkError = error as RpcConnectionIssue;
      if (
        ["EACCES", "ECONNREFUSED", "ENETUNREACH", "ETIMEDOUT"].includes(
          networkError.code ?? "",
        )
      ) {
        return networkError;
      }
    }

    if ("cause" in error) {
      return this.findRpcConnectionIssue((error as { cause?: unknown }).cause);
    }

    return null;
  }

  private isResultUnavailableError(error: unknown) {
    if (!error || typeof error !== "object") {
      return false;
    }

    if (
      "shortMessage" in error &&
      typeof (error as { shortMessage?: unknown }).shortMessage === "string"
    ) {
      return (error as { shortMessage: string }).shortMessage.includes(
        "ElectionStillActive",
      );
    }

    if (
      "message" in error &&
      typeof (error as { message?: unknown }).message === "string"
    ) {
      return (error as { message: string }).message.includes(
        "ElectionStillActive",
      );
    }

    if ("cause" in error) {
      return this.isResultUnavailableError(
        (error as { cause?: unknown }).cause,
      );
    }

    return false;
  }
}

type RpcConnectionIssue = NodeJS.ErrnoException & {
  address?: string;
  port?: number;
};
