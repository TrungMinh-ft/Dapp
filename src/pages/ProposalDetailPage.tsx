import { BrowserProvider, Contract, Interface } from "ethers";
import { ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { formatCandidateName, useI18n } from "../i18n";
import { api } from "../lib/api";
import { privateVotingAbi } from "../lib/privateVotingAbi";
import type { ElectionCard, VotingStatus } from "../types";
import { useWallet } from "../wallet";

const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS as string) ?? "";
const votingInterface = new Interface(privateVotingAbi);

function getVoteErrorMessage(error: any, t: ReturnType<typeof useI18n>["t"]) {
  const data = error?.data || error?.error?.data || error?.info?.error?.data;
  if (data) {
    try {
      const parsed = votingInterface.parseError(data);
      if (parsed?.name) {
        const translated = t(`error.${parsed.name}`);
        if (translated !== `error.${parsed.name}`) return translated;
      }
    } catch {
      // Fall through to provider messages.
    }
  }

  const rawMessage = String(error?.shortMessage || error?.reason || error?.message || "");
  for (const key of ["VotingNotAllowed", "AlreadyVoted", "ElectionNotStarted", "ElectionEnded"]) {
    if (rawMessage.includes(key)) return t(`error.${key}`);
  }
  return rawMessage || t("error.voteFallback");
}

