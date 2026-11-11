import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Shield, Radio, Terminal } from "lucide-react";
import { CyberLoginCard } from "./CyberLoginCard";

export function LoginScreen() {
  const navigate = useNavigate();

  const handleSuccess = useCallback(() => {
    void navigate({ to: "/dashboard", replace: true });
  }, [navigate]);

  const handleBackToGalaxy = useCallback(() => {
    void navigate({ to: "/" });
  }, [navigate]);

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-void bg-grid flex flex-col justify-between p-4 sm:p-8">
      {/* Portal transition flash dissolve from Galaxy warp */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-50 bg-flash"
        initial={{ opacity: 0.9 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />

      {/* Background ambient radial glow */}
      <div className="pointer-events-none fixed inset-0 bg-radial-[ellipse_80%_80%_at_50%_40%] from-primary/10 via-transparent to-void" />

      {/* Cyber animated scanline */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-25">
        <div className="h-24 w-full bg-gradient-to-b from-transparent via-primary/20 to-transparent animate-scan" />
      </div>

      {/* Top HUD */}
      <motion.header
        className="relative z-10 flex items-center justify-between border-b border-primary/20 pb-4"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded border border-primary/40 bg-primary/10 text-primary shadow-[0_0_12px_rgba(34,211,238,0.5)]">
            <Shield className="size-4.5" />
          </div>
          <div>
            <h1 className="font-mono text-xs font-bold tracking-[0.25em] text-primary uppercase">
              GRIDSENTINEL<span className="text-accent"> AI</span>
            </h1>
            <p className="font-mono text-[0.62rem] text-muted-foreground tracking-widest">
              SECURE OPERATOR ACCESS PORTAL
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 font-mono text-[0.68rem]">
          <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground">
            <Radio className="size-3 text-primary animate-pulse" />
            <span>CIP-005 PERIMETER ACTIVE</span>
          </div>
          <div className="flex items-center gap-2 rounded border border-primary/30 bg-primary/5 px-2.5 py-1 text-primary">
            <span className="size-1.5 rounded-full bg-success animate-pulse-soft" />
            <span>NODE 07</span>
          </div>
        </div>
      </motion.header>

      {/* Center Login Form */}
      <motion.main
        className="relative z-10 my-auto flex w-full items-center justify-center py-6"
        initial={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ delay: 0.2, duration: 0.8 }}
      >
        <CyberLoginCard
          onSuccess={handleSuccess}
          onBackToGalaxy={handleBackToGalaxy}
        />
      </motion.main>

      {/* Bottom HUD */}
      <motion.footer
        className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-primary/20 pt-4 font-mono text-[0.62rem] text-muted-foreground"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.8 }}
      >
        <div className="flex items-center gap-3">
          <Terminal className="size-3 text-primary" />
          <span>CYBER-PHYSICAL SYSTEM SMART CONTROLLER</span>
        </div>
        <div className="flex items-center gap-4">
          <span>PROBLEM ID: DL-SJBIT-HK26-GOVP007</span>
          <span className="text-primary">AES-256-GCM HARDENED</span>
        </div>
      </motion.footer>
    </div>
  );
}
