import { useState, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2, Sparkles, KeyRound } from "lucide-react";

interface LoginPanelProps {
  onSuccess?: () => void;
}

export default function LoginPanel({ onSuccess }: LoginPanelProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const passwordInputId = useId();

  const handleQuickDemoFill = () => {
    setPassword("SENTINEL-SECURE-2026");
    setErrorMessage(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!password.trim()) {
      setErrorMessage("Access password or clearance code required.");
      return;
    }

    setIsLoading(true);

    // Simulate cyber-physical clearance authentication sequence
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess?.();
      }, 700);
    }, 900);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 18 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -10 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-[440px] select-none"
    >
      {/* Outer atmospheric cyan-blue glow */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-b from-cyan-500/20 via-sky-600/10 to-transparent blur-xl pointer-events-none" />

      {/* Glassmorphism Panel */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-950/85 p-7 sm:p-9 shadow-[0_25px_60px_-15px_rgba(2,6,23,0.95),0_0_35px_rgba(34,211,238,0.12)] backdrop-blur-2xl">
        {/* Top subtle cyan scanline highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

        {/* Header Section */}
        <div className="flex flex-col items-center text-center">
          {/* Commander Profile Cyber Shield Badge */}
          <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/50 bg-gradient-to-b from-slate-900 to-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.25)] ring-1 ring-cyan-400/20">
            <ShieldCheck className="h-8 w-8 text-cyan-400 animate-pulse" />
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full border-2 border-slate-950 bg-cyan-400" />
            </span>
          </div>

          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">
            Identity Verification
          </span>

          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            COMMANDER GOWTHAM
          </h2>

          <p className="mt-1 text-xs text-slate-400 font-sans">
            Cyber-Physical Energy Systems Sentinel clearance.
          </p>

          {/* User ID Card */}
          <div className="mt-4 flex w-full items-center justify-between rounded-xl border border-cyan-500/20 bg-slate-900/60 px-4 py-2.5 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-mono text-xs text-slate-300">
                USER ID: <strong className="text-white">GOWTHAM</strong>
              </span>
            </div>
            <span className="rounded-full border border-cyan-500/30 bg-cyan-950/40 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-cyan-300">
              PRE-IDENTIFIED
            </span>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="mt-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor={passwordInputId}
                className="font-mono text-[11px] uppercase tracking-wider text-slate-400"
              >
                Access Password
              </label>
              <button
                type="button"
                onClick={handleQuickDemoFill}
                className="flex items-center gap-1 font-mono text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors"
                title="Auto-fill demo credentials"
              >
                <KeyRound className="h-3 w-3" />
                <span>DEMO AUTO-FILL</span>
              </button>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Lock className="h-4 w-4" />
              </div>

              <input
                id={passwordInputId}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Sentinel access key..."
                autoFocus
                disabled={isLoading || isSuccess}
                className="w-full rounded-xl border border-slate-700/80 bg-slate-900/70 py-2.5 pl-10 pr-10 font-mono text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-lg border border-red-500/30 bg-red-950/40 p-2.5 text-xs text-red-300 font-sans"
              >
                {errorMessage}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || isSuccess}
            className={`group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] transition-all duration-300 cursor-pointer ${
              isSuccess
                ? "bg-emerald-500 text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.5)]"
                : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_25px_rgba(6,182,212,0.35)] hover:shadow-[0_0_35px_rgba(6,182,212,0.6)] hover:scale-[1.02] active:scale-[0.98]"
            }`}
          >
            {/* Shimmer sweep */}
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />

            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying Biometric Key...</span>
              </>
            ) : isSuccess ? (
              <>
                <ShieldCheck className="h-4 w-4" />
                <span>Clearance Verified</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Secure Login</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        {/* Footer Meta */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-800/80 pt-4 font-mono text-[10px] text-slate-400">
          <span>NODE: SENTINEL-ALPHA</span>
          <span className="text-cyan-400/80">256-Bit TLS Encrypted</span>
        </div>
      </div>
    </motion.div>
  );
}
