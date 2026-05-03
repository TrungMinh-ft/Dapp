import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiBody,
  ApiCreatedResponse,
} from "@nestjs/swagger";
import { WalletAddressPipe } from "../../common/pipes/wallet-address.pipe";
import { VoteEventResponseDto } from "./dto/vote-event-response.dto";
import { VotingStatusResponseDto } from "./dto/voting-status-response.dto";
import { VotesService } from "./votes.service";

@ApiTags("Votes")
@Controller("votes")
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  // ✅ PHẢI ĐẶT TRƯỚC :electionId/status để tránh conflict route
  @Get("history")
  @ApiOperation({ summary: "Lay lich su vote cua mot vi (tat ca elections)" })
  @ApiQuery({
    name: "wallet",
    example: "0x1234567890abcdef1234567890abcdef12345678",
    description: "Dia chi vi can xem lich su",
  })
  async getVoteHistory(@Query("wallet", WalletAddressPipe) wallet: string) {
    return this.votesService.getVoteHistory(wallet);
  }

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
    const normalizedWallet = new WalletAddressPipe().transform(body.wallet);

    return this.votesService.registerVoterProfile({
      ...body,
      wallet: normalizedWallet,
    });
  }

  @Post("record")
  @ApiOperation({
    summary: "Luu lich su vote sau khi user da gui transaction tren vi",
  })
  async recordVote(
    @Body()
    body: {
      electionId: number;
      candidateIndex: number;
      wallet: string;
      txHash: string;
    },
  ) {
    if (!body.electionId && body.electionId !== 0) {
      throw new BadRequestException("electionId is required");
    }
    if (!body.candidateIndex && body.candidateIndex !== 0) {
      throw new BadRequestException("candidateIndex is required");
    }
    if (!body.wallet) {
      throw new BadRequestException("wallet is required");
    }
    if (!body.txHash) {
      throw new BadRequestException("txHash is required");
    }

    const normalizedWallet = new WalletAddressPipe().transform(body.wallet);

    return this.votesService.recordClientVote({
      electionId: body.electionId,
      candidateIndex: body.candidateIndex,
      wallet: normalizedWallet,
      txHash: body.txHash,
    });
  }

  @Post("cast")
  @ApiOperation({
    summary: "Gui phieu bau len blockchain",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        electionId: {
          type: "number",
          example: 0,
          description: "ID cuoc bau cu",
        },
        candidateIndex: {
          type: "number",
          example: 0,
          description: "Index cua ung cu vien (0, 1, 2, ...)",
        },
        wallet: {
          type: "string",
          example: "0x1234567890abcdef1234567890abcdef12345678",
          description: "Dia chi vi cua cu tri",
        },
        signature: {
          type: "string",
          example: "0x...",
          description: "Chu ky tu vi (de xac minh ownership)",
        },
      },
    },
  })
  @ApiCreatedResponse({
    schema: {
      type: "object",
      properties: {
        txHash: {
          type: "string",
          example: "0x...",
          description: "Hash cua transaction tren blockchain",
        },
        message: {
          type: "string",
          example: "Vote cast successfully",
        },
      },
    },
  })
  async castVote(
    @Body()
    body: {
      electionId: number;
      candidateIndex: number;
      wallet: string;
      signature: string;
    },
  ) {
    if (!body.electionId && body.electionId !== 0) {
      throw new BadRequestException("electionId is required");
    }
    if (!body.candidateIndex && body.candidateIndex !== 0) {
      throw new BadRequestException("candidateIndex is required");
    }
    if (!body.wallet) {
      throw new BadRequestException("wallet is required");
    }
    if (!body.signature) {
      throw new BadRequestException("signature is required");
    }

    const normalizedWallet = new WalletAddressPipe().transform(body.wallet);

    return this.votesService.castVote(
      body.electionId,
      body.candidateIndex,
      normalizedWallet,
      body.signature,
    );
  }
}
