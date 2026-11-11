import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  User,
  Eye,
  EyeOff,
  Terminal,
  Zap,
  ArrowRight,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Orbit,
} from "lucide-react";
import { CyberReticle } from "./CyberReticle";
import { DEMO_CREDENTIALS, useOperatorAuth } from "./authStore";
import { cn } from "@/lib/utils";

interface CyberLoginCardProps {
  onSuccess: () => void;
  onBackToGalaxy?: () => void;
}

type AuthStage = "idle" | "tunnel" | "cert" | "authorized" | "denied";

export function CyberLoginCard({ onSuccess, onBackToGalaxy }: CyberLoginCardProps) {
  const { login } = useOperatorAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [touchedUser, setTouchedUser] = useState(false);
  const [touchedPass, setTouchedPass] = useState(false);

  const [stage, setStage] = useState<AuthStage>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Field validations
  const isUserValid = username.trim().length > 0;
  const isPassValid = password.length >= 6;
  const userError =
    touchedUser && !isUserValid ? "Operator ID or email is required" : null;
  const passError =
    touchedPass && !isPassValid
      ? "Security passcode must be at least 6 characters"
      : null;

  const handleAutoFill = () => {
    setUsername(DEMO_CREDENTIALS.username);
    setPassword(DEMO_CREDENTIALS.defaultPassword);
    setTouchedUser(true);
    setTouchedPass(true);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouchedUser(true);
    setTouchedPass(true);

    if (!isUserValid || !isPassValid) {
      setErrorMessage("Please complete all security fields with valid inputs.");
      return;
    }

    setErrorMessage(null);
    setStage("tunnel");

    // Stage 1: TLS Handshake Simulation
    await new Promise((r) => setTimeout(r, 600));
    setStage("cert");

    // Stage 2: Token Verification Simulation
    await new Promise((r) => setTimeout(r, 700));

    // Attempt authentication via authStore
    const res = await login({
      usernameOrEmail: username,
      password,
      rememberMe,
    });

    if (res.success) {
      setStage("authorized");
      await new Promise((r) => setTimeout(r, 500));
      onSuccess();
    } else {
      setStage("denied");
      setErrorMessage(
        res.error || "ACCESS DENIED: Invalid node credentials."
      );
    }
  };

  const isSubmitting = stage === "tunnel" || stage === "cert" || stage === "authorized";

  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Outer ambient glow */}
      <div className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/20 via-primary-glow/10 to-accent/20 blur-xl opacity-60" />

      {/* Main card chassis */}
      <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-background/90 p-6 sm:p-9 shadow-2xl backdrop-blur-xl">
        <CyberReticle />

        {/* Header Branding */}
        <div className="flex items-start justify-between border-b border-primary/20 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded border border-primary/50 bg-primary/10 text-primary shadow-[0_0_12px_rgba(34,211,238,0.4)]">
                <ShieldCheck className="size-4" />
              </span>
              <h2 className="font-mono text-sm tracking-[0.25em] text-primary uppercase font-bold">
                GRIDSENTINEL<span className="text-accent"> AI</span>
              </h2>
            </div>
            <p className="font-mono text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase">
              CYBER DEFENSE COMMAND · LEVEL 4 GATEWAY
            </p>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 font-mono text-[0.65rem] text-primary">
              <span className="size-1.5 rounded-full bg-success animate-pulse-soft" />
              NODE 07 // ONLINE
            </span>
            <p className="mt-1 font-mono text-[0.6rem] text-muted-foreground tracking-wider">
              CIP-005 PROTOCOL
            </p>
          </div>
        </div>

        {/* Demo Mode Notice Banner */}
        <div className="mt-4 rounded-md border border-accent/30 bg-accent/10 px-3.5 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="size-3.5 text-accent animate-pulse" />
              <span className="font-mono text-[0.68rem] font-medium tracking-wide text-accent uppercase">
                Interactive Demo Portal
              </span>
            </div>
            <button
              type="button"
              onClick={handleAutoFill}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1 font-mono text-[0.68rem] font-semibold text-primary hover:text-primary-glow underline underline-offset-2 transition-colors cursor-pointer"
            >
              <Sparkles className="size-3" />
              Auto-fill Gowtham ID
            </button>
          </div>
          <p className="mt-1 font-mono text-[0.6rem] text-muted-foreground leading-relaxed">
            FastAPI integration ready. Evaluating frontend security controller with simulated clearance.
          </p>
        </div>

        {/* Error Alert Box */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 overflow-hidden"
            >
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3.5 py-2.5 flex items-start gap-2.5">
                <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
                <div className="text-xs text-destructive">
                  <p className="font-semibold uppercase tracking-wider font-mono text-[0.7rem]">
                    SECURITY REJECTION
                  </p>
                  <p className="mt-0.5 leading-snug">{errorMessage}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Operator ID Field */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label
                htmlFor="operator-id"
                className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground/80 flex items-center gap-1.5"
              >
                <User className="size-3 text-primary" />
                Operator Call-Sign / Email
              </label>
              <span className="font-mono text-[0.62rem] text-muted-foreground">
                e.g. gowtham@gridsentinel.ai
              </span>
            </div>

            <div className="relative">
              <input
                id="operator-id"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onBlur={() => setTouchedUser(true)}
                disabled={isSubmitting}
                placeholder="Enter operator callsign or email"
                className={cn(
                  "w-full rounded-md border bg-void/70 px-3.5 py-2.5 font-mono text-sm text-foreground transition-all placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2",
                  userError
                    ? "border-destructive focus:border-destructive focus:ring-destructive/30"
                    : "border-primary/30 focus:border-primary focus:ring-primary/30 focus:shadow-[0_0_15px_rgba(34,211,238,0.25)]"
                )}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[0.65rem] text-muted-foreground/60 pointer-events-none">
                [UID]
              </span>
            </div>
            {userError && (
              <p className="font-mono text-[0.65rem] text-destructive">
                {userError}
              </p>
            )}
          </div>

          {/* Password Field with Show/Hide */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label
                htmlFor="passcode"
                className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-foreground/80 flex items-center gap-1.5"
              >
                <Lock className="size-3 text-primary" />
                Security Passcode
              </label>
              <span className="font-mono text-[0.62rem] text-muted-foreground">
                min 6 characters
              </span>
            </div>

            <div className="relative">
              <input
                id="passcode"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouchedPass(true)}
                disabled={isSubmitting}
                placeholder="••••••••••••"
                className={cn(
                  "w-full rounded-md border bg-void/70 px-3.5 py-2.5 font-mono text-sm text-foreground pr-10 transition-all placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2",
                  passError
                    ? "border-destructive focus:border-destructive focus:ring-destructive/30"
                    : "border-primary/30 focus:border-primary focus:ring-primary/30 focus:shadow-[0_0_15px_rgba(34,211,238,0.25)]"
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide passcode" : "Show passcode"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors cursor-pointer p-1"
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {passError && (
              <p className="font-mono text-[0.65rem] text-destructive">
                {passError}
              </p>
            )}
          </div>

          {/* Remember Me Option */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isSubmitting}
                className="size-4 rounded border-primary/40 bg-void text-primary accent-primary focus:ring-primary/30 cursor-pointer"
              />
              <span className="font-mono text-xs text-foreground/80 hover:text-foreground">
                Remember operator node
              </span>
            </label>
            <span className="font-mono text-[0.65rem] text-muted-foreground">
              AES-256 Storage
            </span>
          </div>

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "relative w-full overflow-hidden rounded-md border font-mono text-xs font-bold uppercase tracking-[0.22em] transition-all duration-300 py-3.5 px-6 flex items-center justify-center gap-2.5 cursor-pointer shadow-lg",
                isSubmitting
                  ? "border-primary/50 bg-primary/20 text-primary-glow cursor-wait"
                  : "border-primary bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_24px_rgba(34,211,238,0.6)]"
              )}
            >
              {/* Dynamic Scanning Bar Animation during submission */}
              {isSubmitting && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                />
              )}

              {stage === "tunnel" && (
                <>
                  <RefreshCw className="size-4 animate-spin text-primary" />
                  <span>Establishing Encrypted Tunnel...</span>
                </>
              )}
              {stage === "cert" && (
                <>
                  <Terminal className="size-4 animate-pulse text-accent" />
                  <span>Verifying Node Certificate...</span>
                </>
              )}
              {stage === "authorized" && (
                <>
                  <CheckCircle2 className="size-4 text-success" />
                  <span>Clearance Granted · Launching...</span>
                </>
              )}
              {stage === "idle" && (
                <>
                  <span>Authenticate Operator</span>
                  <ArrowRight className="size-4" />
                </>
              )}
              {stage === "denied" && (
                <>
                  <span>Re-Attempt Authentication</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer Navigation & Telemetry */}
        <div className="mt-6 border-t border-primary/20 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          {onBackToGalaxy && (
            <button
              type="button"
              onClick={onBackToGalaxy}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 font-mono text-[0.68rem] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <Orbit className="size-3" />
              Return to Galaxy Gateway
            </button>
          )}

          <div className="font-mono text-[0.62rem] text-muted-foreground/70">
            <span>GridSentinel Security Kernel v4.2</span>
          </div>
        </div>
      </div>
    </div>
  );
}

