import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ElectionsService {
  constructor(private readonly prisma: PrismaService) {}

  private calculatePresentation(election: any) {
    const endTimeNum = Number(election.endTime);
    const normalizedEndTime =
      endTimeNum < 10000000000 ? endTimeNum * 1000 : endTimeNum;
    const isFinished = election.isClosed || normalizedEndTime <= Date.now();

    const candidates = [...(election.candidates ?? [])].sort(
      (a, b) => (b.voteCount || 0) - (a.voteCount || 0) || a.index - b.index,
    );

    const countedVotes = candidates.reduce(
      (sum, c) => sum + (c.voteCount || 0),
      0,
    );
    const totalVotes = isFinished
      ? countedVotes
      : Number(election.totalVotes ?? countedVotes);

    const leadingCandidate = candidates[0];
    const leadingPercentage =
      totalVotes > 0 && leadingCandidate
        ? Number(((leadingCandidate.voteCount * 100) / totalVotes).toFixed(2))
        : 0;

    return {
      totalVotes,
      leadingOption: leadingCandidate?.name ?? "N/A",
      leadingPercentage,
      displayStatus: isFinished ? "FINISHED" : "VOTING LIVE",
      badgeLabel: isFinished
        ? "FINISHED"
        : election.privacyLevel === "PUBLIC"
          ? "PUBLIC VOTE"
          : "OASIS ENCRYPTED",
    };
  }

  private serializeElection(election: any) {
    const presentation = this.calculatePresentation(election);
    return {
      ...election,
      startTime: election.startTime?.toString(),
      endTime: election.endTime?.toString(),
      ...presentation,
    };
  }

  // --- HÀM LẤY DANH SÁCH (ĐÃ FIX: Sắp xếp từ 0 đến 12) ---
  async findAll() {
    const elections = await this.prisma.election.findMany({
      orderBy: { contractElectionId: "asc" },
      include: { candidates: { orderBy: { index: "asc" } } },
    });
    return elections.map((e) => this.serializeElection(e));
  }

  async findActive() {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const elections = await this.prisma.election.findMany({
      where: {
        isClosed: false,
        endTime: { gt: now },
      },
      orderBy: { contractElectionId: "asc" },
      include: { candidates: { orderBy: { index: "asc" } } },
    });
    return elections.map((e) => this.serializeElection(e));
  }

  async findFinished() {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const elections = await this.prisma.election.findMany({
      where: {
        OR: [{ isClosed: true }, { endTime: { lte: now } }],
      },
      orderBy: { contractElectionId: "asc" },
      include: { candidates: { orderBy: { index: "asc" } } },
    });
    return elections.map((e) => this.serializeElection(e));
  }

  async getVotingStatus(contractElectionId: number, wallet: string) {
    const walletLower = wallet.toLowerCase();
    const cId = Number(contractElectionId);

    const [election, user] = await Promise.all([
      this.prisma.election.findUnique({
        where: { contractElectionId: cId },
        select: { id: true },
      }),
      this.prisma.user.findUnique({ where: { walletAddress: walletLower } }),
    ]);

    if (!election) throw new NotFoundException("Election not found");

    const [auth, vote] = await Promise.all([
      this.prisma.authorizedVoter.findFirst({
        where: {
          electionId: election.id,
          wallet: { equals: walletLower, mode: "insensitive" },
        },
      }),
      this.prisma.voteEvent.findFirst({
        where: {
          electionId: election.id,
          voter: { equals: walletLower, mode: "insensitive" },
        },
      }),
    ]);

    return {
      isAuthorized: !!auth?.isAuthorized,
      hasVoted: !!vote,
      isPhoneVerified: !!user?.isVerified,
      wallet: walletLower,
      electionId: cId,
    };
  }

  async findOneByContractElectionId(contractElectionId: number) {
    const election = await this.prisma.election.findUnique({
      where: { contractElectionId: Number(contractElectionId) },
      include: { candidates: { orderBy: { index: "asc" } }, voteEvents: true },
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
    const pres = this.calculatePresentation(election);
    return {
      electionId: contractElectionId,
      title: election.title,
      totalVotes: pres.totalVotes,
      candidates: election.candidates.map((item) => ({
        ...item,
        percentage:
          pres.totalVotes === 0
            ? 0
            : Number(((item.voteCount * 100) / pres.totalVotes).toFixed(2)),
      })),
    };
  }

  // --- CÁC HÀM ADMIN (CẦN CÓ ĐỂ FIX LỖI CONTROLLER) ---
  async getAuthorizedVoters(contractElectionId: number) {
    const election = await this.prisma.election.findUnique({
      where: { contractElectionId: Number(contractElectionId) },
      select: { id: true },
    });
    if (!election) throw new NotFoundException("Election not found");
    return this.prisma.authorizedVoter.findMany({
      where: { electionId: election.id, isAuthorized: true },
      orderBy: { wallet: "asc" },
    });
  }

  async updateAdminMetadata(
    contractElectionId: number,
    data: { proposalCode?: string; description?: string },
  ) {
    return await this.prisma.election.update({
      where: { contractElectionId: Number(contractElectionId) },
      data: {
        proposalCode: data.proposalCode?.trim(),
        description: data.description?.trim(),
      },
    });
  }

  async listAdminActionLogs(limit = 50) {
    return this.prisma.$queryRaw<any[]>(
      Prisma.sql`SELECT id, action, "electionId", details, "createdAt" FROM "AdminActionLog" ORDER BY "createdAt" DESC LIMIT ${Number(limit)}`,
    );
  }

  async logAdminAction(action: string, electionId?: number, details?: string) {
    await this.prisma.$executeRaw(
      Prisma.sql`INSERT INTO "AdminActionLog" (action, "electionId", details, "createdAt") VALUES (${action}, ${electionId ?? null}, ${details ?? null}, NOW())`,
    );
  }
}
