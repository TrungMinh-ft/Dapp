import type {
  AdminAuth,
  AdminActionLog,
  AuthorizedVoter,
  ElectionCard,
  VoteEvent,
  VoteHistoryItem,
  VotingStatus,
} from "../types";

function resolveApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL as
    | string
    | undefined;
  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:3001`;
  }

  return "http://127.0.0.1:3001";
}

const API_BASE_URL = resolveApiBaseUrl();

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  let response: Response;

  try {
    response = await fetch(url);
  } catch {
    throw new Error(
      `Cannot reach backend at ${API_BASE_URL}. Start the backend on port 3001 or set VITE_API_BASE_URL.`,
    );
  }

  if (!response.ok) {
    throw new Error(`API ${response.status} at ${url}`);
  }

  return response.json() as Promise<T>;
}

async function fetchAdminJson<T>(
  path: string,
  adminAuth: AdminAuth,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const normalizedPath = path.split("?")[0] || "/";
  const method = (options?.method || "GET").toUpperCase();
  const headers = new Headers(options?.headers ?? {});

  headers.set("Content-Type", "application/json");

  if (adminAuth.walletAddress && adminAuth.signMessage) {
    const timestamp = Math.floor(Date.now() / 1000);
    const address = adminAuth.walletAddress.toLowerCase();
    const nonce =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${timestamp}-${Math.random().toString(16).slice(2)}`;
    const message =
      `PrivateVoting admin request\n` +
      `address:${address}\n` +
      `method:${method}\n` +
      `path:${normalizedPath}\n` +
      `timestamp:${timestamp}\n` +
      `nonce:${nonce}`;
    const signature = await adminAuth.signMessage(message);

    headers.set("x-admin-address", address);
    headers.set("x-admin-timestamp", String(timestamp));
    headers.set("x-admin-nonce", nonce);
    headers.set("x-admin-signature", signature);
  } else if (adminAuth.legacyToken) {
    headers.set("x-admin-token", adminAuth.legacyToken);
  } else {
    throw new Error(
      "Admin API requires a connected admin wallet or legacy admin token.",
    );
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Admin API ${response.status} at ${url}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getActiveElections: () => fetchJson<ElectionCard[]>("/elections/active"),
  getFinishedElections: () => fetchJson<ElectionCard[]>("/elections/finished"),
  getAllElections: () => fetchJson<ElectionCard[]>("/elections"),
  getElectionDetail: (id: string | number) =>
    fetchJson<ElectionCard>(`/elections/${id}`),
  getElectionVoteEvents: (id: string | number, wallet?: string) =>
    fetchJson<VoteEvent[]>(
      `/votes/${id}/events${wallet ? `?wallet=${encodeURIComponent(wallet)}` : ""}`,
    ),
  getVotingStatus: (id: string | number, wallet: string) =>
    fetchJson<VotingStatus>(
      `/votes/${id}/status?wallet=${encodeURIComponent(wallet)}`,
    ),

  // ✅ MỚI: Lấy toàn bộ lịch sử vote của 1 ví trong 1 request
  getVoteHistory: (wallet: string) =>
    fetchJson<VoteHistoryItem[]>(
      `/votes/history?wallet=${encodeURIComponent(wallet)}`,
    ),

  syncElection: (id: string | number, adminAuth: AdminAuth) =>
    fetchAdminJson<{ success: boolean; message: string }>(
      `/elections/${id}/sync`,
      adminAuth,
      { method: "POST" },
    ),
  syncAllElections: (adminAuth: AdminAuth) =>
    fetchAdminJson<{ success: boolean; message: string }>(
      "/elections/sync",
      adminAuth,
      { method: "POST" },
    ),
  getAuthorizedVoters: (id: string | number, adminAuth: AdminAuth) =>
    fetchAdminJson<AuthorizedVoter[]>(
      `/elections/${id}/authorized-voters`,
      adminAuth,
    ),
  getAdminLogs: (adminAuth: AdminAuth) =>
    fetchAdminJson<AdminActionLog[]>("/elections/admin/logs", adminAuth),
  createAdminLog: (
    adminAuth: AdminAuth,
    body: { action: string; electionId?: number; details?: string },
  ) =>
    fetchAdminJson<AdminActionLog>("/elections/admin/logs", adminAuth, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateElectionMetadata: (
    id: string | number,
    adminAuth: AdminAuth,
    body: { proposalCode?: string; description?: string },
  ) =>
    fetchAdminJson<ElectionCard>(`/elections/${id}/admin-metadata`, adminAuth, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};
