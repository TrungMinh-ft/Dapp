import { LogOut, Shield, Wallet } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { useI18n } from "../i18n";
import { api } from "../lib/api";
import { useWallet } from "../wallet";

type AppFrameProps = {
  children: ReactNode;
};

const navItems = [
  { to: "/", labelKey: "nav.home" },
  { to: "/login", labelKey: "nav.login" },
  { to: "/gallery", labelKey: "nav.elections" },
  { to: "/my-votes", labelKey: "nav.history" },
];

export function AppFrame({ children }: AppFrameProps) {
  const { walletAddress, connectWallet, disconnectWallet, isConnecting } = useWallet();
  const { language, setLanguage, t } = useI18n();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!walletAddress) {
      setIsAdmin(false);
      return;
    }

    let mounted = true;
    const activeWallet = walletAddress;
    async function loadAdminStatus() {
      try {
        const status = await api.getAuthStatus(activeWallet.toLowerCase());
        if (mounted) setIsAdmin(status.isAdmin);
      } catch {
        if (mounted) setIsAdmin(false);
      }
    }

    void loadAdminStatus();
    return () => {
      mounted = false;
    };
  }, [walletAddress]);

  const visibleNavItems = useMemo(
    () => (isAdmin ? [...navItems, { to: "/admin", labelKey: "nav.admin" }] : navItems),
    [isAdmin],
  );

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
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? "text-accent" : "transition hover:text-white")}
              >
                {t(item.labelKey)}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="flex overflow-hidden rounded-full border border-white/10 font-heading text-[10px] uppercase tracking-[0.16em]">
              <button
                className={`px-3 py-2 ${language === "en" ? "bg-accent text-base" : "text-copy hover:text-white"}`}
                onClick={() => setLanguage("en")}
                type="button"
              >
                EN
              </button>
              <button
                className={`px-3 py-2 ${language === "vi" ? "bg-accent text-base" : "text-copy hover:text-white"}`}
                onClick={() => setLanguage("vi")}
                type="button"
              >
                VI
              </button>
            </div>
            <button
              className="cyber-button inline-flex items-center gap-2 px-4 py-3 text-xs font-heading uppercase tracking-[0.2em]"
              onClick={() => void connectWallet()}
            >
              <Wallet className="h-4 w-4" />
              {walletAddress
                ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                : isConnecting
                  ? t("wallet.connecting")
                  : t("wallet.connect")}
            </button>
            {walletAddress && (
              <button
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-red-400/30 text-red-200 transition hover:border-red-300 hover:text-white"
                onClick={disconnectWallet}
                title={t("wallet.disconnect")}
                aria-label={t("wallet.disconnect")}
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="relative z-10">{children}</main>
    </div>
  );
}
