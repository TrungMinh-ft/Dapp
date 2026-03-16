import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ElectionsSyncService } from '../modules/elections/elections.sync.service';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const syncService = app.get(ElectionsSyncService);

  await syncService.syncAll();

  console.log('Sync done');
  await app.close();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
