import { Module } from "@nestjs/common";
import { BlockchainModule } from "../../blockchain/blockchain.module";
import { ElectionsController } from "./elections.controller";
import { ElectionsService } from "./elections.service";
import { ElectionsSyncService } from "./elections.sync.service";

@Module({
  imports: [BlockchainModule],
  controllers: [ElectionsController],
  providers: [ElectionsService, ElectionsSyncService],
  exports: [ElectionsService, ElectionsSyncService],
})
export class ElectionsModule {}
