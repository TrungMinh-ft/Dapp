import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ElectionsService {
  constructor(private readonly prisma: PrismaService) {}

  private getRecordedVoteCounts(election: any) {
    const countsByCandidate = new Map<number, number>();

    for (const event of election.voteEvents ?? []) {
      const candidateIndex = Number(event.candidateIndex);
      countsByCandidate.set(
        candidateIndex,
        (countsByCandidate.get(candidateIndex) ?? 0) + 1,
      );
    }

    return countsByCandidate;
  }

  private async persistRecordedVoteCounts(election: any) {
    const countsByCandidate = this.getRecordedVoteCounts(election);
    if (countsByCandidate.size === 0) {
      return;
    }

    const candidates = election.candidates ?? [];
    const recordedTotalVotes = candidates.reduce(
      (sum: number, candidate: any) =>
        sum + (countsByCandidate.get(Number(candidate.index)) ?? 0),
      0,
    );
    const nextTotalVotes = Math.max(
      Number(election.totalVotes ?? 0),
      recordedTotalVotes,
    );
    const candidateUpdates = candidates.filter((candidate: any) => {
      const expectedVoteCount =
        countsByCandidate.get(Number(candidate.index)) ?? 0;
      return Number(candidate.voteCount ?? 0) !== expectedVoteCount;
    });

    if (
      candidateUpdates.length === 0 &&
      Number(election.totalVotes ?? 0) === nextTotalVotes
    ) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      for (const candidate of candidateUpdates) {
        await tx.candidate.update({
          where: { id: candidate.id },
          data: {
            voteCount: countsByCandidate.get(Number(candidate.index)) ?? 0,
          },
        });
      }

      if (Number(election.totalVotes ?? 0) !== nextTotalVotes) {
        await tx.election.update({
          where: { id: election.id },
          data: { totalVotes: nextTotalVotes },
        });
      }
    });
  }

  private applyRecordedVoteCounts(election: any) {
    const countsByCandidate = this.getRecordedVoteCounts(election);
    if (countsByCandidate.size === 0) {
      return election;
    }

    const candidates = (election.candidates ?? []).map((candidate: any) => {
      const recordedCount = countsByCandidate.get(Number(candidate.index)) ?? 0;
      return {
        ...candidate,
        voteCount: Math.max(Number(candidate.voteCount ?? 0), recordedCount),
      };
    });

    const countedVotes = candidates.reduce(
      (sum: number, candidate: any) => sum + Number(candidate.voteCount ?? 0),
      0,
    );

    return {
      ...election,
      candidates,
      totalVotes: Math.max(Number(election.totalVotes ?? 0), countedVotes),
    };
  }

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

    const leadingCandidate = countedVotes > 0 ? candidates[0] : null;
    const leadingPercentage =
      totalVotes > 0 && leadingCandidate
        ? Number(((leadingCandidate.voteCount * 100) / totalVotes).toFixed(2))
        : 0;

    return {
      totalVotes,
      leadingOption: leadingCandidate?.name ?? null,
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
    const normalizedElection = this.applyRecordedVoteCounts(election);
    const presentation = this.calculatePresentation(normalizedElection);
    return {
      ...normalizedElection,
      startTime: normalizedElection.startTime?.toString(),
      endTime: normalizedElection.endTime?.toString(),
      ...presentation,
    };
  }

  // --- HÀM LẤY DANH SÁCH (ĐÃ FIX: Sắp xếp từ 0 đến 12) ---
  async findAll() {
    const elections = await this.prisma.election.findMany({
      orderBy: { contractElectionId: "asc" },
      include: {
        candidates: { orderBy: { index: "asc" } },
        voteEvents: { select: { candidateIndex: true } },
      },
    });
    await Promise.all(
      elections.map((election) => this.persistRecordedVoteCounts(election)),
    );
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
      include: {
        candidates: { orderBy: { index: "asc" } },
        voteEvents: { select: { candidateIndex: true } },
      },
    });
    await Promise.all(
      elections.map((election) => this.persistRecordedVoteCounts(election)),
    );
    return elections.map((e) => this.serializeElection(e));
  }

  async findFinished() {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const elections = await this.prisma.election.findMany({
      where: {
        OR: [{ isClosed: true }, { endTime: { lte: now } }],
      },
      orderBy: { contractElectionId: "asc" },
      include: {
        candidates: { orderBy: { index: "asc" } },
        voteEvents: { select: { candidateIndex: true } },
      },
    });
    await Promise.all(
      elections.map((election) => this.persistRecordedVoteCounts(election)),
    );
    return elections.map((e) => this.serializeElection(e));
  }

  async getVotingStatus(contractElectionId: number, wallet: string) {
    const walletLower = wallet.toLowerCase();
    const cId = Number(contractElectionId);

    const [election, user] = await Promise.all([
      this.prisma.election.findUnique({
        where: { contractElectionId: cId },
        select: { id: true, isPublic: true },
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
      isAuthorized: election.isPublic || !!auth?.isAuthorized,
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
    await this.persistRecordedVoteCounts(election);
    return this.serializeElection(election);
  }

  async getResults(contractElectionId: number) {
    const rawElection = await this.prisma.election.findUnique({
      where: { contractElectionId: Number(contractElectionId) },
      include: {
        candidates: { orderBy: { index: "asc" } },
        voteEvents: { select: { candidateIndex: true } },
      },
    });
    if (!rawElection) throw new NotFoundException("Election not found");
    await this.persistRecordedVoteCounts(rawElection);
    const election = this.applyRecordedVoteCounts(rawElection);
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
