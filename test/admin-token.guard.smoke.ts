import { strict as assert } from "node:assert";
import { Wallet } from "ethers";
import { AdminTokenGuard } from "../src/common/guards/admin-token.guard";
import { env } from "../src/config/env";

type RequestLike = {
  headers: Record<string, string | undefined>;
  ip?: string;
  method?: string;
  originalUrl?: string;
};

function makeContext(request: RequestLike) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as any;
}

async function main() {
  env.allowLegacyAdminToken = true;
  env.adminToken = "legacy-dev-token";
  env.adminWallets.splice(0, env.adminWallets.length);

  const legacyGuard = new AdminTokenGuard();
  assert.equal(
    legacyGuard.canActivate(
      makeContext({
        headers: {
          "x-admin-token": "legacy-dev-token",
        },
        method: "POST",
        originalUrl: "/elections/sync",
      }),
    ),
    true,
  );

  const adminWallet = Wallet.createRandom();
  env.adminWallets.push(adminWallet.address.toLowerCase());
  env.allowLegacyAdminToken = false;

  const timestamp = Math.floor(Date.now() / 1000);
  const path = "/elections/1/sync";
  const method = "POST";
  const nonce = "smoke-test-nonce";
  const message =
    `PrivateVoting admin request\n` +
    `address:${adminWallet.address.toLowerCase()}\n` +
    `method:${method}\n` +
    `path:${path}\n` +
    `timestamp:${timestamp}\n` +
    `nonce:${nonce}`;
  const signature = await adminWallet.signMessage(message);

  const walletGuard = new AdminTokenGuard();
  assert.equal(
    walletGuard.canActivate(
      makeContext({
        headers: {
          "x-admin-address": adminWallet.address.toLowerCase(),
          "x-admin-timestamp": String(timestamp),
          "x-admin-nonce": nonce,
          "x-admin-signature": signature,
        },
        method,
        originalUrl: path,
      }),
    ),
    true,
  );

  console.log("AdminTokenGuard smoke test passed.");
}

void main();
