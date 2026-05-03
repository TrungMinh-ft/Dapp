import { CheckCircle2, Phone, ShieldCheck, Wallet } from "lucide-react";
import { ConfirmationResult, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";
import { api } from "../lib/api";
import { auth } from "../lib/firebase";
import { useWallet } from "../wallet";

function formatPhoneNumber(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("0") ? `+84${trimmed.slice(1)}` : trimmed;
}

export function LoginPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { walletAddress, connectWallet, disconnectWallet, isConnecting } = useWallet();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!walletAddress) {
      setIsVerified(false);
      setVerifiedPhone(null);
      return;
    }

    let mounted = true;
    const activeWallet = walletAddress;
    async function loadStatus() {
      try {
        const status = await api.getAuthStatus(activeWallet.toLowerCase());
        if (!mounted) return;
        setIsVerified(status.isVerified);
        setVerifiedPhone(status.phoneNumber);
        if (status.isVerified) setMessage(t("login.verifiedMessage"));
      } catch {
        if (mounted) setMessage(t("login.statusError"));
      }
    }

    void loadStatus();
    return () => {
      mounted = false;
    };
  }, [walletAddress, t]);

  function setupRecaptcha() {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, "login-recaptcha-container", {
        size: "invisible",
      });
    }
    return (window as any).recaptchaVerifier;
  }

  async function sendOtp() {
    if (!walletAddress) {
      setMessage(t("login.connectFirst"));
      return;
    }
    if (!phoneNumber.trim()) {
      setMessage(t("login.phoneRequired"));
      return;
    }

    setIsBusy(true);
    setMessage(t("login.sendingOtp"));
    try {
      const result = await signInWithPhoneNumber(auth, formatPhoneNumber(phoneNumber), setupRecaptcha());
      setConfirmationResult(result);
      setMessage(t("login.otpSent"));
    } catch (error: any) {
      (window as any).recaptchaVerifier = null;
      setMessage(t("login.otpSendFailed", { error: error.message ?? t("common.unknown") }));
    } finally {
      setIsBusy(false);
    }
  }

  async function verifyOtp() {
    if (!walletAddress || !confirmationResult || !verificationCode.trim()) {
      setMessage(t("login.otpRequired"));
      return;
    }

    setIsBusy(true);
    setMessage(t("login.verifyingPhone"));
    try {
      const result = await confirmationResult.confirm(verificationCode.trim());
      await api.verifyPhoneSuccess({
        walletAddress: walletAddress.toLowerCase(),
        phoneNumber: result.user.phoneNumber ?? formatPhoneNumber(phoneNumber),
      });
      setIsVerified(true);
      setVerifiedPhone(result.user.phoneNumber ?? formatPhoneNumber(phoneNumber));
      setMessage(t("login.success"));
      setTimeout(() => navigate("/gallery"), 500);
    } catch (error: any) {
      setMessage(t("login.verifyFailed", { error: error.message ?? t("common.unknown") }));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 lg:px-10 lg:py-16">
      <div id="login-recaptcha-container" />
      <div className="mb-10">
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-accent">{t("login.eyebrow")}</p>
        <h1 className="mt-4 font-heading text-4xl uppercase tracking-[0.18em] text-white lg:text-5xl">
          {t("login.title")}
        </h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-8">
          <div className="flex items-center gap-3 text-accent">
            <Wallet className="h-5 w-5" />
            <h2 className="font-heading text-xl uppercase tracking-[0.16em]">{t("login.stepWallet")}</h2>
          </div>
          <p className="mt-4 text-copy">{t("login.walletHint")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              className="cyber-button px-6 py-3 font-heading text-xs uppercase tracking-[0.22em]"
              onClick={() => void connectWallet()}
              disabled={isConnecting}
            >
              {walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}` : isConnecting ? t("wallet.connecting") : t("wallet.connect")}
            </button>
            {walletAddress && (
              <button
                className="rounded-full border border-red-400/30 px-6 py-3 font-heading text-xs uppercase tracking-[0.22em] text-red-200 transition hover:border-red-300 hover:text-white"
                onClick={disconnectWallet}
              >
                {t("login.disconnect")}
              </button>
            )}
          </div>
        </section>

        <section className="panel p-8">
          <div className="flex items-center gap-3 text-accent">
            <Phone className="h-5 w-5" />
            <h2 className="font-heading text-xl uppercase tracking-[0.16em]">{t("login.stepPhone")}</h2>
          </div>
          {isVerified ? (
            <div className="mt-6 rounded-2xl border border-green-400/30 bg-green-400/10 p-5 text-green-200">
              <p className="font-heading text-sm uppercase tracking-[0.2em]">{t("login.verified")}</p>
              <p className="mt-2 text-copy">
                {t("login.savedPhone", { phone: verifiedPhone ?? t("login.verified") })}
              </p>
              <button
                className="shimmer-button mt-5 w-full px-6 py-4 font-heading text-sm uppercase tracking-[0.24em]"
                onClick={() => navigate("/gallery")}
              >
                {t("login.goVote")}
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <input
                className="field-input"
                placeholder={t("login.phonePlaceholder")}
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
              />
              {confirmationResult && (
                <input
                  className="field-input text-center font-heading text-2xl tracking-[0.35em]"
                  placeholder="123456"
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value)}
                  maxLength={6}
                />
              )}
              <button
                className="shimmer-button w-full px-6 py-4 font-heading text-sm uppercase tracking-[0.24em]"
                onClick={confirmationResult ? verifyOtp : sendOtp}
                disabled={isBusy || !walletAddress}
              >
                {confirmationResult ? t("login.confirmOtp") : t("login.sendOtp")}
              </button>
            </div>
          )}
        </section>
      </div>

      {message && (
        <div className="panel mt-8 flex items-center gap-3 border-accent/30 px-6 py-4 text-accent">
          <CheckCircle2 className="h-5 w-5" />
          <p>{message}</p>
        </div>
      )}

      <div className="panel mt-8 flex items-center gap-3 px-6 py-4 text-copy">
        <ShieldCheck className="h-5 w-5 text-accent" />
        <p>{t("login.help")}</p>
      </div>
    </div>
  );
}
