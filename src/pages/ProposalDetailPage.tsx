import { BrowserProvider, Contract } from "ethers";
import { Phone, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { privateVotingAbi } from "../lib/privateVotingAbi";
import type { ElectionCard, VotingStatus } from "../types";
import { useWallet } from "../wallet";
import { auth } from "../lib/firebase";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";
import axios from "axios";

const CONTRACT_ADDRESS =
  (import.meta.env.VITE_CONTRACT_ADDRESS as string) ?? "";

// ✅ FIX: Dùng env thay vì hardcode localhost
const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  `${window.location.protocol}//${window.location.hostname}:3001`;

function formatCountdown(endTime: string) {
  const target = Number(endTime);
  const now = Date.now();
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return `${days}D ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} REMAINING`;
}

export function ProposalDetailPage() {
  const { id } = useParams();
  const { walletAddress } = useWallet();
  const [proposal, setProposal] = useState<ElectionCard | null>(null);
  const [countdown, setCountdown] = useState("00:00:00 REMAINING");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<VotingStatus | null>(null);
  const [submitState, setSubmitState] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // SMS AUTH STATE
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);

  const isExpired = useMemo(
    () => (proposal ? Number(proposal.endTime) <= Date.now() : true),
    [proposal],
  );

  // LOAD DỮ LIỆU
  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const detail = await api.getElectionDetail(id!);
        setProposal(detail);
        setCountdown(formatCountdown(detail.endTime));
        if (walletAddress) {
          const res = await api.getVotingStatus(
            detail.contractElectionId,
            walletAddress.toLowerCase(),
          );
          setStatus(res);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, walletAddress]);

  useEffect(() => {
    if (!proposal) return;
    const timer = setInterval(
      () => setCountdown(formatCountdown(proposal.endTime)),
      1000,
    );
    return () => clearInterval(timer);
  }, [proposal]);

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        { size: "invisible" },
      );
    }
  };

  async function handleSendOTP() {
    if (!phoneNumber) return alert("Vui lòng nhập SĐT!");
    setupRecaptcha();
    try {
      const formattedPhone = phoneNumber.startsWith("0")
        ? "+84" + phoneNumber.slice(1)
        : phoneNumber;
      const result = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        (window as any).recaptchaVerifier,
      );
      setConfirmationResult(result);
      setSubmitState("Đã gửi mã xác thực!");
    } catch (err: any) {
      setSubmitState("Lỗi gửi OTP: " + err.message);
      // Reset recaptcha nếu lỗi
      (window as any).recaptchaVerifier = null;
    }
  }

  async function handleVerifyOTP() {
    if (!verificationCode || !confirmationResult) return;
    try {
      const result = await confirmationResult.confirm(verificationCode);

      // ✅ FIX: Dùng API_BASE_URL thay vì hardcode localhost
      await axios.post(`${API_BASE_URL}/auth/verify-phone-success`, {
        walletAddress: walletAddress?.toLowerCase(),
        phoneNumber: result.user.phoneNumber,
      });

      const nextStatus = await api.getVotingStatus(
        proposal!.contractElectionId,
        walletAddress!.toLowerCase(),
      );
      setStatus(nextStatus);
      setSubmitState("Xác thực thành công! Đang mở ví...");
      setTimeout(() => {
        submitVote();
      }, 1000);
    } catch (err: any) {
      if (err.response?.data?.message) {
        setSubmitState("Lỗi: " + err.response.data.message);
      } else {
        alert("OTP sai hoặc đã hết hạn!");
      }
    }
  }

  async function submitVote() {
    if (!proposal || !walletAddress || selectedIndex === null) {
      setSubmitState("Vui lòng chọn 1 ứng viên trước khi bầu chọn!");
      return;
    }

    setIsSubmitting(true);
    setSubmitState("Đang khởi tạo giao dịch MetaMask...");

    try {
      const provider = new BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, privateVotingAbi, signer);

      // 1. Gửi giao dịch lên Blockchain
      const tx = await contract.vote(
        proposal.contractElectionId,
        selectedIndex,
      );

      setSubmitState("Giao dịch đã gửi! Đang chờ Blockchain xác nhận...");
      await tx.wait(); // Chờ đợi giao dịch hoàn tất trên chuỗi

      // --- PHẦN QUAN TRỌNG: KÍCH HOẠT ĐỒNG BỘ LỊCH SỬ NGAY LẬP TỨC ---
      setSubmitState("Blockchain đã xác nhận! Đang đồng bộ vào lịch sử...");
      try {
        // Gọi API Backend để quét phiếu bầu của cuộc này và lưu vào Neon DB
        // Chúng ta dùng route /sync-events để bắt các sự kiện VoteCast mới nhất
        await axios.post(
          `http://localhost:3001/elections/${proposal.contractElectionId}/sync-events`,
        );
        console.log("Đồng bộ dữ liệu thành công!");
      } catch (syncErr) {
        console.error(
          "Lỗi đồng bộ (nhưng vote đã thành công trên chain):",
          syncErr,
        );
      }
      // ------------------------------------------------------------

      setSubmitState("Bầu cử thành công và đã lưu vào lịch sử!");

      // Cập nhật lại trạng thái hiển thị (hasVoted = true)
      const res = await api.getVotingStatus(
        proposal.contractElectionId,
        walletAddress.toLowerCase(),
      );
      setStatus(res);
    } catch (err: any) {
      console.error(err);
      setSubmitState(
        "Lỗi: " +
          (err.reason ||
            "Bạn đã bầu cho cuộc này rồi hoặc chưa được Authorize."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading)
    return (
      <div className="p-20 text-cyan-400 text-center uppercase tracking-widest animate-pulse">
        Initializing Interface...
      </div>
    );

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-16 text-white">
      <div id="recaptcha-container"></div>
      <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        {/* CỘT TRÁI: CHI TIẾT */}
        <section className="space-y-10">
          <div>
            <h1 className="text-5xl font-heading uppercase tracking-tighter mb-6">
              Proposal Detail
            </h1>
            <div className="inline-block bg-[#2D1B00] border border-orange-500/50 px-8 py-4 rounded-2xl text-orange-400 font-digital text-4xl shadow-glow">
              {countdown}
            </div>
          </div>

          <div className="bg-[#0A0D14] border border-white/5 p-10 rounded-[40px] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-cyan-500/30 shadow-glow"></div>
            <p className="text-accent font-heading text-xs uppercase tracking-[0.4em] mb-4">
              OIP-{proposal?.contractElectionId} | ELECTION
            </p>
            <h2 className="text-4xl font-heading uppercase tracking-wider mb-8">
              {proposal?.title}
            </h2>

            {/* ✅ FIX: Ẩn đoạn mô tả nếu rỗng thay vì hiện "Dữ liệu đang được đồng bộ..." */}
            {proposal?.description ? (
              <p className="text-copy text-lg leading-relaxed italic opacity-60">
                {proposal.description}
              </p>
            ) : (
              <p className="text-copy text-sm italic opacity-30">
                Chưa có mô tả cho cuộc bầu cử này.
              </p>
            )}
          </div>
        </section>

        {/* CỘT PHẢI: BẦU CỬ */}
        <aside className="bg-[#0A0D14] border border-white/5 p-10 rounded-[40px] shadow-2xl">
          <h2 className="text-2xl font-heading uppercase flex items-center gap-4 mb-8">
            <ShieldCheck className="text-cyan-400" /> Cast Your Ballot
          </h2>

          <div className="space-y-4 mb-8">
            <div className="flex justify-between bg-white/5 p-4 rounded-xl border border-white/5">
              <span className="text-xs opacity-40 uppercase">Wallet</span>
              <span className="font-mono text-xs">
                {walletAddress?.slice(0, 10)}...
              </span>
            </div>
            <div className="flex justify-between bg-white/5 p-4 rounded-xl border border-white/5">
              <span className="text-xs opacity-40 uppercase">Status</span>
              <span
                className={
                  status?.isPhoneVerified
                    ? "text-green-400 text-xs font-bold"
                    : "text-red-400 text-xs font-bold"
                }
              >
                {status?.isPhoneVerified
                  ? "PHONE VERIFIED ✓"
                  : "VERIFICATION REQUIRED"}
              </span>
            </div>
          </div>

          {/* BOX XÁC THỰC - Chỉ hiện khi chưa verify */}
          {!status?.isPhoneVerified && (
            <div className="mb-8 p-6 rounded-3xl border border-purple-500/40 bg-purple-900/10 shadow-[0_0_30px_rgba(168,85,247,0.1)]">
              <p className="text-purple-400 text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2">
                <Phone className="w-3 h-3" /> 2-Step Verification
              </p>
              {!confirmationResult ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="SĐT 0385..."
                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                  <button
                    onClick={handleSendOTP}
                    className="bg-cyan-500 text-black px-6 rounded-xl font-bold uppercase text-[10px] hover:bg-cyan-400 transition-colors"
                  >
                    Send
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-green-400 text-xs mb-2">
                    ✓ Mã OTP đã gửi đến {phoneNumber}
                  </p>
                  <input
                    type="text"
                    placeholder="1 2 3 4 5 6"
                    className="w-full bg-black/50 border border-purple-500/50 rounded-xl py-3 text-center text-2xl font-heading tracking-[0.5em] text-white"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    maxLength={6}
                  />
                  <button
                    onClick={handleVerifyOTP}
                    className="w-full bg-green-600 p-4 rounded-xl font-bold uppercase text-white shadow-glow hover:bg-green-500 transition-colors"
                  >
                    Verify & Vote Now
                  </button>
                  <button
                    onClick={() => {
                      setConfirmationResult(null);
                      setVerificationCode("");
                      (window as any).recaptchaVerifier = null;
                    }}
                    className="w-full text-xs text-white/40 hover:text-white/60 transition-colors mt-1"
                  >
                    Gửi lại mã
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CHỌN ỨNG VIÊN */}
          <div
            className={`space-y-4 ${status?.hasVoted ? "opacity-30 pointer-events-none" : ""}`}
          >
            <p className="text-[10px] uppercase tracking-widest opacity-30 mb-2 font-heading">
              Select Candidate:
            </p>
            {proposal?.candidates.map((c) => (
              <label
                key={c.id}
                className={`flex items-center justify-between p-5 border rounded-2xl cursor-pointer transition-all ${
                  selectedIndex === c.index
                    ? "border-accent bg-accent/5 shadow-glow scale-[1.02]"
                    : "border-white/5 hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-4">
                  <input
                    type="radio"
                    checked={selectedIndex === c.index}
                    onChange={() => setSelectedIndex(c.index)}
                    className="w-5 h-5 accent-accent"
                  />
                  <span className="font-heading text-lg uppercase">
                    {c.name}
                  </span>
                </div>
              </label>
            ))}
          </div>

          <button
            onClick={() => submitVote()}
            className="shimmer-button w-full mt-10 p-6 rounded-2xl font-heading text-xl uppercase tracking-widest disabled:opacity-20 disabled:cursor-not-allowed"
            disabled={
              isSubmitting ||
              isExpired ||
              status?.hasVoted ||
              !status?.isPhoneVerified ||
              selectedIndex === null
            }
          >
            {isSubmitting
              ? "Processing..."
              : status?.hasVoted
                ? "Already Voted ✓"
                : isExpired
                  ? "Election Ended"
                  : !status?.isPhoneVerified
                    ? "Verify Phone First"
                    : selectedIndex === null
                      ? "Select a Candidate"
                      : "Confirm My Vote"}
          </button>

          {submitState && (
            <p className="mt-6 text-center text-xs text-accent italic animate-pulse border-l-2 border-accent pl-3">
              {submitState}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
