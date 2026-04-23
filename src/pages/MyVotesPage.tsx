import { ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { VoteHistoryItem } from "../types";
import { useWallet } from "../wallet";

function formatUtc(isoValue: string) {
  return new Date(isoValue).toISOString().replace("T", " ").slice(0, 22);
}

function shortenHash(value: string | null) {
  if (!value) return "pending tx";
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function shortenWallet(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getExplorerUrl(txHash: string | null) {
  if (!txHash) return null;
  return `https://explorer.oasis.io/testnet/sapphire/tx/${txHash}`;
}

export function MyVotesPage() {
  const { walletAddress, connectWallet, isConnecting } = useWallet();
  const [rows, setRows] = useState<VoteHistoryItem[]>([]);
  const [walletInput, setWalletInput] = useState("");
  const [selectedWallet, setSelectedWallet] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeWallet = useMemo(
    () => (selectedWallet || walletAddress || "").trim(),
    [selectedWallet, walletAddress],
  );

  useEffect(() => {
    if (!activeWallet) return;

    let mounted = true;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const history = await api.getVoteHistory(activeWallet);
        if (!mounted) return;
        setRows(history);
      } catch (err) {
        if (!mounted) return;
        setError(
          err instanceof Error ? err.message : "Không thể tải lịch sử vote",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [activeWallet]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-16">
      <div className="panel p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-sm uppercase tracking-[0.35em] text-copy">
              Wallet
            </p>
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
            onChange={(e) => setWalletInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSelectedWallet(walletInput.trim());
            }}
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
          Lịch sử bầu cử được xác minh trên blockchain của ví{" "}
          {activeWallet ? (
            <span className="text-accent font-mono">
              {shortenWallet(activeWallet)}
            </span>
          ) : (
            "..."
          )}
        </p>
      </div>

      {!activeWallet && (
        <div className="panel mt-10 px-8 py-10 text-lg text-copy">
          Kết nối ví hoặc nhập địa chỉ ví để xem lịch sử bầu cử.
        </div>
      )}

      {loading && (
        <div className="panel mt-10 px-8 py-10 text-lg text-copy animate-pulse">
          Đang tải lịch sử bầu cử...
        </div>
      )}

      {error && (
        <div className="panel mt-10 border-red-400/30 px-8 py-10 text-lg text-red-200">
          {error}
        </div>
      )}

      {!loading && !error && activeWallet && (
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

              <p className="font-mono text-sm text-copy">
                {formatUtc(item.createdAt)}
              </p>

              <div>
                {item.txHash ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-2 font-heading text-[11px] uppercase tracking-[0.22em] text-accent">
                    <ShieldCheck className="h-4 w-4" />
                    VERIFIED ON-CHAIN
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 font-heading text-[11px] uppercase tracking-[0.22em] text-yellow-400">
                    PENDING
                  </span>
                )}
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

          {rows.length === 0 && (
            <div className="px-6 py-12 text-center text-base text-copy">
              <p className="text-2xl mb-2 opacity-30">🗳</p>
              <p>Ví này chưa có lịch sử bầu cử nào.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
