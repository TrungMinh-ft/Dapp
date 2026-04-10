import { Shield, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { useWallet } from "../wallet";

type AppFrameProps = {
  children: ReactNode;
};

const navItems = [
  { to: "/", label: "Home" },
  { to: "/gallery", label: "About" },
  { to: "/my-votes", label: "Votes" },
  { to: "/deployment", label: "Docs" },
];

export function AppFrame({ children }: AppFrameProps) {
  const { walletAddress, connectWallet, isConnecting } = useWallet();

  return (
    <div className="relative min-h-screen overflow-hidden bg-base text-white">
      <div className="pointer-events-none absolute inset-0 bg-hero-grid bg-[size:70px_70px] opacity-40 animate-grid" />
      <div className="noise-layer pointer-events-none absolute inset-0 opacity-30" />
      <div className="scanline-layer pointer-events-none absolute inset-0 opacity-20" />
      <header className="relative z-20 border-b border-[rgba(0,229,255,0.18)] bg-[rgba(2,8,24,0.75)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <Link to="/" className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.35em] text-accent">
            <span className="rounded-full border border-[rgba(0,229,255,0.35)] p-2 shadow-glow">
              <Shield className="h-5 w-5" />
            </span>
            Sapphire Vote
          </Link>
          <nav className="hidden items-center gap-8 font-heading text-xs uppercase tracking-[0.28em] text-copy lg:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? "text-accent" : "transition hover:text-white")}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button
            className="cyber-button inline-flex items-center gap-2 px-4 py-3 text-xs font-heading uppercase tracking-[0.28em]"
            onClick={() => void connectWallet()}
          >
            <Wallet className="h-4 w-4" />
            {walletAddress
              ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
              : isConnecting
                ? "Connecting..."
                : "Connect Wallet"}
          </button>
        </div>
      </header>
      <main className="relative z-10">{children}</main>
    </div>
  );
}
