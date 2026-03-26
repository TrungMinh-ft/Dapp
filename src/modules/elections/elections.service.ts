import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

type ElectionWithRelations = any;

@Injectable()
export class ElectionsService {
  constructor(private readonly prisma: PrismaService) {}

  private calculatePresentation(election: ElectionWithRelations) {
    const candidates = [...(election.candidates ?? [])].sort(
      (left, right) => right.voteCount - left.voteCount || left.index - right.index,
    );
    const totalVotes = candidates.reduce(
      (sum, candidate) => sum + candidate.voteCount,
      0,
    );
    const highestVoteCount = candidates[0]?.voteCount ?? 0;
    const leadingCandidates = candidates.filter(
      (candidate) => candidate.voteCount === highestVoteCount,
    );
    const hasTieForLead = totalVotes > 0 && leadingCandidates.length > 1;
    const leadingCandidate =
      totalVotes === 0 || hasTieForLead ? null : (candidates[0] ?? null);
    const leadingPercentage =
      totalVotes === 0 || !leadingCandidate
        ? 0
        : Number(((leadingCandidate.voteCount * 100) / totalVotes).toFixed(2));

    const isFinished = election.isClosed || Number(election.endTime) <= Date.now() / 1000;
    const displayStatus = isFinished
      ? election.resultSummary || "FINISHED"
      : "VOTING LIVE";
    const badgeLabel = isFinished
      ? "FINISHED"
      : election.privacyLevel === "PUBLIC"
        ? "PUBLIC VOTE"
        : "OASIS ENCRYPTED";

    return {
      totalVotes,
      leadingOption: leadingCandidate?.name ?? null,
      leadingPercentage,
      displayStatus,
      badgeLabel,
    };
  }

  private serializeElection(election: ElectionWithRelations) {
    const resultSummary = (election as any).resultSummary ?? null;
    const presentation = this.calculatePresentation(election);

    return {
      ...election,
      startTime: election.startTime?.toString(),
      endTime: election.endTime?.toString(),
      candidates: election.candidates?.map((candidate) => ({
        ...candidate,
      })),
      voteEvents: election.voteEvents?.map((voteEvent) => ({
        ...voteEvent,
      })),
      totalVotes: presentation.totalVotes,
      leadingOption: presentation.leadingOption,
      leadingPercentage: presentation.leadingPercentage,
      displayStatus: presentation.displayStatus,
      badgeLabel: presentation.badgeLabel,
      resultSummary,
    };
  }

  async findAll() {
    const elections = await this.prisma.election.findMany({
      orderBy: { contractElectionId: "asc" },
      include: {
        candidates: {
          orderBy: { index: "asc" },
        },
      },
    });

    return elections.map((election) => this.serializeElection(election));
  }

  async findActive() {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const elections = await this.prisma.election.findMany({
      where: {
        isClosed: false,
        startTime: {
          lte: now,
        },
        endTime: {
          gt: now,
        },
      },
      orderBy: { startTime: "desc" },
      include: {
        candidates: { orderBy: { index: "asc" } },
      },
    });

    return elections.map((election) => this.serializeElection(election));
  }

  async findFinished() {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const elections = await this.prisma.election.findMany({
      where: {
        OR: [
          { isClosed: true },
          {
            endTime: {
              lte: now,
            },
          },
        ],
      },
      orderBy: { endTime: "desc" },
      include: {
        candidates: { orderBy: { index: "asc" } },
      },
    });

    return elections.map((election) => this.serializeElection(election));
  }

  async findOneByContractElectionId(contractElectionId: number) {
    const election = await this.prisma.election.findUnique({
      where: { contractElectionId },
      include: {
        candidates: { orderBy: { index: "asc" } },
        voteEvents: true,
      },
    });

    if (!election) {
      throw new NotFoundException("Election not found");
    }

    return this.serializeElection(election);
  }

  async getResults(contractElectionId: number) {
    const election = await this.prisma.election.findUnique({
      where: { contractElectionId },
      include: {
        candidates: { orderBy: { index: "asc" } },
      },
    });

    if (!election) {
      throw new NotFoundException("Election not found");
    }

    const presentation = this.calculatePresentation(election);

    return {
      electionId: contractElectionId,
      title: election.title,
      totalVotes: presentation.totalVotes,
      leadingOption: presentation.leadingOption,
      leadingPercentage: presentation.leadingPercentage,
      resultSummary: (election as any).resultSummary ?? null,
      candidates: election.candidates.map((item) => ({
        index: item.index,
        name: item.name,
        voteCount: item.voteCount,
        percentage:
          presentation.totalVotes === 0
            ? 0
            : Number(
                ((item.voteCount * 100) / presentation.totalVotes).toFixed(2),
              ),
      })),
    };
  }

  async getAuthorizedVoters(contractElectionId: number) {
    const election = await this.prisma.election.findUnique({
      where: { contractElectionId },
      select: { id: true },
    });

    if (!election) {
      throw new NotFoundException("Election not found");
    }

    return this.prisma.$queryRaw<
      Array<{
        wallet: string;
        isAuthorized: boolean;
        lastTxHash: string | null;
        updatedAt: Date;
      }>
    >(
      Prisma.sql`
        SELECT "wallet", "isAuthorized", "lastTxHash", "updatedAt"
        FROM "AuthorizedVoter"
        WHERE "electionId" = ${election.id} AND "isAuthorized" = true
        ORDER BY "wallet" ASC
      `,
    );
  }

  async updateAdminMetadata(
    contractElectionId: number,
    data: { proposalCode?: string; description?: string },
  ) {
    const election = await this.prisma.election.findUnique({
      where: { contractElectionId },
      select: { id: true },
    });

    if (!election) {
      throw new NotFoundException("Election not found");
    }

    return this.prisma.election.update({
      where: { contractElectionId },
      data: {
        proposalCode: data.proposalCode?.trim() || undefined,
        description: data.description?.trim() || undefined,
      },
    });
  }

  async listAdminActionLogs(limit = 50) {
    return this.prisma.$queryRaw<
      Array<{
        id: number;
        action: string;
        electionId: number | null;
        details: string | null;
        createdAt: Date;
      }>
    >(
      Prisma.sql`
        SELECT "id", "action", "electionId", "details", "createdAt"
        FROM "AdminActionLog"
        ORDER BY "createdAt" DESC
        LIMIT ${limit}
      `,
    );
  }

  async logAdminAction(
    action: string,
    electionId?: number,
    details?: string,
  ) {
    await this.prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO "AdminActionLog" ("action", "electionId", "details", "createdAt")
        VALUES (${action}, ${electionId ?? null}, ${details ?? null}, NOW())
      `,
    );
  }
}
