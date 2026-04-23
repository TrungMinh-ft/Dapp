import { BrowserProvider, Contract } from "ethers";
import {
  Ban,
  Plus,
  RefreshCcw,
  Rocket,
  Shield,
  Trash2,
  UserRoundCheck,
  KeyRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { privateVotingAbi } from "../lib/privateVotingAbi";
import type {
  AdminActionLog,
  AdminAuth,
  AuthorizedVoter,
  ElectionCard,
} from "../types";
import { useWallet } from "../wallet";

const CONTRACT_ADDRESS =
  (import.meta.env.VITE_CONTRACT_ADDRESS as string | undefined) ?? "";
const SAPPHIRE_TESTNET_CHAIN_ID = "0x5aff";

function toUnixTimestamp(value: string) {
  return Math.floor(new Date(value).getTime() / 1000);
}
function formatDate(value: string) {
  return new Date(value).toLocaleString();
}
function parseWalletList(value: string) {
  return value
    .split(/[\n,\r\t; ]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function getSignerContract() {
  if (!window.ethereum)
    throw new Error("MetaMask or a compatible wallet is required.");
  const provider = new BrowserProvider(window.ethereum as any);
  const signer = await provider.getSigner();
  return new Contract(CONTRACT_ADDRESS, privateVotingAbi, signer);
}

export function DeploymentPage() {
  const { walletAddress, connectWallet, isConnecting, signMessage } =
    useWallet();

  // --- FIX 1: Tách biệt Input và Active Token ---
  const [adminTokenInput, setAdminTokenInput] = useState("");
  const [activeAdminToken, setActiveAdminToken] = useState("");

  const [proposalCode, setProposalCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [options, setOptions] = useState(["Approve", "Reject"]);
  const [isEncrypted, setIsEncrypted] = useState(true);
  const [targetElectionId, setTargetElectionId] = useState("");
  const [whitelistInput, setWhitelistInput] = useState("");
  const [authorizedVoters, setAuthorizedVoters] = useState<AuthorizedVoter[]>(
    [],
  );
  const [elections, setElections] = useState<ElectionCard[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminActionLog[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const parsedWallets = useMemo(
    () => parseWalletList(whitelistInput),
    [whitelistInput],
  );

  // Dùng activeAdminToken ở đây
  const adminAuth = useMemo<AdminAuth>(
    () => ({
      walletAddress,
      signMessage,
      legacyToken: activeAdminToken.trim() || undefined,
    }),
    [activeAdminToken, signMessage, walletAddress],
  );

  async function refreshElections() {
    const rows = await api.getAllElections();
    setElections(rows);
    return rows;
  }

  async function refreshLogs() {
    if (!walletAddress && !activeAdminToken.trim()) return setAdminLogs([]);
    try {
      const rows = await api.getAdminLogs(adminAuth);
      setAdminLogs(rows);
    } catch (e) {
      console.error("Logs error", e);
    }
  }

  useEffect(() => {
    void refreshElections();
  }, []);

  // --- FIX 2: Chỉ refresh logs khi token đã được "Apply" hoặc ví thay đổi ---
  useEffect(() => {
    if (walletAddress || activeAdminToken.trim()) {
      void refreshLogs();
    }
  }, [activeAdminToken, walletAddress]);

  const handleApplyToken = () => {
    setActiveAdminToken(adminTokenInput);
    setStatusMessage("Admin token applied. Loading logs...");
  };

  // ... (Các hàm updateOption, addOption, removeOption giữ nguyên) ...
  function updateOption(index: number, value: string) {
    setOptions((c) => c.map((o, i) => (i === index ? value : o)));
  }
  function addOption() {
    setOptions((c) => [...c, `Option ${c.length + 1}`]);
  }
  function removeOption(index: number) {
    setOptions((c) => (c.length <= 2 ? c : c.filter((_, i) => i !== index)));
  }

  async function createElection() {
    setIsBusy(true);
    setStatusMessage("Creating election on blockchain...");
    try {
      const contract = await getSignerContract();
      const tx = await contract.createElection(
        title.trim(),
        options.filter(Boolean),
        toUnixTimestamp(startAt),
        toUnixTimestamp(endAt),
        !isEncrypted,
      );
      await tx.wait();
      setStatusMessage("Blockchain Success! Syncing to Neon DB...");
      await api.syncAllElections(adminAuth);
      await refreshElections();
      setStatusMessage("All Done! Election created and synced.");
    } catch (error: any) {
      setStatusMessage("Error: " + error.message);
    } finally {
      setIsBusy(false);
    }
  }

  // --- JSX GIAO DIỆN ---
  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-16 text-white">
      <div className="panel flex flex-col gap-3 px-6 py-5 font-heading text-xs uppercase tracking-[0.2em] border-white/10 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3 text-accent">
          <Shield className="h-4 w-4" /> Admin Console
        </div>
        <div>
          Wallet:{" "}
          <span className="font-mono">
            {walletAddress
              ? `${walletAddress.slice(0, 10)}...`
              : "Not Connected"}
          </span>
        </div>
      </div>

      <div className="mt-10 mb-10">
        <h1 className="text-4xl font-heading uppercase tracking-widest">
          Admin Dashboard
        </h1>
      </div>

      {/* FIX 3: Giao diện nhập Token có nút bấm */}
      <div className="panel p-6 mb-10 border-purple-500/30 bg-purple-500/5">
        <label className="text-xs uppercase tracking-widest opacity-60 mb-4 block">
          Backend Admin Access
        </label>
        <div className="flex gap-4">
          <input
            type="password"
            className="flex-1 bg-black/40 border border-white/10 p-4 rounded-xl outline-none focus:border-purple-500"
            placeholder="Paste your ADMIN_TOKEN here..."
            value={adminTokenInput}
            onChange={(e) => setAdminTokenInput(e.target.value)}
          />
          <button
            onClick={handleApplyToken}
            className="bg-purple-600 hover:bg-purple-500 px-8 rounded-xl font-bold uppercase text-xs flex items-center gap-2"
          >
            <KeyRound className="h-4 w-4" /> Apply
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="panel p-8 border-white/5 space-y-6">
          <input
            type="text"
            placeholder="Title"
            className="w-full bg-black/40 border border-white/10 p-4 rounded-xl"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            placeholder="Description"
            rows={4}
            className="w-full bg-black/40 border border-white/10 p-4 rounded-xl"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <input
              type="datetime-local"
              className="bg-black/40 border border-white/10 p-4 rounded-xl"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />
            <input
              type="datetime-local"
              className="bg-black/40 border border-white/10 p-4 rounded-xl"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
            />
          </div>
          <button
            onClick={createElection}
            disabled={isBusy}
            className="shimmer-button w-full p-5 rounded-2xl font-heading uppercase tracking-widest"
          >
            {isBusy ? "Processing..." : "Launch Election"}
          </button>
        </section>

        <aside className="space-y-6">
          <section className="panel p-6 border-cyan-500/20">
            <h3 className="text-cyan-400 font-heading text-sm mb-4 uppercase">
              System Sync
            </h3>
            <button
              onClick={() => api.syncAllElections(adminAuth)}
              className="w-full bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/10 flex items-center justify-center gap-3"
            >
              <RefreshCcw className="h-4 w-4" /> Sync Neon DB with Chain
            </button>
          </section>

          <section className="panel p-6 border-white/5 h-[400px] overflow-y-auto">
            <h3 className="opacity-40 font-heading text-xs mb-4 uppercase">
              Elections Log
            </h3>
            {elections.map((e) => (
              <div
                key={e.id}
                className="p-4 bg-white/5 rounded-xl mb-3 border border-white/5 text-xs"
              >
                <p className="font-bold text-accent">
                  #{e.contractElectionId} {e.title}
                </p>
                <p className="opacity-50 mt-1">Status: {e.displayStatus}</p>
              </div>
            ))}
          </section>
        </aside>
      </div>

      {statusMessage && (
        <div className="mt-8 p-4 bg-accent/10 border border-accent/20 text-accent text-sm italic rounded-xl animate-pulse">
          {statusMessage}
        </div>
      )}
    </div>
  );
}
