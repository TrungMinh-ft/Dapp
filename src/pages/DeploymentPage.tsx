import { BrowserProvider, Contract } from "ethers";
import {
  Ban,
  Plus,
  RefreshCcw,
  Rocket,
  Shield,
  Trash2,
  UserRoundCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { privateVotingAbi } from "../lib/privateVotingAbi";
import type { AdminActionLog, AdminAuth, AuthorizedVoter, ElectionCard } from "../types";
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
  if (!window.ethereum) {
    throw new Error("MetaMask or a compatible wallet is required.");
  }

  if (!CONTRACT_ADDRESS) {
    throw new Error("Missing VITE_CONTRACT_ADDRESS in the frontend environment.");
  }

  const currentChainId = (await window.ethereum.request({
    method: "eth_chainId",
  })) as string;

  if (currentChainId !== SAPPHIRE_TESTNET_CHAIN_ID) {
    throw new Error(
      "Switch your wallet to Oasis Sapphire Testnet (chainId 0x5aff) before using admin actions.",
    );
  }

  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new Contract(CONTRACT_ADDRESS, privateVotingAbi, signer);
}

function isValidCreateForm(params: {
  title: string;
  startAt: string;
  endAt: string;
  options: string[];
}) {
  const sanitizedTitle = params.title.trim();
  const sanitizedOptions = params.options.map((item) => item.trim()).filter(Boolean);

  if (!sanitizedTitle) {
    return "Proposal title is required.";
  }

  if (!params.startAt || !params.endAt) {
    return "Choose both start and end time.";
  }

  const startTime = toUnixTimestamp(params.startAt);
  const endTime = toUnixTimestamp(params.endAt);

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return "Invalid start or end time.";
  }

  if (endTime <= startTime) {
    return "End time must be later than start time.";
  }

  if (sanitizedOptions.length < 2) {
    return "At least two non-empty options are required.";
  }

  return null;
}

