import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiBody,
} from "@nestjs/swagger";
import { WalletAddressPipe } from "../../common/pipes/wallet-address.pipe";
import { VoteEventResponseDto } from "./dto/vote-event-response.dto";
import { VotingStatusResponseDto } from "./dto/voting-status-response.dto";
import { VotesService } from "./votes.service";

@ApiTags("Votes")
@Controller("votes")
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  @Get(":electionId/status")
  @ApiOperation({ summary: "Kiem tra trang thai bo phieu cua mot vi" })
  @ApiParam({
    name: "electionId",
    example: 0,
    description: "Contract election id",
  })
  @ApiQuery({
    name: "wallet",
    example: "0x1234567890abcdef1234567890abcdef12345678",
    description: "Dia chi vi can kiem tra",
  })
  @ApiOkResponse({ type: VotingStatusResponseDto })
  async getVotingStatus(
    @Param("electionId", ParseIntPipe) electionId: number,
    @Query("wallet", WalletAddressPipe) wallet: string,
  ) {
    return this.votesService.getVotingStatus(electionId, wallet);
  }

  @Get(":electionId/events")
  @ApiOperation({ summary: "Lay danh sach vote events da sync" })
  @ApiParam({
    name: "electionId",
    example: 0,
    description: "Contract election id",
  })
  @ApiQuery({
    name: "wallet",
    required: false,
    example: "0x1234567890abcdef1234567890abcdef12345678",
    description: "Neu co, chi tra ve vote events cua vi nay",
  })
  @ApiOkResponse({ type: [VoteEventResponseDto] })
  async getVoteEvents(
    @Param("electionId", ParseIntPipe) electionId: number,
    @Query("wallet", WalletAddressPipe) wallet?: string,
  ) {
    return this.votesService.getVoteEvents(electionId, wallet);
  }

  // FIX: Đưa hàm đăng ký vào bên trong Class và thêm Swagger documentation
  @Post("register")
  @ApiOperation({
    summary: "Dang ky ho so cu tri (Link CCCD/MSSV voi dia chi vi)",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        citizenId: {
          type: "string",
          example: "SV001",
          description: "Ma so sinh vien hoac CCCD",
        },
        wallet: {
          type: "string",
          example: "0xf025...",
          description: "Dia chi vi",
        },
        fullName: {
          type: "string",
          example: "Nguyen Van A",
          description: "Ho va ten that",
        },
      },
    },
  })
  async registerProfile(
    @Body() body: { citizenId: string; wallet: string; fullName: string },
  ) {
    // Chúng ta sử dụng WalletAddressPipe thủ công để chuẩn hóa địa chỉ ví về chữ thường
    const normalizedWallet = new WalletAddressPipe().transform(body.wallet);

    return this.votesService.registerVoterProfile({
      ...body,
      wallet: normalizedWallet,
    });
  }
}
