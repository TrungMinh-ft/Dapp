import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ElectionsService {
  constructor(private readonly prisma: PrismaService) {}

  private serializeElection(election: any) {
    return {
      ...election,
      startTime: election.startTime?.toString(),
      endTime: election.endTime?.toString(),
      candidates: election.candidates?.map((candidate: any) => ({
        ...candidate,
      })),
      voteEvents: election.voteEvents?.map((voteEvent: any) => ({
        ...voteEvent,
      })),
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

    const totalVotes = election.candidates.reduce(
      (sum, item) => sum + item.voteCount,
      0,
    );

    return {
      electionId: contractElectionId,
      title: election.title,
      totalVotes,
      candidates: election.candidates.map((item) => ({
        index: item.index,
        name: item.name,
        voteCount: item.voteCount,
        percentage: totalVotes === 0 ? 0 : (item.voteCount * 100) / totalVotes,
      })),
    };
  }
}
