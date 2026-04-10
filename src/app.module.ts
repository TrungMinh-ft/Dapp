import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { ElectionsModule } from './modules/elections/elections.module';
import { VotesModule } from './modules/votes/votes.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [PrismaModule, BlockchainModule, ElectionsModule, VotesModule, HealthModule],
})
export class AppModule {}
