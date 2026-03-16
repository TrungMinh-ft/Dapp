export const env = {
  port: Number(process.env.PORT || 3001),
  databaseUrl: process.env.DATABASE_URL || '',
  oasisRpcUrl: process.env.OASIS_RPC_URL || '',
  contractAddress: process.env.CONTRACT_ADDRESS || '',
  syncIntervalMs: Number(process.env.SYNC_INTERVAL_MS || 15000),
};