function formatCountdown(endTime: string) {
  const rawTarget = Number(endTime);
  const target = rawTarget < 10000000000 ? rawTarget * 1000 : rawTarget;
  const diff = Math.max(0, target - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return `${days}d ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function ProposalDetailPage() {
  const { id } = useParams();
  const { t } = useI18n();
  const { walletAddress, connectWallet, isConnecting } = useWallet();
  const [proposal, setProposal] = useState<ElectionCard | null>(null);
  const [countdown, setCountdown] = useState("00:00:00");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<VotingStatus | null>(null);
  const [votedCandidateName, setVotedCandidateName] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isExpired = useMemo(() => {
    if (!proposal) return true;
    const rawEndTime = Number(proposal.endTime);
    const endTime = rawEndTime < 10000000000 ? rawEndTime * 1000 : rawEndTime;
    return endTime <= Date.now();
  }, [proposal]);

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    async function load() {
      try {
        const detail = await api.getElectionDetail(id!);
        if (!mounted) return;
        setProposal(detail);
        setCountdown(formatCountdown(detail.endTime));

        if (walletAddress) {
          const nextStatus = await api.getVotingStatus(detail.contractElectionId, walletAddress.toLowerCase());
          if (mounted) setStatus(nextStatus);
          if (nextStatus.hasVoted) {
            const events = await api.getElectionVoteEvents(detail.contractElectionId, walletAddress.toLowerCase());
            const voteEvent = events[0];
            const candidate = detail.candidates.find((item) => item.index === voteEvent?.candidateIndex);
            if (mounted) {
              setVotedCandidateName(
                candidate?.name ?? (voteEvent ? t("candidate.number", { index: voteEvent.candidateIndex }) : null),
              );
            }
          } else if (mounted) {
            setVotedCandidateName(null);
          }
        } else {
          setStatus(null);
          setVotedCandidateName(null);
        }
      } catch (error) {
        console.error(error);
        if (mounted) setSubmitState(t("vote.loadError"));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [id, walletAddress, t]);

  useEffect(() => {
    if (!proposal) return;
    const timer = setInterval(() => setCountdown(formatCountdown(proposal.endTime)), 1000);
    return () => clearInterval(timer);
  }, [proposal]);

  async function submitVote() {
    if (!proposal) return;
    if (!walletAddress) {
      setSubmitState(t("vote.connectFirst"));
      return;
    }
    if (!status?.isPhoneVerified) {
      setSubmitState(t("vote.phoneFirst"));
      return;
    }
    if (!status?.isAuthorized) {
      setSubmitState(t("vote.permissionDenied"));
      return;
    }
    if (selectedIndex === null) {
      setSubmitState(t("vote.noCandidate"));
      return;
    }

    setIsSubmitting(true);
    setSubmitState(t("vote.openWallet"));

    try {
      const provider = new BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, privateVotingAbi, signer);
      const tx = await contract.vote(proposal.contractElectionId, selectedIndex);

      setSubmitState(t("vote.waitChain"));
      await tx.wait();

      setSubmitState(t("vote.recording"));
      try {
        await api.recordVote({
          electionId: proposal.contractElectionId,
          candidateIndex: selectedIndex,
          wallet: walletAddress.toLowerCase(),
          txHash: tx.hash,
        });
      } catch (recordError) {
        console.error("Vote succeeded but history recording failed", recordError);
        setSubmitState(t("vote.recordFailed"));
      }

      const nextStatus = await api.getVotingStatus(proposal.contractElectionId, walletAddress.toLowerCase());
      setStatus(nextStatus);
      setVotedCandidateName(
        proposal.candidates.find((item) => item.index === selectedIndex)?.name ??
          t("candidate.number", { index: selectedIndex }),
      );
      setSubmitState(t("vote.success"));
    } catch (error: any) {
      console.error(error);
      setSubmitState(t("error.prefix", { error: getVoteErrorMessage(error, t) }));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-20 text-center uppercase tracking-widest text-cyan-400 animate-pulse">
        {t("vote.loading")}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 text-white lg:px-10 lg:py-16">
      <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-10">
          <div>
            <h1 className="mb-6 font-heading text-5xl uppercase tracking-[0.12em]">
              {t("vote.detailTitle")}
            </h1>
            <div className="inline-block rounded-2xl border border-orange-500/50 bg-[#2D1B00] px-8 py-4 font-heading text-3xl text-orange-400 shadow-glow">
              {countdown}
            </div>
          </div>

          <div className="panel p-10">
            <p className="mb-4 font-heading text-xs uppercase tracking-[0.4em] text-accent">
              OIP-{proposal?.contractElectionId} | {proposal?.proposalCode}
            </p>
            <h2 className="mb-8 font-heading text-4xl uppercase tracking-wider">
              {proposal?.title}
            </h2>
            <p className="text-lg leading-relaxed text-copy">
              {proposal?.description || t("vote.noDescription")}
            </p>
          </div>
        </section>

        <aside className="panel p-10 shadow-2xl">
          <h2 className="mb-8 flex items-center gap-4 font-heading text-2xl uppercase">
            <ShieldCheck className="text-cyan-400" /> {t("vote.panelTitle")}
          </h2>

          <div className="mb-8 space-y-4">
            <div className="flex justify-between rounded-xl border border-white/5 bg-white/5 p-4">
              <span className="text-xs uppercase opacity-40">{t("vote.wallet")}</span>
              <span className="font-mono text-xs">
                {walletAddress ? `${walletAddress.slice(0, 10)}...${walletAddress.slice(-4)}` : t("vote.notConnected")}
              </span>
            </div>
            <div className="flex justify-between rounded-xl border border-white/5 bg-white/5 p-4">
              <span className="text-xs uppercase opacity-40">{t("vote.verification")}</span>
              <span className={status?.isPhoneVerified ? "text-xs font-bold text-green-400" : "text-xs font-bold text-red-400"}>
                {status?.isPhoneVerified ? t("vote.verifiedPhone") : t("vote.needPhone")}
              </span>
            </div>
            <div className="flex justify-between rounded-xl border border-white/5 bg-white/5 p-4">
              <span className="text-xs uppercase opacity-40">{t("vote.permission")}</span>
              <span className={status?.isAuthorized ? "text-xs font-bold text-green-400" : "text-xs font-bold text-red-400"}>
                {status?.isAuthorized ? t("vote.authorized") : t("vote.notAuthorized")}
              </span>
            </div>
            {status?.hasVoted && votedCandidateName && (
              <div className="flex justify-between rounded-xl border border-accent/20 bg-accent/10 p-4">
                <span className="text-xs uppercase opacity-60">{t("vote.voted")}</span>
                <span className="text-right text-xs font-bold text-accent">{formatCandidateName(votedCandidateName, t)}</span>
              </div>
            )}
          </div>

          {!walletAddress && (
            <button
              className="cyber-button mb-6 w-full px-6 py-4 font-heading text-sm uppercase tracking-[0.24em]"
              onClick={() => void connectWallet()}
              disabled={isConnecting}
            >
              {isConnecting ? t("wallet.connecting") : t("vote.connectWallet")}
            </button>
          )}

          {walletAddress && !status?.isPhoneVerified && (
            <Link
              to="/login"
              className="cyber-button mb-6 inline-flex w-full justify-center px-6 py-4 font-heading text-sm uppercase tracking-[0.24em]"
            >
              {t("vote.loginVerify")}
            </Link>
          )}

          <div className={`space-y-4 ${status?.hasVoted ? "pointer-events-none opacity-30" : ""}`}>
            <p className="mb-2 font-heading text-[10px] uppercase tracking-widest opacity-40">
              {t("vote.selectCandidate")}
            </p>
            {proposal?.candidates.map((candidate) => (
              <label
                key={candidate.id}
                className={`flex cursor-pointer items-center justify-between rounded-2xl border p-5 transition-all ${
                  selectedIndex === candidate.index
                    ? "scale-[1.02] border-accent bg-accent/5 shadow-glow"
                    : "border-white/5 hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-4">
                  <input
                    type="radio"
                    checked={selectedIndex === candidate.index}
                    onChange={() => setSelectedIndex(candidate.index)}
                    className="h-5 w-5 accent-accent"
                  />
                  <span className="font-heading text-lg uppercase">{formatCandidateName(candidate.name, t)}</span>
                </div>
                <span className="font-mono text-xs text-copy">{candidate.voteCount}</span>
              </label>
            ))}
          </div>

          <button
            onClick={() => void submitVote()}
            className="shimmer-button mt-10 w-full rounded-2xl p-6 font-heading text-xl uppercase tracking-widest disabled:cursor-not-allowed disabled:opacity-20"
            disabled={
              isSubmitting ||
              isExpired ||
              status?.hasVoted ||
              !walletAddress ||
              !status?.isPhoneVerified ||
              !status?.isAuthorized ||
              selectedIndex === null
            }
          >
            {isSubmitting
              ? t("vote.buttonProcessing")
              : status?.hasVoted
                ? t("vote.buttonAlreadyVoted")
                : isExpired
                  ? t("vote.buttonExpired")
                  : !walletAddress
                    ? t("vote.buttonNeedWallet")
                    : !status?.isPhoneVerified
                      ? t("vote.buttonNeedPhone")
                      : !status?.isAuthorized
                        ? t("vote.buttonNotAuthorized")
                        : selectedIndex === null
                          ? t("vote.buttonChoose")
                          : t("vote.buttonSubmit")}
          </button>

          {submitState && (
            <p className="mt-6 border-l-2 border-accent pl-3 text-center text-xs italic text-accent">
              {submitState}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
