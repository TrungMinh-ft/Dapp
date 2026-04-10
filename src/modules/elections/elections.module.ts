import { Module } from "@nestjs/common";
import { BlockchainModule } from "../../blockchain/blockchain.module";
import { AdminTokenGuard } from "../../common/guards/admin-token.guard";
import { ElectionsController } from "./elections.controller";
import { ElectionsService } from "./elections.service";
import { ElectionsSyncService } from "./elections.sync.service";

@Module({
  imports: [BlockchainModule],
  controllers: [ElectionsController],
  providers: [ElectionsService, ElectionsSyncService, AdminTokenGuard],
  exports: [ElectionsService, ElectionsSyncService],
})
export class ElectionsModule {}
