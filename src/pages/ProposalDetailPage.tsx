import { BrowserProvider, Contract } from "ethers";
import { LockKeyhole } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { privateVotingAbi } from "../lib/privateVotingAbi";
import type { ElectionCard, VotingStatus } from "../types";
import { useWallet } from "../wallet";

const CONTRACT_ADDRESS =
  (import.meta.env.VITE_CONTRACT_ADDRESS as string | undefined) ?? "";
const SAPPHIRE_TESTNET_CHAIN_ID = "0x5aff";

function formatCountdown(endTime: string) {
  const target = Number(endTime) * 1000;
  const now = Date.now();
  const diff = Math.max(0, target - now);
  const hours = Math.floor(diff / 1000 / 60 / 60);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} REMAINING`;
}

export function ProposalDetailPage() {
  const { id } = useParams();
  const { walletAddress, connectWallet } = useWallet();
  const [proposal, setProposal] = useState<ElectionCard | null>(null);
  const [countdown, setCountdown] = useState("00:00:00 REMAINING");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<VotingStatus | null>(null);
  const [submitState, setSubmitState] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("Missing proposal id");
      setLoading(false);
      return;
    }

    let mounted = true;

    async function load() {
      if (!id) {
        return;
      }

      try {
        const detail = await api.getElectionDetail(id);

        if (!mounted) {
          return;
        }

        setProposal(detail);
        setCountdown(formatCountdown(detail.endTime));
        setSelectedIndex(null);
        setError(null);
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Failed to load proposal");
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
  }, [id]);

  useEffect(() => {
    if (!proposal) {
      return;
    }

    const timer = window.setInterval(() => {
      setCountdown(formatCountdown(proposal.endTime));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [proposal]);

  useEffect(() => {
    if (!proposal || !walletAddress) {
      setStatus(null);
      return;
    }

    const currentProposal = proposal;
    const currentWallet = walletAddress;
    let mounted = true;

    async function loadStatus() {
      try {
        const nextStatus = await api.getVotingStatus(
          currentProposal.contractElectionId,
          currentWallet,
        );

        if (mounted) {
          setStatus(nextStatus);
        }
      } catch {
        if (mounted) {
          setStatus(null);
        }
      }
    }

    void loadStatus();

    return () => {
      mounted = false;
    };
  }, [proposal, walletAddress]);

  const isExpired = useMemo(
    () => (proposal ? Number(proposal.endTime) * 1000 <= Date.now() : true),
    [proposal, countdown],
  );

  async function submitVote() {
    if (!proposal) {
      return;
    }

    if (selectedIndex === null) {
      setSubmitState("Select an option before submitting.");
      return;
    }

    let currentWallet = walletAddress ?? null;

    if (!currentWallet) {
      try {
        await connectWallet();
        const accounts = await window.ethereum?.request({
          method: "eth_accounts",
        });
        currentWallet = Array.isArray(accounts)
          ? String(accounts[0] ?? "") || null
          : null;
      } catch (connectError) {
        setSubmitState(
          connectError instanceof Error
            ? connectError.message
            : "Wallet connection failed.",
        );
        return;
      }
    }

    if (!window.ethereum) {
      setSubmitState("MetaMask or a compatible wallet is required.");
      return;
    }

    if (!CONTRACT_ADDRESS) {
      setSubmitState("Missing VITE_CONTRACT_ADDRESS in the frontend environment.");
      return;
    }

    if (isExpired || proposal.isClosed) {
      setSubmitState("This election is no longer active for voting.");
      return;
    }

    let currentStatus = status;
    if (currentWallet) {
      try {
        currentStatus = await api.getVotingStatus(
          proposal.contractElectionId,
          currentWallet,
        );
        setStatus(currentStatus);
      } catch {
        currentStatus = status;
      }
    }

    if (currentStatus?.hasVoted) {
      setSubmitState("This wallet has already voted in the current election.");
      return;
    }

    if (currentStatus && !currentStatus.isAuthorized) {
      setSubmitState("This wallet is not authorized to vote in this election.");
      return;
    }

    setIsSubmitting(true);
    setSubmitState("Preparing wallet transaction...");

    try {
      const currentChainId = (await window.ethereum.request({
        method: "eth_chainId",
      })) as string;

      if (currentChainId !== SAPPHIRE_TESTNET_CHAIN_ID) {
        setSubmitState(
          "Switch your wallet to Oasis Sapphire Testnet (chainId 0x5aff) before submitting.",
        );
        return;
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(
        CONTRACT_ADDRESS,
        privateVotingAbi,
        signer,
      );

      const tx = await contract.vote(proposal.contractElectionId, selectedIndex);
      setSubmitState(`Transaction sent: ${tx.hash}`);
      await tx.wait();

      setSubmitState("Vote submitted successfully and confirmed on-chain.");
      if (currentWallet) {
        const nextStatus = await api.getVotingStatus(
          proposal.contractElectionId,
          currentWallet,
        );
        setStatus(nextStatus);
      }
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Vote submission failed.";
      setSubmitState(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-16">
        <div className="panel px-8 py-10 text-lg text-copy">Loading proposal detail...</div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-16">
        <div className="panel border-red-400/30 px-8 py-10 text-lg text-red-200">
          {error ?? "Proposal not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-16">
      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-8">
          <div>
            <p className="font-heading text-4xl uppercase tracking-[0.18em] text-white lg:text-5xl">
              Proposal Details & Private Vote
            </p>
            <div className="mt-6 inline-flex rounded-2xl border border-orange-400/30 bg-orange-500/10 px-5 py-4 font-digital text-3xl tracking-[0.3em] text-orange-300 shadow-[0_0_28px_rgba(251,146,60,0.2)]">
              {countdown}
            </div>
          </div>

          <div className="panel p-8">
            <p className="font-heading text-sm uppercase tracking-[0.24em] text-accent">
              {proposal.proposalCode} | CONTRACT ELECTION #{proposal.contractElectionId}
            </p>
            <h2 className="mt-5 font-heading text-3xl uppercase tracking-[0.16em] text-white">
              {proposal.title}
            </h2>
            <p className="mt-5 text-lg leading-8 text-copy">
              {proposal.description || "No proposal description synced yet."}
            </p>
            <div className="mt-8 grid gap-4 text-sm text-copy lg:grid-cols-3">
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <p className="font-heading text-xs uppercase tracking-[0.22em] text-white">
                  Privacy Level
                </p>
                <p className="mt-3">
                  {proposal.privacyLevel} voting using Sapphire confidential smart contracts.
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <p className="font-heading text-xs uppercase tracking-[0.22em] text-white">
                  Leading Option
                </p>
                <p className="mt-3">
                  {proposal.leadingOption ?? "N/A"} at {proposal.leadingPercentage}% of current counted votes.
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <p className="font-heading text-xs uppercase tracking-[0.22em] text-white">
                  Total Votes
                </p>
                <p className="mt-3">
                  {proposal.totalVotes} ballots recorded. Status: {proposal.displayStatus}.
                </p>
              </div>
            </div>
          </div>
        </section>

        <aside className="panel p-8">
          <h2 className="font-heading text-3xl uppercase tracking-[0.16em] text-white">
            Cast Your Private Vote
          </h2>
          <div className="mt-4 space-y-2 text-sm text-copy">
            <p>Wallet: {walletAddress ?? "Not connected"}</p>
            <p>Authorized: {status ? String(status.isAuthorized) : "Unknown"}</p>
            <p>Already voted: {status ? String(status.hasVoted) : "Unknown"}</p>
          </div>
          <div className="mt-8 space-y-4">
            {proposal.candidates.map((option) => (
              <label
                key={option.id}
                className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-[rgba(0,229,255,0.15)] bg-white/[0.02] px-5 py-4 transition hover:border-accent/40 hover:shadow-glow"
              >
                <div className="flex items-center gap-4">
                  <input
                    type="radio"
                    name="vote"
                    className="h-5 w-5 accent-[#00E5FF]"
                    checked={selectedIndex === option.index}
                    onChange={() => setSelectedIndex(option.index)}
                  />
                  <span className="font-heading text-sm uppercase tracking-[0.18em] text-white">
                    {option.name}
                  </span>
                </div>
                <span className="font-mono text-xs uppercase tracking-[0.18em] text-copy">
                  option #{option.index}
                </span>
              </label>
            ))}
          </div>

          <div className="mt-8 rounded-3xl border border-[rgba(123,47,255,0.35)] bg-[linear-gradient(135deg,rgba(123,47,255,0.2),rgba(123,47,255,0.08))] p-6 shadow-neon">
            <div className="flex items-center gap-3 text-neon">
              <LockKeyhole className="h-5 w-5" />
              <p className="font-heading text-sm uppercase tracking-[0.24em]">
                Secret Vote
              </p>
            </div>
            <p className="mt-4 text-base leading-7 text-white/80">
              Results hidden via Oasis TEE. Vote tally will be decrypted and revealed only after the election end time. Your wallet can verify submission without exposing your choice.
            </p>
          </div>

          {submitState ? (
            <p className="mt-6 text-sm text-copy">{submitState}</p>
          ) : null}

          <button
            className="shimmer-button mt-10 w-full px-8 py-5 font-heading text-sm uppercase tracking-[0.28em] text-base disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void submitVote()}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Secret Vote"}
          </button>
        </aside>
      </div>
    </div>
  );
}
