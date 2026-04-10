import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

type ElectionWithRelations = any;

@Injectable()
export class ElectionsService {
  constructor(private readonly prisma: PrismaService) {}

  private calculatePresentation(election: ElectionWithRelations) {
    // Thống nhất dùng Miligiây để so sánh
    const endTimeNum = Number(election.endTime);
    const normalizedEndTime =
      endTimeNum < 10000000000 ? endTimeNum * 1000 : endTimeNum;

    const isFinished = election.isClosed || normalizedEndTime <= Date.now();

    const candidates = [...(election.candidates ?? [])].sort(
      (left, right) =>
        right.voteCount - left.voteCount || left.index - right.index,
    );
    const countedVotes = candidates.reduce(
      (sum, candidate) => sum + candidate.voteCount,
      0,
    );
    const totalVotes = isFinished
      ? countedVotes
      : Number(election.totalVotes ?? countedVotes);
    const highestVoteCount = candidates[0]?.voteCount ?? 0;
    const leadingCandidates = candidates.filter(
      (candidate) => candidate.voteCount === highestVoteCount,
    );
    const hasTieForLead = countedVotes > 0 && leadingCandidates.length > 1;
    const leadingCandidate =
      countedVotes === 0 || hasTieForLead ? null : (candidates[0] ?? null);
    const leadingPercentage =
      countedVotes === 0 || !leadingCandidate
        ? 0
        : Number(((leadingCandidate.voteCount * 100) / totalVotes).toFixed(2));

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

  async getVotingStatus(contractElectionId: number, wallet: string) {
    const walletLower = wallet.toLowerCase();
    const cId = Number(contractElectionId);

    const election = await this.prisma.election.findUnique({
      where: { contractElectionId: cId },
      select: { id: true },
    });

    if (!election) {
      return {
        isAuthorized: false,
        hasVoted: false,
        wallet: walletLower,
        electionId: cId,
      };
    }

    const auth = await this.prisma.authorizedVoter.findFirst({
      where: {
        electionId: election.id,
        wallet: { equals: walletLower, mode: "insensitive" },
      },
    });

    const vote = await this.prisma.voteEvent.findFirst({
      where: {
        electionId: election.id,
        voter: { equals: walletLower, mode: "insensitive" },
      },
    });

    return {
      isAuthorized: !!auth?.isAuthorized,
      hasVoted: !!vote,
      wallet: walletLower,
      electionId: cId,
    };
  }

  async findAll() {
    const elections = await this.prisma.election.findMany({
      where: { contractElectionId: { lte: 13 } }, // Lấy đúng 13 cuộc bầu cử
      orderBy: { contractElectionId: "asc" },
      include: { candidates: { orderBy: { index: "asc" } } },
    });

    return elections.map((election) => this.serializeElection(election));
  }

  async findActive() {
    // Lấy toàn bộ 13 cuộc bầu cử để hiện ở Gallery cho dễ test
    const elections = await this.prisma.election.findMany({
      where: {
        contractElectionId: { lte: 13 },
        isClosed: false,
      },
      orderBy: { contractElectionId: "asc" },
      include: { candidates: { orderBy: { index: "asc" } } },
    });

    return elections.map((election) => this.serializeElection(election));
  }

  async findFinished() {
    const elections = await this.prisma.election.findMany({
      where: {
        contractElectionId: { lte: 13 },
        isClosed: true,
      },
      orderBy: { contractElectionId: "asc" },
      include: { candidates: { orderBy: { index: "asc" } } },
    });

    return elections.map((election) => this.serializeElection(election));
  }

  async findOneByContractElectionId(contractElectionId: number) {
    const election = await this.prisma.election.findUnique({
      where: { contractElectionId: Number(contractElectionId) },
      include: {
        candidates: { orderBy: { index: "asc" } },
        voteEvents: true,
      },
    });

    if (!election) throw new NotFoundException("Election not found");
    return this.serializeElection(election);
  }

  async getResults(contractElectionId: number) {
    const election = await this.prisma.election.findUnique({
      where: { contractElectionId: Number(contractElectionId) },
      include: { candidates: { orderBy: { index: "asc" } } },
    });

    if (!election) throw new NotFoundException("Election not found");
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
      where: { contractElectionId: Number(contractElectionId) },
      select: { id: true },
    });

    if (!election) throw new NotFoundException("Election not found");

    return this.prisma.$queryRaw<any[]>(
      Prisma.sql`SELECT "wallet", "isAuthorized", "lastTxHash", "updatedAt" FROM "AuthorizedVoter" WHERE "electionId" = ${election.id} AND "isAuthorized" = true ORDER BY "wallet" ASC`,
    );
  }

  async updateAdminMetadata(
    contractElectionId: number,
    data: { proposalCode?: string; description?: string },
  ) {
    const election = await this.prisma.election.findUnique({
      where: { contractElectionId: Number(contractElectionId) },
      select: { id: true, title: true },
    });

    if (!election) throw new NotFoundException("Election not found");

    // THỰC HIỆN UPDATE
    const updated = await this.prisma.election.update({
      where: { contractElectionId: Number(contractElectionId) },
      data: {
        proposalCode: data.proposalCode?.trim() || undefined,
        description: data.description?.trim() || undefined,
      },
    });

    // GỌI HÀM GHI LOG SAU KHI UPDATE THÀNH CÔNG
    await this.logAdminAction(
      "UPDATE_METADATA",
      election.id,
      `Updated metadata for election: ${election.title}`,
    );

    return updated;
  }

  async listAdminActionLogs(limit = 50) {
    return this.prisma.$queryRaw<any[]>(
      Prisma.sql`SELECT "id", "action", "electionId", "details", "createdAt" FROM "AdminActionLog" ORDER BY "createdAt" DESC LIMIT ${limit}`,
    );
  }

  async logAdminAction(action: string, electionId?: number, details?: string) {
    await this.prisma.$executeRaw(
      Prisma.sql`INSERT INTO "AdminActionLog" ("action", "electionId", "details", "createdAt") VALUES (${action}, ${electionId ?? null}, ${details ?? null}, NOW())`,
    );
  }
}
