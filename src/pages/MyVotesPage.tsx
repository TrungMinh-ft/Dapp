import { ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useWallet } from "../wallet";

type VoteHistoryRow = {
  id: string;
  proposalCode: string;
  title: string;
  createdAt: string;
  txHash: string | null;
  voter: string;
};

function formatUtc(isoValue: string) {
  return new Date(isoValue)
    .toISOString()
    .replace("T", " ")
    .replace(".000Z", " UTC");
}

function shortenHash(value: string | null) {
  if (!value) {
    return "pending tx";
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function shortenWallet(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getExplorerUrl(txHash: string | null) {
  if (!txHash) {
    return null;
  }

  return `https://explorer.oasis.io/testnet/sapphire/tx/${txHash}`;
}

export function MyVotesPage() {
  const { walletAddress, connectWallet, isConnecting } = useWallet();
  const [rows, setRows] = useState<VoteHistoryRow[]>([]);
  const [selectedWallet, setSelectedWallet] = useState("");
  const [walletInput, setWalletInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress && !selectedWallet) {
      return;
    }

    const activeWallet = (selectedWallet || walletAddress || "").trim();
    if (!activeWallet) {
      return;
    }

    let mounted = true;
    setLoading(true);

    async function load() {
      try {
        const elections = await api.getAllElections();
        const eventResults = await Promise.all(
          elections.map(async (election) => ({
            election,
            voteEvents: await api.getElectionVoteEvents(
              election.contractElectionId,
              activeWallet,
            ),
          })),
        );

        if (!mounted) {
          return;
        }

        const flattened = eventResults
          .flatMap(({ election, voteEvents }) =>
            voteEvents.map((voteEvent) => ({
              id: `${election.contractElectionId}-${voteEvent.id}`,
              proposalCode: election.proposalCode,
              title: election.title,
              createdAt: voteEvent.createdAt,
              txHash: voteEvent.txHash,
              voter: voteEvent.voter,
            })),
          )
          .sort(
            (left, right) =>
              new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
          );

        setRows(flattened);
        setError(null);
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Failed to load vote history");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [walletAddress, selectedWallet]);

  const activeWallet = useMemo(
    () => (selectedWallet || walletAddress || "").trim(),
    [selectedWallet, walletAddress],
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-16">
      <div className="panel p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-sm uppercase tracking-[0.35em] text-copy">Wallet</p>
            <p className="mt-2 font-heading text-2xl uppercase tracking-[0.18em] text-accent">
              {activeWallet ? shortenWallet(activeWallet) : "NO WALLET FILTER"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="cyber-button px-5 py-3 text-xs font-heading uppercase tracking-[0.24em]"
              onClick={() => void connectWallet()}
            >
              {walletAddress
                ? "Use Connected Wallet"
                : isConnecting
                  ? "Connecting..."
                  : "Connect Wallet"}
            </button>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-3 lg:flex-row">
          <input
            className="field-input"
            placeholder="Or inspect a specific wallet address..."
            value={walletInput}
            onChange={(event) => setWalletInput(event.target.value)}
          />
          <button
            className="cyber-button px-5 py-3 text-xs font-heading uppercase tracking-[0.24em]"
            onClick={() => setSelectedWallet(walletInput.trim())}
          >
            Apply Wallet Filter
          </button>
        </div>
      </div>

      <div className="mt-10">
        <h1 className="font-heading text-4xl uppercase tracking-[0.18em] text-white lg:text-5xl">
          Verified Vote History
        </h1>
        <p className="mt-4 max-w-3xl text-xl text-copy">
          This page now queries backend vote events per wallet instead of loading every synced voter record into the browser.
        </p>
      </div>

      {!activeWallet ? (
        <div className="panel mt-10 px-8 py-10 text-lg text-copy">
          Connect a wallet or enter an address to inspect vote submissions.
        </div>
      ) : null}
      {loading ? (
        <div className="panel mt-10 px-8 py-10 text-lg text-copy">
          Loading synced vote events...
        </div>
      ) : null}
      {error ? (
        <div className="panel mt-10 border-red-400/30 px-8 py-10 text-lg text-red-200">
          {error}
        </div>
      ) : null}

      {!loading && !error && activeWallet ? (
        <div className="panel mt-10 overflow-hidden">
          <div className="grid grid-cols-[1.8fr_1fr_1.2fr_1.2fr] gap-4 border-b border-[rgba(0,229,255,0.18)] px-6 py-5 font-heading text-xs uppercase tracking-[0.28em] text-copy">
            <span>Proposal Name</span>
            <span>Date</span>
            <span>Status</span>
            <span>Action</span>
          </div>
          {rows.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1.8fr_1fr_1.2fr_1.2fr] items-center gap-4 border-b border-[rgba(0,229,255,0.1)] px-6 py-6 transition hover:bg-white/[0.02] hover:shadow-glow"
            >
              <div>
                <p className="text-lg font-semibold text-white">
                  {item.proposalCode} {item.title}
                </p>
                <p className="mt-1 font-mono text-xs text-copy">
                  {shortenHash(item.txHash)}
                </p>
              </div>
              <p className="font-mono text-sm text-copy">{formatUtc(item.createdAt)}</p>
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-2 font-heading text-[11px] uppercase tracking-[0.22em] text-accent">
                  <ShieldCheck className="h-4 w-4" />
                  VERIFIED ON-CHAIN
                </span>
              </div>
              {getExplorerUrl(item.txHash) ? (
                <a
                  href={getExplorerUrl(item.txHash) ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="cyber-button inline-flex px-4 py-3 text-[11px] font-heading uppercase tracking-[0.22em]"
                >
                  Verify On Oasis Explorer
                </a>
              ) : (
                <span className="inline-flex rounded-full border border-white/10 px-4 py-3 text-[11px] font-heading uppercase tracking-[0.22em] text-copy">
                  Pending Explorer Link
                </span>
              )}
            </div>
          ))}
          {rows.length === 0 ? (
            <div className="px-6 py-8 text-base text-copy">
              No synced vote events matched this wallet.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
