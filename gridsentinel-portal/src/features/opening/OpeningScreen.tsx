import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import { GalaxyCanvas } from "./scene/GalaxyCanvas";
import { createRig, RIG_IDLE_FOV, RIG_IDLE_Z } from "./rig";
import { InitializeButton } from "./ui/InitializeButton";

type Phase = "intro" | "ready" | "launching";

const ease = [0.16, 1, 0.3, 1] as const;

export interface OpeningScreenProps {
  operatorName: string;
  /** Called once the camera has passed through the portal. */
  onEnter: () => void;
}

/**
 * Self-contained cinematic opening. Knows nothing about the dashboard:
 * it only calls `onEnter` when the portal transition completes.
 */
export function OpeningScreen({ operatorName, onEnter }: OpeningScreenProps) {
  const rigRef = useRef(createRig());
  const rig = rigRef.current;
  const flashRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const timeline = useRef<gsap.core.Timeline | null>(null);

  const handleReady = useCallback(() => {
    wrapRef.current?.setAttribute("data-scene-ready", "true");
  }, []);

  // Intro dolly from deep space to the portal.
  useEffect(() => {
    const tl = gsap.timeline({ onComplete: () => setPhase((p) => (p === "intro" ? "ready" : p)) });
    tl.to(rig, { z: RIG_IDLE_Z, duration: 4.2, ease: "power3.out" }, 0.2);
    tl.fromTo(rig, { fov: 80 }, { fov: RIG_IDLE_FOV, duration: 4.2, ease: "power3.out" }, 0.2);
    timeline.current = tl;
    return () => {
      tl.kill();
    };
  }, [rig]);

  // Pointer parallax (writes to the rig, never React state).
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      rig.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      rig.pointerY = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [rig]);

  const launch = useCallback(() => {
    if (phase === "launching") return;
    setPhase("launching");
    timeline.current?.kill();
    gsap.killTweensOf(rig);

    const tl = gsap.timeline({ onComplete: onEnter });
    tl.to(rig, { boost: 1, duration: 1.3, ease: "power2.inOut" }, 0)
      .to(rig, { z: 7.5, fov: 50, duration: 1.4, ease: "power2.inOut" }, 0.1)
      .to(rig, { warp: 1, duration: 1.1, ease: "power2.in" }, 1.1)
      .to(rig, { z: -6, fov: 118, duration: 1.7, ease: "power4.in" }, 1.35)
      .to(flashRef.current, { opacity: 1, duration: 0.55, ease: "power2.in" }, 2.55)
      .to({}, { duration: 0.25 });
    timeline.current = tl;
  }, [phase, rig, onEnter]);

  // Keyboard: Enter initialises.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && phase !== "launching") launch();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [launch, phase]);

  useEffect(() => () => void timeline.current?.kill(), []);

  const launching = phase === "launching";

  return (
    <div ref={wrapRef} className="relative h-dvh w-full overflow-hidden bg-void">
      <GalaxyCanvas rig={rig} onReady={handleReady} />

      <div className="pointer-events-none fixed inset-0 bg-vignette" />

      <AnimatePresence>
        {!launching && (
          <motion.div
            key="overlay"
            className="pointer-events-none fixed inset-0 flex flex-col"
            exit={{ opacity: 0, scale: 1.08, filter: "blur(10px)" }}
            transition={{ duration: 0.8, ease }}
          >
            {/* Top HUD */}
            <motion.header
              className="flex items-start justify-between p-5 sm:p-8"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 1.2, ease }}
            >
              <div className="space-y-1.5">
                <p className="hud-label text-primary">GS // Secure Node 07</p>
                <p className="hud-label hidden sm:block">Sector 7G · Orbital Uplink</p>
              </div>
              <div className="flex items-center gap-2 hud-label">
                <span className="size-1.5 rounded-full bg-success animate-pulse-soft" />
                Link stable
              </div>
            </motion.header>

            {/* Centre titles */}
            <div className="relative flex flex-1 flex-col items-center justify-center px-4 text-center">
              <motion.div
                aria-hidden
                className="absolute left-1/2 top-1/2 -z-10 h-[70%] w-[min(1100px,120vw)] -translate-x-1/2 -translate-y-1/2 bg-scrim"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 2 }}
              />
              <motion.p
                className="hud-label text-accent text-glow-accent sm:text-xs"
                initial={{ opacity: 0, letterSpacing: "0.9em" }}
                animate={{ opacity: 1, letterSpacing: "0.42em" }}
                transition={{ delay: 1.2, duration: 1.8, ease }}
              >
                Welcome to the Grid
              </motion.p>

              <motion.h1
                className="text-title mt-5 text-[clamp(1.6rem,6.2vw,5.25rem)] leading-none"
                initial={{ opacity: 0, y: 24, filter: "blur(14px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 1.6, duration: 1.6, ease }}
              >
                GRIDSENTINEL<span className="text-accent"> AI</span>
              </motion.h1>

              <motion.div
                className="mt-6 h-px w-40 bg-gradient-to-r from-transparent via-primary to-transparent sm:w-72"
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 2.2, duration: 1.2, ease }}
              />

              <motion.p
                className="mt-6 font-mono text-sm uppercase tracking-[0.36em] text-foreground/85 text-glow sm:text-base"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.4, duration: 1.2 }}
              >
                Welcome, {operatorName}
              </motion.p>

              <div className="pointer-events-auto mt-12">
                <InitializeButton onClick={launch} disabled={launching} />
              </div>

              <motion.p
                className="hud-label mt-5 hidden sm:block"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.9 }}
                transition={{ delay: 3.6, duration: 1 }}
              >
                Press Enter to engage
              </motion.p>
            </div>

            {/* Bottom HUD */}
            <motion.footer
              className="flex items-end justify-between p-5 sm:p-8"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 1.2, ease }}
            >
              <div className="hud-label space-y-1.5 whitespace-nowrap">
                <p>RA 17h 45m 40s</p>
                <p className="hidden sm:block">DEC −29° 00′ 28″</p>
              </div>
              <div className="hud-label space-y-1.5 whitespace-nowrap text-right">
                <p className="hidden sm:block">Threat matrix · armed</p>
                <p className="text-primary">v4.2 · Sentinel Core</p>
              </div>
            </motion.footer>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Portal white-out, driven by GSAP */}
      <div ref={flashRef} className="pointer-events-none fixed inset-0 bg-flash opacity-0" />
    </div>
  );
}