export function DeploymentPage() {
  const { walletAddress, connectWallet, isConnecting, signMessage } = useWallet();
  const [adminToken, setAdminToken] = useState("");
  const [proposalCode, setProposalCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [options, setOptions] = useState(["Approve", "Reject"]);
  const [isEncrypted, setIsEncrypted] = useState(true);
  const [targetElectionId, setTargetElectionId] = useState("");
  const [whitelistInput, setWhitelistInput] = useState("");
  const [authorizedVoters, setAuthorizedVoters] = useState<AuthorizedVoter[]>([]);
  const [elections, setElections] = useState<ElectionCard[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminActionLog[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const parsedWallets = useMemo(
    () => parseWalletList(whitelistInput),
    [whitelistInput],
  );
  const adminAuth = useMemo<AdminAuth>(
    () => ({
      walletAddress,
      signMessage,
      legacyToken: adminToken.trim() || undefined,
    }),
    [adminToken, signMessage, walletAddress],
  );

  async function refreshElections() {
    const rows = await api.getAllElections();
    setElections(rows);
    return rows;
  }

  async function refreshLogs() {
    if (!walletAddress && !adminToken.trim()) {
      setAdminLogs([]);
      return;
    }

    const rows = await api.getAdminLogs(adminAuth);
    setAdminLogs(rows);
  }

  useEffect(() => {
    void refreshElections();
  }, []);

  useEffect(() => {
    if (!walletAddress && !adminToken.trim()) {
      setAdminLogs([]);
      return;
    }

    void refreshLogs();
  }, [adminToken, walletAddress]);

  function updateOption(index: number, value: string) {
    setOptions((current) =>
      current.map((option, currentIndex) =>
        currentIndex === index ? value : option,
      ),
    );
  }

  function addOption() {
    setOptions((current) => [...current, `Option ${current.length + 1}`]);
  }

  function removeOption(index: number) {
    setOptions((current) =>
      current.length <= 2
        ? current
        : current.filter((_, currentIndex) => currentIndex !== index),
    );
  }

  async function ensureWallet() {
    if (walletAddress) {
      return walletAddress;
    }

    await connectWallet();
    const accounts = await window.ethereum?.request({
      method: "eth_accounts",
    });
    const nextAddress = Array.isArray(accounts)
      ? String(accounts[0] ?? "")
      : "";

    if (!nextAddress) {
      throw new Error("No wallet account is connected.");
    }

    return nextAddress;
  }

  async function maybeRefreshBackendState(electionId?: number) {
    await refreshElections();
    if (walletAddress || adminToken.trim()) {
      await refreshLogs();
      if (electionId !== undefined) {
        const rows = await api.getAuthorizedVoters(electionId, adminAuth);
        setAuthorizedVoters(rows);
      }
    }
  }

  async function logAdminAction(action: string, electionId?: number, details?: string) {
    if (!walletAddress && !adminToken.trim()) {
      return;
    }

    await api.createAdminLog(adminAuth, {
      action,
      electionId,
      details,
    });
  }

  async function createElection() {
    const validationError = isValidCreateForm({
      title,
      startAt,
      endAt,
      options,
    });

    if (validationError) {
      setStatusMessage(validationError);
      return;
    }

    const sanitizedOptions = options.map((option) => option.trim()).filter(Boolean);

    setIsBusy(true);
    setStatusMessage("Preparing election creation transaction...");

    try {
      await ensureWallet();
      const contract = await getSignerContract();
      const tx = await contract.createElection(
        title.trim(),
        sanitizedOptions,
        toUnixTimestamp(startAt),
        toUnixTimestamp(endAt),
        !isEncrypted,
      );

      setStatusMessage(`Create transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();

      let createdElectionId: number | null = null;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed?.name === "ElectionCreated") {
            createdElectionId = Number(parsed.args.electionId);
            break;
          }
        } catch {
          // Ignore unrelated logs.
        }
      }

      if (walletAddress || adminToken.trim()) {
        await api.syncAllElections(adminAuth);
        if (createdElectionId !== null && (proposalCode.trim() || description.trim())) {
          await api.updateElectionMetadata(
            createdElectionId,
            adminAuth,
            {
              proposalCode: proposalCode.trim(),
              description: description.trim(),
            },
          );
        }
      }

      await logAdminAction(
        "CREATE_ELECTION",
        createdElectionId ?? undefined,
        `tx=${tx.hash}, privacy=${isEncrypted ? "ENCRYPTED" : "PUBLIC"}`,
      );

      if (createdElectionId !== null) {
        setTargetElectionId(String(createdElectionId));
      }

      await maybeRefreshBackendState(createdElectionId ?? undefined);
      setStatusMessage(
        createdElectionId === null
          ? "Election created successfully."
          : `Election ${createdElectionId} created successfully.`,
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Election creation failed.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function syncElection() {
    if (!targetElectionId.trim()) {
      setStatusMessage("Enter an election id to sync.");
      return;
    }

    if (!walletAddress && !adminToken.trim()) {
      setStatusMessage("Connect an admin wallet or enter a legacy ADMIN_TOKEN first.");
      return;
    }

    setIsBusy(true);
    try {
      const targetId = Number(targetElectionId);
      const result = await api.syncElection(targetElectionId.trim(), adminAuth);
      await maybeRefreshBackendState(targetId);
      setStatusMessage(result.message);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Election sync failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function syncAllElections() {
    if (!walletAddress && !adminToken.trim()) {
      setStatusMessage("Connect an admin wallet or enter a legacy ADMIN_TOKEN first.");
      return;
    }

    setIsBusy(true);
    try {
      const result = await api.syncAllElections(adminAuth);
      await maybeRefreshBackendState();
      setStatusMessage(result.message);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Global sync failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function authorizeVoters() {
    if (!targetElectionId.trim()) {
      setStatusMessage("Enter an election id before updating the whitelist.");
      return;
    }

    if (parsedWallets.length === 0) {
      setStatusMessage("Paste at least one wallet address.");
      return;
    }

    setIsBusy(true);
    setStatusMessage("Sending whitelist transaction...");

    try {
      await ensureWallet();
      const contract = await getSignerContract();
      const targetId = Number(targetElectionId);
      const tx = await contract.authorizeManyVoters(targetId, parsedWallets);
      await tx.wait();

      if (walletAddress || adminToken.trim()) {
        await api.syncElection(targetId, adminAuth);
      }

      await logAdminAction(
        "AUTHORIZE_VOTERS",
        targetId,
        `count=${parsedWallets.length}, tx=${tx.hash}`,
      );
      await maybeRefreshBackendState(targetId);
      setStatusMessage(`Authorized ${parsedWallets.length} voter(s) successfully.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Whitelist update failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function revokeVoter(wallet: string) {
    if (!targetElectionId.trim()) {
      setStatusMessage("Enter an election id before revoking voters.");
      return;
    }

    setIsBusy(true);
    setStatusMessage(`Revoking ${wallet}...`);

    try {
      await ensureWallet();
      const contract = await getSignerContract();
      const targetId = Number(targetElectionId);
      const tx = await contract.revokeVoter(targetId, wallet);
      await tx.wait();

      if (walletAddress || adminToken.trim()) {
        await api.syncElection(targetId, adminAuth);
      }

      await logAdminAction(
        "REVOKE_VOTER",
        targetId,
        `wallet=${wallet}, tx=${tx.hash}`,
      );
      await maybeRefreshBackendState(targetId);
      setStatusMessage(`Revoked ${wallet} successfully.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Voter revoke failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function closeElection() {
    if (!targetElectionId.trim()) {
      setStatusMessage("Enter an election id before closing it.");
      return;
    }

    setIsBusy(true);
    setStatusMessage("Sending close election transaction...");

    try {
      await ensureWallet();
      const contract = await getSignerContract();
      const targetId = Number(targetElectionId);
      const tx = await contract.closeElection(targetId);
      await tx.wait();

      if (walletAddress || adminToken.trim()) {
        await api.syncElection(targetId, adminAuth);
      }

      await logAdminAction(
        "CLOSE_ELECTION",
        targetId,
        `tx=${tx.hash}`,
      );
      await maybeRefreshBackendState(targetId);
      setStatusMessage(`Election ${targetElectionId} closed successfully.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Close election failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function loadAuthorizedVoters() {
    if (!targetElectionId.trim()) {
      setStatusMessage("Enter an election id to inspect its whitelist.");
      return;
    }

    if (!walletAddress && !adminToken.trim()) {
      setStatusMessage("Connect an admin wallet or enter a legacy ADMIN_TOKEN first.");
      return;
    }

    setIsBusy(true);
    try {
      const rows = await api.getAuthorizedVoters(targetElectionId.trim(), adminAuth);
      setAuthorizedVoters(rows);
      await refreshLogs();
      setStatusMessage(`Loaded ${rows.length} authorized voter(s).`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to load authorized voters.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-16">
      <div className="panel flex flex-col gap-3 px-6 py-5 font-heading text-xs uppercase tracking-[0.26em] text-copy lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3 text-accent">
          <Shield className="h-4 w-4" />
          Admin Console: Sapphire Testnet
        </div>
        <div>
          Wallet: {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : isConnecting ? "Connecting..." : "Disconnected"}
        </div>
      </div>

      <div className="mt-10">
        <h1 className="font-heading text-4xl uppercase tracking-[0.18em] text-white lg:text-5xl">
          Election Admin Dashboard
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-copy">
          Use the connected wallet for contract admin actions. Backend admin APIs now prefer signed wallet requests; `ADMIN_TOKEN` is only a legacy fallback for controlled dev environments.
        </p>
      </div>

      <div className="panel mt-10 p-6">
        <label className="field-group">
          <span>Backend Admin Token</span>
          <input
            type="password"
            className="field-input"
            placeholder="Paste ADMIN_TOKEN to use backend admin APIs"
            value={adminToken}
            onChange={(event) => setAdminToken(event.target.value)}
          />
        </label>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="panel p-8">
          <div className="space-y-6">
            <label className="field-group">
              <span>Proposal Code</span>
              <input
                type="text"
                placeholder="Stored off-chain for admin reference"
                className="field-input"
                value={proposalCode}
                onChange={(event) => setProposalCode(event.target.value)}
              />
            </label>

            <label className="field-group">
              <span>Proposal Title</span>
              <input
                type="text"
                placeholder="Stored on-chain as Election.title"
                className="field-input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>

            <label className="field-group">
              <span>Description</span>
              <textarea
                rows={5}
                placeholder="Stored off-chain in the backend after sync/manual curation"
                className="field-input resize-none"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>

            <div className="grid gap-4 lg:grid-cols-2">
              <label className="field-group">
                <span>Start Time</span>
                <input
                  type="datetime-local"
                  className="field-input"
                  value={startAt}
                  onChange={(event) => setStartAt(event.target.value)}
                />
              </label>
              <label className="field-group">
                <span>End Time</span>
                <input
                  type="datetime-local"
                  className="field-input"
                  value={endAt}
                  onChange={(event) => setEndAt(event.target.value)}
                />
              </label>
            </div>

            <div className="field-group">
              <span>Options</span>
              <div className="grid gap-3">
                {options.map((option, index) => (
                  <div key={`${index}-${option}`} className="flex gap-3">
                    <input
                      type="text"
                      value={option}
                      onChange={(event) => updateOption(index, event.target.value)}
                      className="field-input"
                    />
                    <button
                      className="rounded-2xl border border-white/10 px-4 text-copy transition hover:border-red-300/40 hover:text-red-300"
                      onClick={() => removeOption(index)}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="cyber-button mt-4 inline-flex w-fit items-center gap-2 px-4 py-3 text-xs font-heading uppercase tracking-[0.24em]"
                onClick={addOption}
                type="button"
              >
                <Plus className="h-4 w-4" />
                Add Option
              </button>
            </div>

            <div className="field-group">
              <span>Privacy Level</span>
              <div className="panel flex items-center justify-between gap-4 bg-[rgba(123,47,255,0.08)] px-5 py-4">
                <div>
                  <p className="font-heading text-sm uppercase tracking-[0.22em] text-white">
                    {isEncrypted ? "ENCRYPTED / WHITELIST" : "PUBLIC"}
                  </p>
                  <p className="mt-2 text-sm text-copy">
                    Contract call will use `isPublic = {String(!isEncrypted)}`.
                  </p>
                </div>
                <button
                  className="relative h-8 w-20 rounded-full border border-accent/30 bg-accent/10"
                  onClick={() => setIsEncrypted((current) => !current)}
                  type="button"
                >
                  <span
                    className={`absolute top-1 h-6 w-10 rounded-full bg-gradient-to-r from-accent to-neon shadow-glow transition-all ${isEncrypted ? "right-1" : "left-1"}`}
                  />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <button
                className="shimmer-button inline-flex items-center gap-3 px-8 py-4 font-heading text-sm uppercase tracking-[0.26em] text-base disabled:opacity-50"
                onClick={() => void createElection()}
                disabled={isBusy}
                type="button"
              >
                Create Election
                <Rocket className="h-5 w-5" />
              </button>
              <button
                className="cyber-button inline-flex items-center gap-3 px-6 py-4 text-sm font-heading uppercase tracking-[0.24em] disabled:opacity-50"
                onClick={() => void connectWallet()}
                disabled={isBusy}
                type="button"
              >
                {walletAddress ? "Wallet Ready" : "Connect Wallet"}
              </button>
              <button
                className="cyber-button inline-flex items-center gap-3 px-6 py-4 text-sm font-heading uppercase tracking-[0.24em] disabled:opacity-50"
                onClick={() => void syncAllElections()}
                disabled={isBusy}
                type="button"
              >
                <RefreshCcw className="h-4 w-4" />
                Sync All
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-8">
          <section className="panel p-8">
            <h2 className="font-heading text-2xl uppercase tracking-[0.16em] text-white">
              Election Operations
            </h2>
            <div className="mt-6 space-y-4">
              <label className="field-group">
                <span>Target Election Id</span>
                <input
                  type="number"
                  min="0"
                  className="field-input"
                  value={targetElectionId}
                  onChange={(event) => setTargetElectionId(event.target.value)}
                />
              </label>

              <label className="field-group">
                <span>Whitelist Wallets</span>
                <textarea
                  rows={6}
                  className="field-input resize-none"
                  placeholder="Paste wallets separated by comma, space, or newline"
                  value={whitelistInput}
                  onChange={(event) => setWhitelistInput(event.target.value)}
                />
              </label>
              <p className="text-sm text-copy">Parsed wallets: {parsedWallets.length}</p>

              <div className="grid gap-3">
                <button
                  className="cyber-button inline-flex items-center justify-center gap-3 px-5 py-4 text-xs font-heading uppercase tracking-[0.24em] disabled:opacity-50"
                  onClick={() => void authorizeVoters()}
                  disabled={isBusy}
                  type="button"
                >
                  <UserRoundCheck className="h-4 w-4" />
                  Authorize Whitelist
                </button>
                <button
                  className="cyber-button inline-flex items-center justify-center gap-3 px-5 py-4 text-xs font-heading uppercase tracking-[0.24em] disabled:opacity-50"
                  onClick={() => void closeElection()}
                  disabled={isBusy}
                  type="button"
                >
                  Close Election
                </button>
                <button
                  className="cyber-button inline-flex items-center justify-center gap-3 px-5 py-4 text-xs font-heading uppercase tracking-[0.24em] disabled:opacity-50"
                  onClick={() => void syncElection()}
                  disabled={isBusy}
                  type="button"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Sync Election
                </button>
                <button
                  className="cyber-button inline-flex items-center justify-center gap-3 px-5 py-4 text-xs font-heading uppercase tracking-[0.24em] disabled:opacity-50"
                  onClick={() => void loadAuthorizedVoters()}
                  disabled={isBusy}
                  type="button"
                >
                  Load Synced Whitelist
                </button>
              </div>
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="border-b border-[rgba(0,229,255,0.18)] px-6 py-5 font-heading text-sm uppercase tracking-[0.24em] text-accent">
              Existing Elections
            </div>
            <div className="max-h-[280px] overflow-auto px-6 py-5 text-sm text-copy">
              {elections.length === 0 ? (
                <p>No synced elections loaded yet.</p>
              ) : (
                elections.map((election) => (
                  <button
                    key={election.contractElectionId}
                    type="button"
                    onClick={() => {
                      setTargetElectionId(String(election.contractElectionId));
                      setProposalCode(election.proposalCode);
                      setTitle(election.title);
                      setDescription(election.description);
                    }}
                    className="mb-4 block w-full rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-left transition hover:border-accent/40"
                  >
                    <p className="font-heading text-sm uppercase tracking-[0.18em] text-white">
                      #{election.contractElectionId} {election.proposalCode}
                    </p>
                    <p className="mt-2">{election.title}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-copy">
                      {election.displayStatus} / {election.badgeLabel}
                    </p>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="border-b border-[rgba(0,229,255,0.18)] px-6 py-5 font-heading text-sm uppercase tracking-[0.24em] text-accent">
              Synced Authorized Voters
            </div>
            <div className="max-h-[360px] overflow-auto px-6 py-5 text-sm text-copy">
              {authorizedVoters.length === 0 ? (
                <p>No synced whitelist entries loaded yet.</p>
              ) : (
                authorizedVoters.map((row) => (
                  <div
                    key={row.wallet}
                    className="mb-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4"
                  >
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-white">
                      {row.wallet}
                    </p>
                    <p className="mt-2">Last update: {formatDate(row.updatedAt)}</p>
                    <p className="mt-1">
                      Tx: {row.lastTxHash ? `${row.lastTxHash.slice(0, 10)}...${row.lastTxHash.slice(-8)}` : "n/a"}
                    </p>
                    <button
                      type="button"
                      className="cyber-button mt-3 inline-flex items-center gap-2 px-4 py-2 text-[11px] font-heading uppercase tracking-[0.22em] disabled:opacity-50"
                      disabled={isBusy}
                      onClick={() => void revokeVoter(row.wallet)}
                    >
                      <Ban className="h-4 w-4" />
                      Revoke
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="border-b border-[rgba(0,229,255,0.18)] px-6 py-5 font-heading text-sm uppercase tracking-[0.24em] text-accent">
              Admin Audit Log
            </div>
            <div className="max-h-[280px] overflow-auto px-6 py-5 text-sm text-copy">
              {adminLogs.length === 0 ? (
                <p>No backend admin logs loaded yet.</p>
              ) : (
                adminLogs.map((log) => (
                  <div
                    key={log.id}
                    className="mb-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4"
                  >
                    <p className="font-heading text-xs uppercase tracking-[0.18em] text-white">
                      {log.action}
                      {log.electionId !== null ? ` / election #${log.electionId}` : ""}
                    </p>
                    <p className="mt-2">{formatDate(log.createdAt)}</p>
                    <p className="mt-1 text-xs text-copy">{log.details ?? "No extra details"}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>

      {statusMessage ? (
        <div className="panel mt-8 px-6 py-5 text-sm text-copy">
          {statusMessage}
        </div>
      ) : null}
    </div>
  );
}
