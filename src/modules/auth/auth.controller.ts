import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly prisma: PrismaService) {}

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
