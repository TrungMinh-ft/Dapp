import { BrowserProvider, Contract, Interface, isAddress } from "ethers";
import { KeyRound, Plus, RefreshCcw, Shield, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatStatusLabel, useI18n } from "../i18n";
import { api } from "../lib/api";
import { privateVotingAbi } from "../lib/privateVotingAbi";
import type { AdminActionLog, AdminAuth, ElectionCard } from "../types";
import { useWallet } from "../wallet";

const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS as string | undefined) ?? "";
const votingInterface = new Interface(privateVotingAbi);

function toUnixTimestamp(value: string) {
  return Math.floor(new Date(value).getTime() / 1000);
}

function parseWalletList(value: string) {
  return value
    .split(/[\n,\r\t; ]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function getSignerContract() {
  if (!window.ethereum) throw new Error("MetaMask or a compatible EVM wallet is required.");
  if (!CONTRACT_ADDRESS) throw new Error("Missing VITE_CONTRACT_ADDRESS in frontend .env.");

  const provider = new BrowserProvider(window.ethereum as any);
  const signer = await provider.getSigner();
  return new Contract(CONTRACT_ADDRESS, privateVotingAbi, signer);
}

function getCreatedElectionId(receipt: any) {
  for (const log of receipt?.logs ?? []) {
    try {
      const parsed = votingInterface.parseLog(log);
      if (parsed?.name === "ElectionCreated") {
        return Number(parsed.args.electionId);
      }
    } catch {
      // Ignore logs from other contracts.
    }
  }

  return null;
}

export function DeploymentPage() {
  const { t } = useI18n();
  const { walletAddress, connectWallet, isConnecting, signMessage } = useWallet();
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [adminTokenInput, setAdminTokenInput] = useState("");
  const [activeAdminToken, setActiveAdminToken] = useState("");
  const [proposalCode, setProposalCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [options, setOptions] = useState([t("admin.defaultYes"), t("admin.defaultNo")]);
  const [isEncrypted, setIsEncrypted] = useState(true);
  const [targetElectionId, setTargetElectionId] = useState("");
  const [whitelistInput, setWhitelistInput] = useState("");
  const [elections, setElections] = useState<ElectionCard[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminActionLog[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

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
    if (!isAdmin && !activeAdminToken.trim()) {
      setAdminLogs([]);
      return;
    }

    try {
      const rows = await api.getAdminLogs(adminAuth);
      setAdminLogs(rows);
    } catch (error) {
      console.error("Admin logs error", error);
    }
  }

  useEffect(() => {
    void refreshElections();
  }, []);

  useEffect(() => {
    let mounted = true;

    async function checkAdmin() {
      setAuthChecked(false);
      setIsAdmin(false);

      if (!walletAddress) {
        setAuthChecked(true);
        return;
      }

      try {
        const status = await api.getAuthStatus(walletAddress.toLowerCase());
        if (!mounted) return;
        setIsAdmin(status.isAdmin);
      } catch {
        if (mounted) setIsAdmin(false);
      } finally {
        if (mounted) setAuthChecked(true);
      }
    }

    void checkAdmin();
    return () => {
      mounted = false;
    };
  }, [walletAddress]);

  useEffect(() => {
    if (isAdmin || activeAdminToken.trim()) void refreshLogs();
  }, [activeAdminToken, isAdmin]);

  useEffect(() => {
    setOptions((current) => {
      const isDefaultPair =
        (current[0] === "Yes" && current[1] === "No") ||
        (current[0] === "Đồng ý" && current[1] === "Không đồng ý");
      return isDefaultPair ? [t("admin.defaultYes"), t("admin.defaultNo")] : current;
    });
  }, [t]);

  function requireAdmin() {
    if (!walletAddress) {
      setStatusMessage(t("admin.connectAdminFirst"));
      return false;
    }
    if (!isAdmin) {
      setStatusMessage(t("admin.notAdmin"));
      return false;
    }
    return true;
  }

  function updateOption(index: number, value: string) {
    setOptions((current) => current.map((option, optionIndex) => (optionIndex === index ? value : option)));
  }

  function addOption() {
    setOptions((current) => [...current, t("admin.optionFallback", { index: current.length + 1 })]);
  }

  function removeOption(index: number) {
    setOptions((current) => (current.length <= 2 ? current : current.filter((_, optionIndex) => optionIndex !== index)));
  }

  async function authorizeVoters() {
    if (!requireAdmin()) return;

    const electionId = Number(targetElectionId);
    const wallets = parseWalletList(whitelistInput);

    if (!Number.isInteger(electionId) || electionId < 0) {
      setStatusMessage(t("admin.chooseElection"));
      return;
    }
    if (wallets.length === 0 || wallets.some((wallet) => !isAddress(wallet))) {
      setStatusMessage(t("admin.invalidWallets"));
      return;
    }

    setIsBusy(true);
    setStatusMessage(t("admin.authorizing"));
    try {
      const contract = await getSignerContract();
      const tx = await contract.authorizeManyVoters(electionId, wallets);
      await tx.wait();
      setStatusMessage(t("admin.authorizedSyncing"));
      await api.syncElection(electionId, adminAuth);
      await refreshElections();
      setWhitelistInput("");
      setStatusMessage(t("admin.authorizeSuccess"));
    } catch (error: any) {
      setStatusMessage(t("admin.authorizeFailed", { error: error.shortMessage || error.message || t("common.unknown") }));
    } finally {
      setIsBusy(false);
    }
  }

  async function createElection() {
    if (!requireAdmin()) return;

    const trimmedTitle = title.trim();
    const trimmedOptions = options.map((option) => option.trim()).filter(Boolean);
    const startTime = toUnixTimestamp(startAt);
    const endTime = toUnixTimestamp(endAt);

    if (!trimmedTitle) {
      setStatusMessage(t("admin.enterTitle"));
      return;
    }
    if (trimmedOptions.length < 2) {
      setStatusMessage(t("admin.needOptions"));
      return;
    }
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
      setStatusMessage(t("admin.invalidTime"));
      return;
    }

    const metadataCode = proposalCode.trim();
    const metadataDescription = description.trim();

    setIsBusy(true);
    setStatusMessage(t("admin.createChain"));
    try {
      const contract = await getSignerContract();
      const tx = await contract.createElection(trimmedTitle, trimmedOptions, startTime, endTime, !isEncrypted);
      const receipt = await tx.wait();
      const createdElectionId = getCreatedElectionId(receipt);

      setIsBusy(false);
      setStatusMessage(t("admin.chainConfirmedSyncing"));
      setProposalCode("");
      setTitle("");
      setDescription("");
      setStartAt("");
      setEndAt("");
      setOptions([t("admin.defaultYes"), t("admin.defaultNo")]);

      void (async () => {
        try {
          if (createdElectionId !== null) {
            await api.syncElection(createdElectionId, adminAuth);
          } else {
            await api.syncAllElections(adminAuth);
          }

          const rows = await refreshElections();
          const createdElection =
            createdElectionId !== null
              ? rows.find((election) => election.contractElectionId === createdElectionId) ?? null
              : rows.reduce<ElectionCard | null>((latest, election) => {
                  if (!latest || election.contractElectionId > latest.contractElectionId) return election;
                  return latest;
                }, null);

          if (createdElection && (metadataCode || metadataDescription)) {
            await api.updateElectionMetadata(createdElection.contractElectionId, adminAuth, {
              proposalCode: metadataCode || undefined,
              description: metadataDescription || undefined,
            });
            await refreshElections();
          }

          setStatusMessage(t("admin.createSuccess"));
        } catch (syncError: any) {
          console.error("Election created but backend sync failed", syncError);
          setStatusMessage(t("admin.createSyncFailed", { error: syncError.shortMessage || syncError.message || t("common.unknown") }));
        }
      })();
    } catch (error: any) {
      setStatusMessage(t("admin.createFailed", { error: error.shortMessage || error.message || t("common.unknown") }));
      setIsBusy(false);
    }
  }

  const adminDisabled = isBusy || !isAdmin;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 text-white lg:px-10 lg:py-16">
      <div className="panel flex flex-col gap-3 border-white/10 px-6 py-5 font-heading text-xs uppercase tracking-[0.2em] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3 text-accent">
          <Shield className="h-4 w-4" /> {t("admin.board")}
        </div>
        <div>
          {t("admin.wallet")}:{" "}
          <span className="font-mono">
            {walletAddress ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-4)}` : t("vote.notConnected")}
          </span>
        </div>
      </div>

      <div className="my-10">
        <h1 className="font-heading text-4xl uppercase tracking-widest">{t("admin.title")}</h1>
        <p className="mt-3 max-w-3xl text-copy">{t("admin.subtitle")}</p>
      </div>

      {!walletAddress ? (
        <div className="panel mb-10 p-8">
          <p className="mb-5 text-copy">{t("admin.needAdminWallet")}</p>
          <button
            onClick={() => void connectWallet()}
            className="cyber-button px-8 py-4 text-xs font-heading uppercase tracking-[0.2em]"
          >
            {isConnecting ? t("wallet.connecting") : t("admin.connectAdmin")}
          </button>
        </div>
      ) : authChecked && !isAdmin ? (
        <div className="panel mb-10 border-red-400/30 bg-red-500/10 p-8">
          <p className="font-heading text-xl uppercase tracking-[0.16em] text-red-200">{t("admin.noPermissionTitle")}</p>
          <p className="mt-3 text-copy">{t("admin.noPermissionBody")}</p>
        </div>
      ) : null}

      <div className="panel mb-10 border-purple-500/30 bg-purple-500/5 p-6">
        <label className="mb-4 block text-xs uppercase tracking-widest opacity-60">{t("admin.backendAccess")}</label>
        <div className="flex flex-col gap-4 lg:flex-row">
          <input
            type="password"
            className="field-input flex-1"
            placeholder={t("admin.tokenPlaceholder")}
            value={adminTokenInput}
            onChange={(event) => setAdminTokenInput(event.target.value)}
          />
          <button
            onClick={() => {
              setActiveAdminToken(adminTokenInput);
              setStatusMessage(t("admin.tokenApplied"));
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-purple-500"
          >
            <KeyRound className="h-4 w-4" /> {t("common.apply")}
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="panel space-y-6 border-white/5 p-8">
          <input className="field-input" placeholder={t("admin.codePlaceholder")} value={proposalCode} onChange={(event) => setProposalCode(event.target.value)} />
          <input className="field-input" placeholder={t("admin.titlePlaceholder")} value={title} onChange={(event) => setTitle(event.target.value)} />
          <textarea className="field-input" placeholder={t("admin.descriptionPlaceholder")} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-heading text-xs uppercase tracking-[0.24em] text-copy">{t("admin.options")}</p>
              <button type="button" onClick={addOption} className="cyber-button inline-flex items-center gap-2 px-4 py-2 text-xs font-heading uppercase tracking-[0.18em]" disabled={adminDisabled}>
                <Plus className="h-4 w-4" /> {t("admin.add")}
              </button>
            </div>
            {options.map((option, index) => (
              <div key={index} className="flex gap-3">
                <input className="field-input" value={option} onChange={(event) => updateOption(index, event.target.value)} disabled={!isAdmin} />
                <button type="button" onClick={() => removeOption(index)} className="rounded-xl border border-red-400/30 px-4 text-red-200 transition hover:border-red-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-30" disabled={options.length <= 2 || !isAdmin} title="Remove option">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <input type="datetime-local" className="field-input" value={startAt} onChange={(event) => setStartAt(event.target.value)} disabled={!isAdmin} />
            <input type="datetime-local" className="field-input" value={endAt} onChange={(event) => setEndAt(event.target.value)} disabled={!isAdmin} />
          </div>

          <label className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 p-4">
            <span className="font-heading text-xs uppercase tracking-[0.22em] text-copy">{t("admin.privateVote")}</span>
            <input type="checkbox" checked={isEncrypted} onChange={(event) => setIsEncrypted(event.target.checked)} className="h-5 w-5 accent-accent" disabled={!isAdmin} />
          </label>

          <button onClick={() => void createElection()} disabled={adminDisabled} className="shimmer-button w-full rounded-2xl p-5 font-heading uppercase tracking-widest disabled:cursor-not-allowed disabled:opacity-30">
            {isBusy ? t("admin.processing") : t("admin.create")}
          </button>
        </section>

        <aside className="space-y-6">
          <section className="panel border-cyan-500/20 p-6">
            <h3 className="mb-4 font-heading text-sm uppercase text-cyan-400">{t("admin.authorizeTitle")}</h3>
            <select className="field-input mb-3" value={targetElectionId} onChange={(event) => setTargetElectionId(event.target.value)} disabled={!isAdmin}>
              <option value="">{t("admin.choosePrivate")}</option>
              {elections.map((election) => (
                <option key={election.contractElectionId} value={election.contractElectionId}>
                  #{election.contractElectionId} {election.title}
                </option>
              ))}
            </select>
            <textarea className="field-input mb-3" rows={4} placeholder={t("admin.walletsPlaceholder")} value={whitelistInput} onChange={(event) => setWhitelistInput(event.target.value)} disabled={!isAdmin} />
            <button onClick={() => void authorizeVoters()} disabled={adminDisabled} className="cyber-button w-full px-5 py-3 text-xs font-heading uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-30">
              {t("admin.authorizeWallets")}
            </button>
          </section>

          <section className="panel border-cyan-500/20 p-6">
            <h3 className="mb-4 font-heading text-sm uppercase text-cyan-400">{t("admin.syncTitle")}</h3>
            <button onClick={() => void api.syncAllElections(adminAuth).then(refreshElections)} disabled={adminDisabled} className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30">
              <RefreshCcw className="h-4 w-4" /> {t("admin.syncBackend")}
            </button>
          </section>

          <section className="panel h-[400px] overflow-y-auto border-white/5 p-6">
            <h3 className="mb-4 font-heading text-xs uppercase opacity-40">{t("admin.electionList")}</h3>
            {elections.map((election) => (
              <div key={election.id} className="mb-3 rounded-xl border border-white/5 bg-white/5 p-4 text-xs">
                <p className="font-bold text-accent">#{election.contractElectionId} {election.title}</p>
                <p className="mt-1 opacity-60">{t("admin.codeLabel")}: {election.proposalCode}</p>
                <p className="mt-1 opacity-50">{t("admin.statusLabel")}: {formatStatusLabel(election.displayStatus, t)}</p>
              </div>
            ))}
          </section>

          <section className="panel max-h-[260px] overflow-y-auto border-white/5 p-6">
            <h3 className="mb-4 font-heading text-xs uppercase opacity-40">{t("admin.adminLogs")}</h3>
            {adminLogs.length === 0 ? (
              <p className="text-copy">{t("admin.noLogs")}</p>
            ) : (
              adminLogs.map((log) => (
                <div key={log.id} className="mb-3 rounded-xl border border-white/5 bg-white/5 p-4 text-xs">
                  <p className="text-white">{log.action}</p>
                  {log.details && <p className="mt-1 text-copy">{log.details}</p>}
                </div>
              ))
            )}
          </section>
        </aside>
      </div>

      {statusMessage && (
        <div className="mt-8 rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm italic text-accent">
          {statusMessage}
        </div>
      )}
    </div>
  );
}
