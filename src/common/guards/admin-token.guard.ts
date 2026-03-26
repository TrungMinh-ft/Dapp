import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { isAddress, verifyMessage } from "ethers";
import { env } from "../../config/env";

type AdminRequest = {
  headers: Record<string, string | undefined>;
  ip?: string;
  method?: string;
  originalUrl?: string;
  url?: string;
};

@Injectable()
export class AdminTokenGuard implements CanActivate {
  private static readonly attemptsByIp = new Map<
    string,
    { count: number; windowStartedAt: number }
  >();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AdminRequest>();

    if (this.isLegacyTokenAuthorized(request)) {
      return true;
    }

    if (this.isWalletSignatureAuthorized(request)) {
      return true;
    }

    this.recordFailedAttempt(request.ip);
    throw new ForbiddenException("Missing or invalid admin credentials.");
  }

  private isLegacyTokenAuthorized(request: AdminRequest) {
    if (!env.allowLegacyAdminToken) {
      return false;
    }

    if (!env.adminToken) {
      return false;
    }

    const headerToken = request.headers["x-admin-token"];
    return Boolean(headerToken && headerToken === env.adminToken);
  }

  private isWalletSignatureAuthorized(request: AdminRequest) {
    if (env.adminWallets.length === 0) {
      return false;
    }

    this.assertRateLimit(request.ip);

    const address = request.headers["x-admin-address"]?.toLowerCase();
    const timestampValue = request.headers["x-admin-timestamp"];
    const signature = request.headers["x-admin-signature"];

    if (!address || !timestampValue || !signature) {
      return false;
    }

    if (!isAddress(address) || !env.adminWallets.includes(address)) {
      return false;
    }

    const timestamp = Number(timestampValue);
    if (!Number.isFinite(timestamp)) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > env.adminAuthMaxSkewSeconds) {
      return false;
    }

    const path = (request.originalUrl || request.url || "").split("?")[0] || "/";
    const method = (request.method || "GET").toUpperCase();
    const message =
      `PrivateVoting admin request\n` +
      `address:${address}\n` +
      `method:${method}\n` +
      `path:${path}\n` +
      `timestamp:${timestamp}`;

    return verifyMessage(message, signature).toLowerCase() === address;
  }

  private assertRateLimit(ip?: string) {
    const key = ip || "unknown";
    const now = Date.now();
    const current = AdminTokenGuard.attemptsByIp.get(key);

    if (!current || now - current.windowStartedAt >= env.adminRateLimitWindowMs) {
      AdminTokenGuard.attemptsByIp.set(key, { count: 0, windowStartedAt: now });
      return;
    }

    if (current.count >= env.adminRateLimitMaxAttempts) {
      throw new HttpException(
        "Too many admin authentication attempts.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private recordFailedAttempt(ip?: string) {
    const key = ip || "unknown";
    const now = Date.now();
    const current = AdminTokenGuard.attemptsByIp.get(key);

    if (!current || now - current.windowStartedAt >= env.adminRateLimitWindowMs) {
      AdminTokenGuard.attemptsByIp.set(key, { count: 1, windowStartedAt: now });
      return;
    }

    current.count += 1;
  }
}
