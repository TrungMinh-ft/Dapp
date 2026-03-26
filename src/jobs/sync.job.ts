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

run().catch((error: unknown) => {
  console.error(formatSyncError(error));
  process.exit(1);
});

function formatSyncError(error: unknown) {
  const rpcIssue = findRpcConnectionIssue(error);

  if (!rpcIssue) {
    return error;
  }

  const endpoint = rpcIssue.address
    ? `${rpcIssue.address}:${rpcIssue.port ?? "unknown"}`
    : "unknown endpoint";

  return `Cannot reach Sapphire RPC (${rpcIssue.code ?? "UNKNOWN"} to ${endpoint}). ` +
    "This is a network access problem, not a contract ABI problem.";
}

function findRpcConnectionIssue(error: unknown): RpcConnectionIssue | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  if ("errors" in error && Array.isArray((error as { errors?: unknown[] }).errors)) {
    for (const nestedError of (error as { errors: unknown[] }).errors) {
      const found = findRpcConnectionIssue(nestedError);
      if (found) {
        return found;
      }
    }
  }

  if ("code" in error && typeof (error as RpcConnectionIssue).code === "string") {
    const networkError = error as RpcConnectionIssue;
    if (["EACCES", "ECONNREFUSED", "ENETUNREACH", "ETIMEDOUT"].includes(networkError.code ?? "")) {
      return networkError;
    }
  }

  if ("cause" in error) {
    return findRpcConnectionIssue((error as { cause?: unknown }).cause);
  }

  return null;
}

type RpcConnectionIssue = NodeJS.ErrnoException & {
  address?: string;
  port?: number;
};
