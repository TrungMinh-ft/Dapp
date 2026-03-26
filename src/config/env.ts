import 'dotenv/config';

function parseNumber(name: string, fallback: number) {
  const rawValue = process.env[name];
  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number(rawValue);
  if (!Number.isFinite(parsedValue)) {
    throw new Error(`Environment variable ${name} must be a valid number.`);
  }

  return parsedValue;
}

function parseBoolean(name: string, fallback = false) {
  const rawValue = process.env[name];
  if (rawValue === undefined || rawValue === "") {
    return fallback;
  }

  if (rawValue === 'true') {
    return true;
  }

  if (rawValue === 'false') {
    return false;
  }

  throw new Error(`Environment variable ${name} must be "true" or "false".`);
}

function parseCsv(name: string, fallback: string[] = []) {
  const rawValue = process.env[name];
  if (!rawValue) {
    return fallback;
  }

  return rawValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const env = {
  port: parseNumber('PORT', 3001),
  databaseUrl: process.env.DATABASE_URL || '',
  oasisRpcUrl: process.env.OASIS_RPC_URL || '',
  contractAddress: process.env.CONTRACT_ADDRESS || '',
  syncIntervalMs: parseNumber('SYNC_INTERVAL_MS', 60000),
  rpcTimeoutMs: parseNumber('RPC_TIMEOUT_MS', 30000),
  rpcPollingIntervalMs: parseNumber('RPC_POLLING_INTERVAL_MS', 4000),
  syncOnStartup: parseBoolean('SYNC_ON_STARTUP'),
  enableAutoSync: parseBoolean('ENABLE_AUTO_SYNC'),
  enableChainListeners: parseBoolean('ENABLE_CHAIN_LISTENERS'),
  corsOrigins: parseCsv('CORS_ORIGINS', [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]),
  adminWallets: parseCsv('ADMIN_WALLETS').map((wallet) => wallet.toLowerCase()),
  adminToken: process.env.ADMIN_TOKEN || '',
  allowLegacyAdminToken: parseBoolean('ALLOW_LEGACY_ADMIN_TOKEN'),
  adminAuthMaxSkewSeconds: parseNumber('ADMIN_AUTH_MAX_SKEW_SECONDS', 300),
  adminRateLimitWindowMs: parseNumber('ADMIN_RATE_LIMIT_WINDOW_MS', 60000),
  adminRateLimitMaxAttempts: parseNumber('ADMIN_RATE_LIMIT_MAX_ATTEMPTS', 20),
};
