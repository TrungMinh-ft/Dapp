import { ArrowRight, Cpu, Fingerprint, Lock, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { SectionTitle } from "../components/SectionTitle";

const steps = [
  {
    number: "01",
    title: "Encrypt Your Vote",
    description: "Each ballot is sealed before submission so sensitive preferences never leak to the public mempool.",
    icon: Fingerprint,
  },
  {
    number: "02",
    title: "Secure Computation",
    description: "Oasis Sapphire executes vote logic inside confidential smart contract environments backed by TEE isolation.",
    icon: Cpu,
  },
  {
    number: "03",
    title: "Verify The Results",
    description: "Auditable outcomes, verifiable timestamps, and immutable proofs remain visible while personal choices stay hidden.",
    icon: ShieldCheck,
  },
];

export function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-16">
      <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
        <div>
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.45em] text-accent">
            Next-Gen Confidential Governance
          </p>
          <h1 className="max-w-4xl font-heading text-5xl uppercase leading-[1.05] tracking-[0.14em] text-white lg:text-7xl">
            Secure Private Voting On Oasis Sapphire
          </h1>
          <p className="mt-6 max-w-2xl text-xl text-copy">
            Confidential. Verifiable. Powered by TEE-based encryption.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link to="/gallery" className="cyber-button px-8 py-4 font-heading text-sm uppercase tracking-[0.3em]">
              Launch Dapp
            </Link>
            <Link
              to="/my-votes"
              className="inline-flex items-center gap-3 rounded-full border border-white/10 px-6 py-4 text-sm uppercase tracking-[0.2em] text-copy transition hover:-translate-y-0.5 hover:border-accent/50 hover:text-white"
            >
              Explore Records
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <div className="relative flex min-h-[480px] items-center justify-center">
          <div className="absolute inset-10 rounded-full bg-[radial-gradient(circle,rgba(123,47,255,0.25),transparent_60%)] blur-3xl" />
          <div className="hologram-cube relative">
            <div className="hologram-face hologram-front">
              <Lock className="h-20 w-20 text-accent" />
            </div>
            <div className="hologram-face hologram-back" />
            <div className="hologram-face hologram-left" />
            <div className="hologram-face hologram-right" />
            <div className="hologram-face hologram-top" />
            <div className="hologram-face hologram-bottom" />
          </div>
        </div>
      </section>

      <section className="py-16">
        <SectionTitle
          eyebrow="How It Works"
          title="Trusted Privacy Pipeline"
          subtitle="From encrypted ballots to publicly auditable final tallies, each phase is designed to preserve confidentiality without sacrificing legitimacy."
          align="center"
        />
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <article key={step.number} className="panel group p-8 transition hover:-translate-y-0.5">
                <div className="flex items-start justify-between">
                  <span className="font-heading text-5xl text-white/10">{step.number}</span>
                  <Icon className="h-9 w-9 text-accent" />
                </div>
                <h3 className="mt-8 font-heading text-2xl uppercase tracking-[0.16em] text-white">
                  {step.title}
                </h3>
                <p className="mt-4 text-lg text-copy">{step.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel mt-8 flex flex-col items-start justify-between gap-6 px-8 py-10 lg:flex-row lg:items-center">
        <div>
          <p className="font-heading text-2xl uppercase tracking-[0.16em] text-white">
            Ready to participate in the future of secure voting?
          </p>
          <p className="mt-2 text-lg text-copy">
            Browse active encrypted proposals and test the governance experience.
          </p>
        </div>
        <Link to="/gallery" className="shimmer-button px-8 py-4 font-heading text-sm uppercase tracking-[0.28em] text-base">
          Explore Active Polls
        </Link>
      </section>

      <footer className="mt-16 flex flex-col gap-4 border-t border-[rgba(0,229,255,0.18)] py-8 text-sm text-copy lg:flex-row lg:items-center lg:justify-between">
        <p>© 2026 Sapphire Vote. Confidential governance interface.</p>
        <div className="flex gap-6 uppercase tracking-[0.22em]">
          <a href="/">X</a>
          <a href="/">GitHub</a>
          <a href="/">Docs</a>
        </div>
      </footer>
    </div>
  );
}
