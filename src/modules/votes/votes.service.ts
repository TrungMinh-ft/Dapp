import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BlockchainService } from '../../blockchain/blockchain.service';

@Injectable()
export class VotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchainService: BlockchainService,
  ) {}

  async getVotingStatus(electionId: number, wallet: string) {
    const [hasVoted, isAuthorized] = await Promise.all([
      this.blockchainService.hasUserVoted(electionId, wallet),
      this.blockchainService.isVoterAuthorized(electionId, wallet),
    ]);

    return { electionId, wallet, hasVoted, isAuthorized };
  }

  async getVoteEvents(electionId: number) {
    const election = await this.prisma.election.findUnique({
      where: { contractElectionId: electionId },
      include: { voteEvents: true },
    });

    return election?.voteEvents || [];
  }
}
