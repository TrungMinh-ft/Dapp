import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatCandidateName, formatStatusLabel, useI18n } from "../i18n";
import { api } from "../lib/api";
import type { ElectionCard } from "../types";
import { useWallet } from "../wallet";

function ProposalCard({
  proposal,
  primary,
}: {
  proposal: ElectionCard;
  primary: "filled" | "outline";
}) {
  const { t } = useI18n();
  const leading = formatCandidateName(proposal.leadingOption, t);
  const footer = proposal.resultSummary
    ? `${formatStatusLabel(proposal.displayStatus, t)} - ${proposal.leadingPercentage}% ${leading}`
    : `${formatStatusLabel(proposal.displayStatus, t)} - ${proposal.leadingPercentage}% ${t("candidate.yes")}`;

  return (
    <article className="panel group p-6 transition duration-300 hover:-translate-y-1 hover:shadow-glow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-heading text-2xl uppercase tracking-[0.16em] text-white">
            {proposal.proposalCode}
          </p>
          <p className="mt-3 text-lg text-white">{proposal.title}</p>
          <p className="mt-2 line-clamp-2 text-base text-copy">
            {proposal.description || t("gallery.noDescription")}
          </p>
        </div>
      </div>
      <div className="mt-6 inline-flex rounded-full border border-accent/30 bg-accent/10 px-4 py-2 font-heading text-xs uppercase tracking-[0.24em] text-accent">
        {formatStatusLabel(proposal.badgeLabel, t)}
      </div>
      <div className="mt-8 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-neon"
          style={{ width: `${proposal.leadingPercentage}%` }}
        />
      </div>
      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="font-heading text-sm uppercase tracking-[0.2em] text-white">
          {footer}
        </p>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-copy">
          {t("gallery.leading", { value: leading })}
        </p>
      </div>
      <Link
        to={`/proposal/${proposal.contractElectionId}`}
        className={
          primary === "filled"
            ? "mt-8 inline-flex rounded-full bg-accent px-5 py-3 font-heading text-xs uppercase tracking-[0.24em] text-base transition hover:-translate-y-0.5 hover:shadow-glow"
            : "cyber-button mt-8 inline-flex px-5 py-3 text-xs font-heading uppercase tracking-[0.24em]"
        }
      >
        {primary === "filled" ? t("gallery.vote") : t("gallery.viewResults")}
      </Link>
    </article>
  );
}

function filterProposals(
  proposals: ElectionCard[],
  search: string,
  status: string,
  privacy: string,
) {
  const normalizedSearch = search.trim().toLowerCase();

  return proposals.filter((proposal) => {
    const matchesSearch =
      normalizedSearch === "" ||
      proposal.proposalCode.toLowerCase().includes(normalizedSearch) ||
      proposal.title.toLowerCase().includes(normalizedSearch);
    const matchesStatus = status === "ALL" || proposal.displayStatus === status;
    const matchesPrivacy = privacy === "ALL" || proposal.privacyLevel === privacy;

    return matchesSearch && matchesStatus && matchesPrivacy;
  });
}

export function GalleryPage() {
  const { t } = useI18n();
  const { walletAddress, connectWallet, isConnecting } = useWallet();
  const [activeProposals, setActiveProposals] = useState<ElectionCard[]>([]);
  const [finishedProposals, setFinishedProposals] = useState<ElectionCard[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [privacy, setPrivacy] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [active, finished] = await Promise.all([
          api.getActiveElections(),
          api.getFinishedElections(),
        ]);

        if (!mounted) return;
        setActiveProposals(active);
        setFinishedProposals(finished);
        setError(null);
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : t("gallery.loadError"));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [t]);

  const visibleActive = useMemo(
    () => filterProposals(activeProposals, search, status, privacy),
    [activeProposals, search, status, privacy],
  );
  const visibleFinished = useMemo(
    () => filterProposals(finishedProposals, search, status, privacy),
    [finishedProposals, search, status, privacy],
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-16">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-heading text-4xl uppercase tracking-[0.18em] text-white lg:text-5xl">
            {t("gallery.title")}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-copy" />
            <input
              className="field-input min-w-[280px] pl-11"
              placeholder={t("gallery.searchPlaceholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <select
            className="field-input min-w-[180px]"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="ALL">{t("gallery.statusFilter")}</option>
            <option value="VOTING LIVE">{t("status.votingLive")}</option>
            <option value="PASSED">{t("status.passed")}</option>
            <option value="REJECTED">{t("status.rejected")}</option>
            <option value="FINISHED">{t("status.finished")}</option>
          </select>
          <select
            className="field-input min-w-[180px]"
            value={privacy}
            onChange={(event) => setPrivacy(event.target.value)}
          >
            <option value="ALL">{t("gallery.privacyFilter")}</option>
            <option value="ENCRYPTED">{t("privacy.private")}</option>
            <option value="PUBLIC">{t("privacy.public")}</option>
          </select>
          <button
            className="cyber-button px-5 py-3 text-xs font-heading uppercase tracking-[0.24em]"
            onClick={() => void connectWallet()}
          >
            {walletAddress
              ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
              : isConnecting
                ? t("wallet.connecting")
                : t("wallet.connect")}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="panel mt-12 px-8 py-10 text-lg text-copy">
          {t("gallery.loading")}
        </div>
      ) : null}
      {error ? (
        <div className="panel mt-12 border-red-400/30 px-8 py-10 text-lg text-red-200">
          {error}
        </div>
      ) : null}

      <section className="mt-12">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-heading text-2xl uppercase tracking-[0.16em] text-white">
            {t("gallery.active")}
          </h2>
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-accent">
            /elections/active
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {visibleActive.map((proposal) => (
            <ProposalCard key={proposal.contractElectionId} proposal={proposal} primary="filled" />
          ))}
        </div>
      </section>

      <section className="mt-16">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-heading text-2xl uppercase tracking-[0.16em] text-white">
            {t("gallery.finished")}
          </h2>
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-copy">
            /elections/finished
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {visibleFinished.map((proposal) => (
            <ProposalCard key={proposal.contractElectionId} proposal={proposal} primary="outline" />
          ))}
        </div>
      </section>
    </div>
  );
}
