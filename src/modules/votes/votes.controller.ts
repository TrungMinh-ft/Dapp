import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { VotesService } from "./votes.service";
import { VotingStatusResponseDto } from "./dto/voting-status-response.dto";
import { VoteEventResponseDto } from "./dto/vote-event-response.dto";

@ApiTags("Votes")
@Controller("votes")
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  @Get(":electionId/status")
  @ApiOperation({ summary: "Kiểm tra trạng thái bỏ phiếu của một ví" })
  @ApiParam({
    name: "electionId",
    example: 0,
    description: "Contract election id",
  })
  @ApiQuery({
    name: "wallet",
    example: "0x1234567890abcdef1234567890abcdef12345678",
    description: "Địa chỉ ví cần kiểm tra",
  })
  @ApiOkResponse({ type: VotingStatusResponseDto })
  async getVotingStatus(
    @Param("electionId", ParseIntPipe) electionId: number,
    @Query("wallet") wallet: string,
  ) {
    return this.votesService.getVotingStatus(electionId, wallet);
  }

  @Get(":electionId/events")
  @ApiOperation({ summary: "Lấy danh sách vote events đã sync" })
  @ApiParam({
    name: "electionId",
    example: 0,
    description: "Contract election id",
  })
  @ApiOkResponse({ type: [VoteEventResponseDto] })
  async getVoteEvents(@Param("electionId", ParseIntPipe) electionId: number) {
    return this.votesService.getVoteEvents(electionId);
  }
}
