import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BlockchainService } from "../../blockchain/blockchain.service";

@Injectable()
export class VotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchainService: BlockchainService,
  ) {}

  /**
   * LOGIC ĐĂNG KÝ HỒ SƠ (CHẶN GIAN LẬN)
   */
  async registerVoterProfile(data: {
    citizenId: string;
    wallet: string;
    fullName: string;
  }) {
    const walletLower = data.wallet.toLowerCase();

    // 1. KIỂM TRA: Mã định danh này có trong danh sách "Cử tri hợp lệ" của Admin không?
    const validIdentity = await this.prisma.authorizedIdentity.findUnique({
      where: { citizenId: data.citizenId },
    });

    if (!validIdentity) {
      throw new NotFoundException(
        "Mã định danh này không tồn tại trong danh sách cử tri hợp lệ của hệ thống!",
      );
    }

    // 2. KIỂM TRA: Mã này đã có ai dùng ví khác để đăng ký chưa? (Chặn Account 2 dùng lại mã cũ)
    if (validIdentity.isClaimed) {
      throw new ConflictException(
        "Mã định danh này đã được sử dụng để đăng ký cho một ví khác!",
      );
    }

    // 3. KIỂM TRA: Ví này đã đăng ký cho ai khác chưa? (Chặn 1 ví nhận nhiều mã định danh)
    const existingWallet = await this.prisma.voterProfile.findUnique({
      where: { wallet: walletLower },
    });
    if (existingWallet) {
      throw new ConflictException(
        "Địa chỉ ví này đã được liên kết với một hồ sơ định danh khác!",
      );
    }

    /**
     * 4. THỰC HIỆN GIAO DỊCH DATABASE (Transaction)
     * Vừa tạo hồ sơ, vừa đánh dấu mã định danh đã bị chiếm dụng
     */
    return this.prisma.$transaction(async (tx) => {
      // Tạo hồ sơ cử tri
      const profile = await tx.voterProfile.create({
        data: {
          citizenId: data.citizenId,
          wallet: walletLower,
          fullName: data.fullName,
        },
      });

      // Cập nhật trạng thái "Đã nhận mã" trong danh sách gốc
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
      };
    }

    const [auth, voteRecord, profile] = await Promise.all([
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
      this.prisma.voterProfile.findUnique({
        where: { wallet: walletLower },
      }),
    ]);

    return {
      electionId: cId,
      wallet: walletLower,
      hasVoted: !!voteRecord,
      isAuthorized: !!auth?.isAuthorized,
      isRegistered: !!profile,
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
}
