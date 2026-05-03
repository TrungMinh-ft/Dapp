import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BlockchainService } from "../../blockchain/blockchain.service";
import { getAddress, Interface, verifyMessage, Wallet } from "ethers";

@Injectable()
export class VotesService {
  private readonly logger = new Logger(VotesService.name);
  private readonly votingInterface = new Interface([
    "function vote(uint256 electionId,uint256 candidateIndex)",
  ]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchainService: BlockchainService,
  ) {}

  async registerVoterProfile(data: {
    citizenId: string;
    wallet: string;
    fullName: string;
  }) {
    const walletLower = data.wallet.toLowerCase();

    const validIdentity = await this.prisma.authorizedIdentity.findUnique({
      where: { citizenId: data.citizenId },
    });

    if (!validIdentity) {
      throw new NotFoundException(
        "Mã định danh này không tồn tại trong danh sách cử tri hợp lệ của hệ thống!",
      );
    }

    if (validIdentity.isClaimed) {
      throw new ConflictException(
        "Mã định danh này đã được sử dụng để đăng ký cho một ví khác!",
      );
    }

    const existingWallet = await this.prisma.voterProfile.findUnique({
      where: { wallet: walletLower },
    });
    if (existingWallet) {
      throw new ConflictException(
        "Địa chỉ ví này đã được liên kết với một hồ sơ định danh khác!",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.voterProfile.create({
        data: {
          citizenId: data.citizenId,
          wallet: walletLower,
          fullName: data.fullName,
        },
      });

      await tx.authorizedIdentity.update({
        where: { citizenId: data.citizenId },
        data: { isClaimed: true },
      });

      return profile;
    });
  }

  async getVotingStatus(electionId: number, wallet: string) {
    const walletLower = wallet.toLowerCase();
    const cId = Number(electionId);

    const election = await this.prisma.election.findUnique({
      where: { contractElectionId: cId },
      select: { id: true },
    });

    if (!election) {
      return {
        electionId: cId,
        wallet: walletLower,
        hasVoted: false,
        isAuthorized: false,
        isRegistered: false,
        isPhoneVerified: false,
      };
    }

    // ✅ FIX: Thêm query bảng User để lấy isPhoneVerified
    const [isAuthorizedOnChain, hasVotedOnChain, voteRecord, profile, user] =
      await Promise.all([
      this.blockchainService.isVoterAuthorized(cId, walletLower),
      this.blockchainService.hasUserVoted(cId, walletLower),
      this.prisma.voteEvent.findFirst({
        where: {
          electionId: election.id,
          voter: { equals: walletLower, mode: "insensitive" },
        },
      }),
      this.prisma.voterProfile.findUnique({
        where: { wallet: walletLower },
      }),
      // ✅ THÊM: Query User để lấy trạng thái xác minh phone
      this.prisma.user.findUnique({
        where: { walletAddress: walletLower },
      }),
    ]);

    return {
      electionId: cId,
      wallet: walletLower,
      hasVoted: hasVotedOnChain || !!voteRecord,
      isAuthorized: isAuthorizedOnChain,
      isRegistered: !!profile,
      isPhoneVerified: !!user?.isVerified, // ✅ FIX CHÍNH
      fullName: profile?.fullName || null,
      citizenId: profile?.citizenId || null,
    };
  }

