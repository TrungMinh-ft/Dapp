import {
  Controller,
  Get,
  Post,
  Body,
  BadRequestException,
  Logger,
  Query,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { WalletAddressPipe } from "../../common/pipes/wallet-address.pipe";
import { env } from "../../config/env";

@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get("status")
  async getAuthStatus(@Query("wallet", WalletAddressPipe) wallet: string) {
    const walletLower = wallet.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { walletAddress: walletLower },
    });

    return {
      walletAddress: walletLower,
      isVerified: !!user?.isVerified,
      phoneNumber: user?.phoneNumber ?? null,
      isAdmin: env.adminWallets.includes(walletLower),
    };
  }

  @Post("verify-phone-success")
  async verifyPhoneSuccess(
    @Body() body: { walletAddress: string; phoneNumber: string },
  ) {
    if (!body.walletAddress || !body.phoneNumber) {
      throw new BadRequestException(
        "walletAddress và phoneNumber là bắt buộc!",
      );
    }

    const walletLower = body.walletAddress.toLowerCase();

    this.logger.log(
      `[verifyPhoneSuccess] Verifying phone for wallet: ${walletLower}`,
    );

    // ✅ Upsert User: tạo mới nếu chưa có, update nếu đã có
    const user = await this.prisma.user.upsert({
      where: { walletAddress: walletLower },
      update: {
        phoneNumber: body.phoneNumber,
        isVerified: true,
      },
      create: {
        walletAddress: walletLower,
        phoneNumber: body.phoneNumber,
        isVerified: true,
      },
    });

    this.logger.log(
      `[verifyPhoneSuccess] Phone verified successfully for wallet: ${walletLower}`,
    );

    return {
      success: true,
      walletAddress: user.walletAddress,
      isVerified: user.isVerified,
    };
  }
}
