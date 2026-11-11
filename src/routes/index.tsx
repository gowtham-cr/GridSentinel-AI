import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { lazy, Suspense, useState, useEffect } from "react";
import LoginPanel from "@/components/auth/LoginPanel";

const GalaxyScene = lazy(() => import("@/components/galaxy/GalaxyScene"));
const ParticleTextScene = lazy(() => import("@/components/galaxy/ParticleTextScene"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GridSentinel AI — Smart Grid Cybersecurity Defense" },
      { name: "description", content: "AI-Powered Cyber-Physical Protection for Smart Grids & Microgrids." },
    ],
  }),
  component: Awakening,
});

function Awakening() {
  const [isLoginActive, setIsLoginActive] = useState(false);

  const handleEnterUnknown = () => {
    setIsLoginActive(true);
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", "/login");
    }
  };

  const handleLoginSuccess = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/overview";
    }
  };

  // Keyboard shortcut: Press Enter to engage
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !isLoginActive) {
        handleEnterUnknown();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isLoginActive]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#010103] select-none">
      {/* 
        Realistic Astronomical Milky Way Spiral Galaxy Background
        Smoothly softens and deepens when transitioning to the login screen
      */}
      <motion.div
        className="absolute inset-0"
        animate={{
          opacity: isLoginActive ? 0.35 : 1,
          scale: isLoginActive ? 1.04 : 1,
        }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <ClientOnly fallback={null}>
          <Suspense fallback={null}>
            <GalaxyScene />
          </Suspense>
        </ClientOnly>
      </motion.div>

      {/* Deep Navy / Charcoal Atmosphere Overlay (Fades in during login transition) */}
      <motion.div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#02050e]/80 via-[#060c1c]/88 to-[#02050e]/95 backdrop-blur-[3px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoginActive ? 1 : 0 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Subtle Blue-White Radial Highlight for Login Ambience */}
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-900/15 via-transparent to-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoginActive ? 1 : 0 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Subtle vignette for cinematic depth */}
      <div className="vignette pointer-events-none absolute inset-0 z-[5]" />

      {/* Tactical Sci-Fi HUD Overlays (Matching GS Secure Node 07 specification) */}
      <AnimatePresence>
        {!isLoginActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="pointer-events-none absolute inset-0 z-[8] flex flex-col justify-between p-6 sm:p-10 font-mono text-xs"
          >
            {/* Top HUD Bar */}
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2 tracking-[0.25em] text-cyan-400 font-semibold drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
                  <span>GS // SECURE NODE 07</span>
                </div>
                <div className="text-[10px] tracking-[0.2em] text-cyan-500/70">
                  SECTOR 7G • ORBITAL TELEMETRY UPLINK
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-cyan-500/30 bg-black/40 px-3 py-1 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[10px] tracking-[0.2em] text-emerald-300 uppercase">LINK STABLE</span>
              </div>
            </div>

            {/* Subtle concentric rotating reticle rings behind center text */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-25">
              <div className="h-[420px] w-[420px] rounded-full border border-dashed border-cyan-400/40 animate-[spin_60s_linear_infinite]" />
              <div className="absolute inset-4 rounded-full border border-cyan-500/30 animate-[spin_40s_linear_infinite_reverse]" />
            </div>

            {/* Bottom HUD Bar */}
            <div className="flex items-end justify-between text-[11px] text-cyan-400/60 tracking-[0.2em]">
              <div>
                <span>RA 17H 45M 40S</span>
                <span className="mx-2 text-cyan-600">•</span>
                <span>DEC -29° 00&apos; 28&quot;</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-emerald-400/80 font-medium">THREAT MATRIX • ARMED</span>
                <span className="hidden sm:inline text-cyan-600">•</span>
                <span className="hidden sm:inline text-cyan-500/70">IEEE 1547.4 ACTIVE</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Content: Welcome Screen vs. Login Screen */}
      <AnimatePresence mode="wait">
        {!isLoginActive ? (
          <motion.div
            key="welcome-experience"
            className="absolute inset-0 z-10"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(8px)", scale: 0.98 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <ClientOnly fallback={null}>
              <Suspense fallback={null}>
                <ParticleTextScene onEnterUnknown={handleEnterUnknown} />
              </Suspense>
            </ClientOnly>
          </motion.div>
        ) : (
          <motion.div
            key="login-experience"
            className="relative z-20 flex h-full items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.15 }}
          >
            <LoginPanel onSuccess={handleLoginSuccess} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