  async getVoteEvents(electionId: number, wallet?: string) {
    const election = await this.prisma.election.findUnique({
      where: { contractElectionId: Number(electionId) },
      include: {
        voteEvents: {
          where: wallet
            ? { voter: { equals: wallet, mode: "insensitive" } }
            : undefined,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return election?.voteEvents || [];
  }

  async recordClientVote(data: {
    electionId: number;
    candidateIndex: number;
    wallet: string;
    txHash: string;
  }) {
    const walletLower = data.wallet.toLowerCase();
    const contractAddress = process.env.CONTRACT_ADDRESS;

    if (!contractAddress) {
      throw new InternalServerErrorException("CONTRACT_ADDRESS is not set");
    }

    const election = await this.prisma.election.findUnique({
      where: { contractElectionId: Number(data.electionId) },
      include: { candidates: true },
    });

    if (!election) {
      throw new NotFoundException("Election not found");
    }

    const candidate = election.candidates.find(
      (item) => item.index === Number(data.candidateIndex),
    );
    if (!candidate) {
      throw new BadRequestException("Candidate index is invalid");
    }

    const provider = this.blockchainService.getProvider();
    const [receipt, tx] = await Promise.all([
      provider.getTransactionReceipt(data.txHash),
      provider.getTransaction(data.txHash),
    ]);

    if (!receipt || !tx) {
      throw new BadRequestException("Transaction was not found on chain");
    }
    if (receipt.status !== 1) {
      throw new BadRequestException("Vote transaction failed on chain");
    }
    if (getAddress(tx.from) !== getAddress(walletLower)) {
      throw new BadRequestException("Transaction sender does not match wallet");
    }
    if (!tx.to || getAddress(tx.to) !== getAddress(contractAddress)) {
      throw new BadRequestException("Transaction was not sent to voting contract");
    }

    const parsed = this.votingInterface.parseTransaction({ data: tx.data });
    if (!parsed || parsed.name !== "vote") {
      throw new BadRequestException("Transaction is not a vote transaction");
    }

    const chainElectionId = Number(parsed.args[0]);
    const chainCandidateIndex = Number(parsed.args[1]);
    if (
      chainElectionId !== Number(data.electionId) ||
      chainCandidateIndex !== Number(data.candidateIndex)
    ) {
      throw new BadRequestException("Vote transaction arguments do not match");
    }

    const voteEvent = await this.prisma.voteEvent.upsert({
      where: {
        electionId_voter: {
          electionId: election.id,
          voter: walletLower,
        },
      },
      update: {
        candidateIndex: Number(data.candidateIndex),
        txHash: data.txHash,
      },
      create: {
        electionId: election.id,
        voter: walletLower,
        candidateIndex: Number(data.candidateIndex),
        txHash: data.txHash,
      },
    });

    return {
      success: true,
      voteEvent,
      candidateName: candidate.name,
    };
  }

  async castVote(
    electionId: number,
    candidateIndex: number,
    wallet: string,
    signature: string,
  ): Promise<{ txHash: string; message: string }> {
    try {
      const walletLower = wallet.toLowerCase();

      this.logger.log(
        `[castVote] Starting - electionId: ${electionId}, candidate: ${candidateIndex}, wallet: ${walletLower}`,
      );

      this.logger.log("[castVote] Step 1: Verifying signature...");
      const messageToVerify = `Vote for election ${electionId}, candidate ${candidateIndex}`;
      let recoveredAddress: string;

      try {
        recoveredAddress = verifyMessage(messageToVerify, signature);
      } catch (error) {
        throw new BadRequestException(
          "Invalid signature format - unable to recover address",
        );
      }

      if (recoveredAddress.toLowerCase() !== walletLower) {
        throw new BadRequestException(
          `Invalid signature - recovered address ${recoveredAddress} does not match wallet ${walletLower}`,
        );
      }

      this.logger.log("[castVote] Signature verified successfully");

      this.logger.log("[castVote] Step 2: Checking voter registration...");
      const profile = await this.prisma.voterProfile.findUnique({
        where: { wallet: walletLower },
      });

      if (!profile) {
        throw new BadRequestException(
          "Wallet is not registered as a voter - please register first",
        );
      }

      // ✅ THÊM: Kiểm tra phone verified trước khi vote
      this.logger.log("[castVote] Step 2b: Checking phone verification...");
      const user = await this.prisma.user.findUnique({
        where: { walletAddress: walletLower },
      });

      if (!user?.isVerified) {
        throw new BadRequestException(
          "Phone number not verified - please verify your phone number first",
        );
      }

      const election = await this.prisma.election.findUnique({
        where: { contractElectionId: Number(electionId) },
        include: { candidates: true },
      });

      if (!election) {
        throw new NotFoundException("Election not found");
      }

      const candidate = election.candidates.find(
        (item) => item.index === Number(candidateIndex),
      );

      if (!candidate) {
        throw new BadRequestException("Candidate index is invalid");
      }

      this.logger.log("[castVote] Step 3: Checking voter authorization...");
      const isAuthorized = await this.blockchainService.isVoterAuthorized(
        electionId,
        walletLower,
      );

      if (!isAuthorized) {
        throw new BadRequestException(
          "Wallet is not authorized to vote in this election",
        );
      }

      this.logger.log("[castVote] Voter is authorized");

      this.logger.log("[castVote] Step 4: Checking if already voted...");
      const hasVoted = await this.blockchainService.hasUserVoted(
        electionId,
        walletLower,
      );

      if (hasVoted) {
        throw new ConflictException(
          "This wallet has already voted in this election",
        );
      }

      this.logger.log("[castVote] Voter has not voted yet - proceeding");

      this.logger.log("[castVote] Step 5: Getting signer...");
      const privateKey = process.env.PRIVATE_KEY;
      if (!privateKey) {
        throw new InternalServerErrorException(
          "PRIVATE_KEY environment variable not set",
        );
      }

      const provider = this.blockchainService.getProvider();
      const signer = new Wallet(privateKey, provider);

      this.logger.log(`[castVote] Signer address: ${signer.address}`);

      this.logger.log("[castVote] Step 6: Casting vote on blockchain...");
      const txHash = await this.blockchainService.castVote(
        electionId,
        candidateIndex,
        signer,
      );

      this.logger.log(`[castVote] Vote cast successfully - txHash: ${txHash}`);

      this.logger.log("[castVote] Step 7: Saving vote to database...");
      await this.prisma.voteEvent.upsert({
        where: {
          electionId_voter: {
            electionId: election.id,
            voter: walletLower,
          },
        },
        update: {
          candidateIndex,
          txHash,
        },
        create: {
          electionId: election.id,
          voter: walletLower,
          candidateIndex,
          txHash,
        },
      });

      this.logger.log(
        `[castVote] Vote recorded in database - txHash: ${txHash}`,
      );

      return {
        txHash,
        message: "Vote cast successfully",
      };
    } catch (error: any) {
      this.logger.error(`[castVote] Error: ${error.message}`, error.stack);

      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Failed to cast vote: ${error.message}`,
      );
    }
  }
  async getVoteHistory(wallet: string) {
    const walletLower = wallet.toLowerCase();

    const voteEvents = await this.prisma.voteEvent.findMany({
      where: {
        voter: { equals: walletLower, mode: "insensitive" },
      },
      include: {
        election: {
          select: {
            contractElectionId: true,
            proposalCode: true,
            title: true,
            candidates: {
              select: {
                name: true,
                index: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return voteEvents.map((event) => ({
      id: event.id,
      electionId: event.electionId,
      contractElectionId: event.election.contractElectionId,
      proposalCode: event.election.proposalCode,
      title: event.election.title,
      voter: event.voter,
      candidateIndex: event.candidateIndex,
      candidateName:
        event.election.candidates.find(
          (candidate) => candidate.index === event.candidateIndex,
        )?.name ?? null,
      txHash: event.txHash,
      createdAt: event.createdAt.toISOString(),
    }));
  }
}
