import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
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
    @Query("wallet") wallet?: string,
  ) {
    return this.votesService.getVoteEvents(
      electionId,
      wallet ? new WalletAddressPipe().transform(wallet) : undefined,
    );
  }
}
