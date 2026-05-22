import { Module } from "@nestjs/common";
import { BlockchainModule } from "../../blockchain/blockchain.module";
import { VotesController } from "./votes.controller";
import { VotesService } from "./votes.service";

@Module({
  imports: [BlockchainModule],
  controllers: [VotesController],
  providers: [VotesService],
})
export class VotesModule {}
