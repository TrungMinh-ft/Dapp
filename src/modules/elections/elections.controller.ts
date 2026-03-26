import {
  Controller,
  Body,
  Get,
  Patch,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { AdminTokenGuard } from "../../common/guards/admin-token.guard";
import { AdminActionLogResponseDto } from "./dto/admin-action-log-response.dto";
import { AuthorizedVoterResponseDto } from "./dto/authorized-voter-response.dto";
import { CreateAdminActionLogDto } from "./dto/create-admin-action-log.dto";
import { ElectionsService } from "./elections.service";
import { ElectionsSyncService } from "./elections.sync.service";
import { ElectionDetailResponseDto } from "./dto/election-detail-response.dto";
import { ElectionResponseDto } from "./dto/election-response.dto";
import { ElectionResultsResponseDto } from "./dto/election-results-response.dto";
import { SyncResponseDto } from "./dto/sync-response.dto";
import { UpdateElectionAdminDto } from "./dto/update-election-admin.dto";

@ApiTags("Elections")
@Controller("elections")
export class ElectionsController {
  constructor(
    private readonly electionsService: ElectionsService,
    private readonly electionsSyncService: ElectionsSyncService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Lay danh sach tat ca cac election" })
  @ApiOkResponse({ type: [ElectionResponseDto] })
  async findAll() {
    return this.electionsService.findAll();
  }

  @Get("active")
  @ApiOperation({ summary: "Lay danh sach election dang hoat dong" })
  @ApiOkResponse({ type: [ElectionResponseDto] })
  async findActive() {
    return this.electionsService.findActive();
  }

  @Get("finished")
  @ApiOperation({ summary: "Lay danh sach election da ket thuc" })
  @ApiOkResponse({ type: [ElectionResponseDto] })
  async findFinished() {
    return this.electionsService.findFinished();
  }

  @Get("admin/logs")
  @ApiOperation({ summary: "Lay audit log cac thao tac admin" })
  @ApiOkResponse({ type: [AdminActionLogResponseDto] })
  @UseGuards(AdminTokenGuard)
  async getAdminLogs() {
    return this.electionsService.listAdminActionLogs();
  }

  @Post("admin/logs")
  @ApiOperation({ summary: "Ghi them mot admin action log" })
  @ApiOkResponse({ type: AdminActionLogResponseDto })
  @UseGuards(AdminTokenGuard)
  async createAdminLog(@Body() body: CreateAdminActionLogDto) {
    await this.electionsService.logAdminAction(
      body.action,
      body.electionId,
      body.details,
    );

    const [latestLog] = await this.electionsService.listAdminActionLogs(1);
    return latestLog;
  }

  @Get(":id")
  @ApiOperation({ summary: "Lay chi tiet mot election" })
  @ApiParam({ name: "id", example: 0, description: "Contract election id" })
  @ApiOkResponse({ type: ElectionDetailResponseDto })
  async findOne(@Param("id", ParseIntPipe) id: number) {
    return this.electionsService.findOneByContractElectionId(id);
  }

  @Get(":id/results")
  @ApiOperation({ summary: "Lay ket qua election" })
  @ApiParam({ name: "id", example: 0, description: "Contract election id" })
  @ApiOkResponse({ type: ElectionResultsResponseDto })
  async getResults(@Param("id", ParseIntPipe) id: number) {
    return this.electionsService.getResults(id);
  }

  @Post("sync")
  @ApiOperation({ summary: "Sync du lieu tu blockchain vao database" })
  @ApiOkResponse({ type: SyncResponseDto })
  @UseGuards(AdminTokenGuard)
  async syncNow(): Promise<SyncResponseDto> {
    await this.electionsSyncService.syncAll();
    await this.electionsService.logAdminAction("SYNC_ALL");
    return {
      success: true,
      message: "Sync completed",
    };
  }

  @Post(":id/sync")
  @ApiOperation({ summary: "Sync mot election cu the tu blockchain vao database" })
  @ApiParam({ name: "id", example: 0, description: "Contract election id" })
  @ApiOkResponse({ type: SyncResponseDto })
  @UseGuards(AdminTokenGuard)
  async syncOne(@Param("id", ParseIntPipe) id: number): Promise<SyncResponseDto> {
    const progress = await this.electionsSyncService.syncElectionEvents(id);
    await this.electionsService.logAdminAction("SYNC_ELECTION", id);
    return {
      success: true,
      message: progress.completed
        ? `Election ${id} synced with events`
        : `Election ${id} sync advanced to block ${progress.nextBlock! - 1}`,
    };
  }

  @Post(":id/sync-events")
  @ApiOperation({ summary: "Sync vote events va whitelist cua mot election" })
  @ApiParam({ name: "id", example: 0, description: "Contract election id" })
  @ApiOkResponse({ type: SyncResponseDto })
  @UseGuards(AdminTokenGuard)
  async syncOneEvents(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<SyncResponseDto> {
    const progress = await this.electionsSyncService.syncElectionEvents(id);
    await this.electionsService.logAdminAction("SYNC_ELECTION_EVENTS", id);
    return {
      success: true,
      message: progress.completed
        ? `Election ${id} events synced`
        : `Election ${id} event sync advanced to block ${progress.nextBlock! - 1}`,
    };
  }

  @Get(":id/authorized-voters")
  @ApiOperation({ summary: "Lay whitelist da sync cua election" })
  @ApiParam({ name: "id", example: 0, description: "Contract election id" })
  @ApiOkResponse({ type: [AuthorizedVoterResponseDto] })
  @UseGuards(AdminTokenGuard)
  async getAuthorizedVoters(@Param("id", ParseIntPipe) id: number) {
    return this.electionsService.getAuthorizedVoters(id);
  }

  @Patch(":id/admin-metadata")
  @ApiOperation({ summary: "Cap nhat metadata admin cho election" })
  @ApiParam({ name: "id", example: 0, description: "Contract election id" })
  @ApiOkResponse({ type: ElectionDetailResponseDto })
  @UseGuards(AdminTokenGuard)
  async updateAdminMetadata(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateElectionAdminDto,
  ) {
    await this.electionsService.updateAdminMetadata(id, body);
    await this.electionsService.logAdminAction(
      "UPDATE_METADATA",
      id,
      JSON.stringify({
        proposalCode: body.proposalCode ?? null,
        hasDescription: Boolean(body.description?.trim()),
      }),
    );
    return this.electionsService.findOneByContractElectionId(id);
  }
}
