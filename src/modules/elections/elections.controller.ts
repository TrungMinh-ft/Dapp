import { Controller, Get, Param, ParseIntPipe, Post } from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { ElectionsService } from "./elections.service";
import { ElectionsSyncService } from "./elections.sync.service";
import { ElectionDetailResponseDto } from "./dto/election-detail-response.dto";
import { ElectionResponseDto } from "./dto/election-response.dto";
import { ElectionResultsResponseDto } from "./dto/election-results-response.dto";
import { SyncResponseDto } from "./dto/sync-response.dto";

@ApiTags("Elections")
@Controller("elections")
export class ElectionsController {
  constructor(
    private readonly electionsService: ElectionsService,
    private readonly electionsSyncService: ElectionsSyncService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Lấy danh sách tất cả cuộc bỏ phiếu" })
  @ApiOkResponse({ type: [ElectionResponseDto] })
  async findAll() {
    return this.electionsService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Lấy chi tiết một cuộc bỏ phiếu" })
  @ApiParam({ name: "id", example: 0, description: "Contract election id" })
  @ApiOkResponse({ type: ElectionDetailResponseDto })
  async findOne(@Param("id", ParseIntPipe) id: number) {
    return this.electionsService.findOneByContractElectionId(id);
  }

  @Get(":id/results")
  @ApiOperation({ summary: "Lấy kết quả cuộc bỏ phiếu" })
  @ApiParam({ name: "id", example: 0, description: "Contract election id" })
  @ApiOkResponse({ type: ElectionResultsResponseDto })
  async getResults(@Param("id", ParseIntPipe) id: number) {
    return this.electionsService.getResults(id);
  }

  @Post("sync")
  @ApiOperation({ summary: "Sync dữ liệu từ blockchain vào database" })
  @ApiOkResponse({ type: SyncResponseDto })
  async syncNow(): Promise<SyncResponseDto> {
    await this.electionsSyncService.syncAll();
    return {
      success: true,
      message: "Sync completed",
    };
  }
}
