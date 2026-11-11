import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, FastForward } from "lucide-react";

interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  lineIdx: number;
  charIdx: number;
  isAssigned: boolean;
  state: "traveling" | "swirling" | "assembling" | "settled";
  arrivalFlash: number;
  shimmerPhase: number;
  baseRadius: number;
  swirlAngle: number;
  swirlRadius: number;
  swirlSpeed: number;
}

const LINE_1_TEXT = "GRIDSENTINEL AI";
const LINE_2_TEXT = "WELCOME TO THE GRID";
const TAGLINE_TEXT = "CYBER-PHYSICAL DEFENSE • IEEE 1547 RESILIENT CONTROLLER";

interface ParticleTextSceneProps {
  onEnterUnknown?: () => void;
}

export default function ParticleTextScene({ onEnterUnknown }: ParticleTextSceneProps = {}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Character element refs for exact layout alignment
  const line1SpanRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const line2SpanRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // Letter-by-letter reveal state
  const [revealedL1, setRevealedL1] = useState<boolean[]>(() =>
    new Array(LINE_1_TEXT.length).fill(false)
  );
  const [revealedL2, setRevealedL2] = useState<boolean[]>(() =>
    new Array(LINE_2_TEXT.length).fill(false)
  );

  const [showTagline, setShowTagline] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);
  const [energyWaveX, setEnergyWaveX] = useState<number | null>(null);

  const stateRef = useRef({
    startTime: 0,
    currentTime: 0,
    forcedTime: -1,
    taglineTriggered: false,
    buttonTriggered: false,
    textBounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
    isReady: false,
  });

  const skipToEnd = useCallback(() => {
    setIsSkipped(true);
    stateRef.current.forcedTime = 11.0;
    setRevealedL1(new Array(LINE_1_TEXT.length).fill(true));
    setRevealedL2(new Array(LINE_2_TEXT.length).fill(true));
    setShowTagline(true);
    setShowButton(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter" || e.code === "Escape") {
        if (!stateRef.current.buttonTriggered) {
          skipToEnd();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [skipToEnd]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let animationFrameId: number;
    let particles: Particle[] = [];

    // Pre-rendered high-performance glowing emerald particle sprite
    const spriteDot = document.createElement("canvas");
    spriteDot.width = spriteDot.height = 16;
    const sCtx = spriteDot.getContext("2d")!;
    const grad = sCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, "rgba(255, 255, 255, 1)");
    grad.addColorStop(0.25, "rgba(167, 243, 208, 0.95)");
    grad.addColorStop(0.65, "rgba(52, 211, 153, 0.45)");
    grad.addColorStop(1, "rgba(16, 185, 129, 0)");
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 16, 16);

    function buildParticles() {
      if (!container) return;
      particles = [];

      const centerX = width / 2;
      const centerY = height * 0.22; // Target center around upper 20% area

      const offscreen = document.createElement("canvas");
      offscreen.width = width;
      offscreen.height = height;
      const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
      if (!offCtx) return;

      let overallMinX = Infinity;
      let overallMaxX = -Infinity;
      let overallMinY = Infinity;
      let overallMaxY = -Infinity;

      function sampleLine(
        text: string,
        lineIdx: number,
        spanRefs: (HTMLSpanElement | null)[]
      ) {
        for (let charIdx = 0; charIdx < text.length; charIdx++) {
          const char = text[charIdx];
          if (char === " ") continue;

          const span = spanRefs[charIdx];
          if (!span) continue;

          const rect = span.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;

          if (rect.left < overallMinX) overallMinX = rect.left;
          if (rect.right > overallMaxX) overallMaxX = rect.right;
          if (rect.top < overallMinY) overallMinY = rect.top;
          if (rect.bottom > overallMaxY) overallMaxY = rect.bottom;

          const computedStyle = window.getComputedStyle(span);
          const font = computedStyle.font || `700 ${rect.height * 0.8}px "Space Grotesk", sans-serif`;

          offCtx!.clearRect(0, 0, width, height);
          offCtx!.font = font;
          offCtx!.textBaseline = "middle";
          offCtx!.textAlign = "center";
          offCtx!.fillStyle = "#ffffff";

          const letterCenterX = rect.left + rect.width / 2;
          const letterCenterY = rect.top + rect.height / 2;
          offCtx!.fillText(char, letterCenterX, letterCenterY);

          const sampleX = Math.floor(Math.max(0, rect.left - 4));
          const sampleY = Math.floor(Math.max(0, rect.top - 4));
          const sampleW = Math.ceil(rect.width + 8);
          const sampleH = Math.ceil(rect.height + 8);

          if (sampleW > 0 && sampleH > 0) {
            const imgData = offCtx!.getImageData(sampleX, sampleY, sampleW, sampleH).data;
            const gridStep = Math.max(3, Math.round(rect.height / 11));

            for (let py = 0; py < sampleH; py += gridStep) {
              for (let px = 0; px < sampleW; px += gridStep) {
                const alpha = imgData[(py * sampleW + px) * 4 + 3];
                if (alpha > 140) {
                  const targetX = sampleX + px;
                  const targetY = sampleY + py;

                  // Small emerald particles travel toward upper text area
                  const angle = Math.random() * Math.PI * 2;
                  const dist = Math.max(width, height) * (0.28 + Math.random() * 0.38);
                  const startX = centerX + Math.cos(angle) * dist;
                  const startY = centerY + Math.sin(angle) * dist;

                  particles.push({
                    x: startX,
                    y: startY,
                    targetX,
                    targetY,
                    originX: startX,
                    originY: startY,
                    vx: 0,
                    vy: 0,
                    lineIdx,
                    charIdx,
                    isAssigned: true,
                    state: "traveling",
                    arrivalFlash: 0,
                    shimmerPhase: Math.random() * Math.PI * 2,
                    baseRadius: 1.0 + Math.random() * 0.4,
                    swirlAngle: Math.random() * Math.PI * 2,
                    swirlRadius: 35 + Math.random() * (Math.min(width, height) * 0.2),
                    swirlSpeed: (1.2 + Math.random() * 0.9) * (Math.random() > 0.5 ? 1 : -1),
                  });
                }
              }
            }
          }
        }
      }

      sampleLine(LINE_1_TEXT, 0, line1SpanRefs.current);
      sampleLine(LINE_2_TEXT, 1, line2SpanRefs.current);

      if (overallMinX !== Infinity) {
        stateRef.current.textBounds = {
          minX: overallMinX,
          maxX: overallMaxX,
          minY: overallMinY,
          maxY: overallMaxY,
        };
      }

      stateRef.current.isReady = true;
    }

    const timer = setTimeout(buildParticles, 90);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      buildParticles();
    };
    window.addEventListener("resize", handleResize);

    // Timeline Configuration (Cinematic pacing)
    const T_GATHER_START = 0.4;
    const T_LINE1_START = 1.8;
    const LINE1_INTERVAL = 0.16; // 16 chars * 0.16 = ~2.5s -> ends ~4.4s

    const T_LINE2_START = 4.7;
    const LINE2_INTERVAL = 0.15; // 17 chars * 0.15 = ~2.5s -> ends ~7.2s

    const T_WAVE_START = 8.0;
    const T_TAGLINE_REVEAL = 8.5;
    const T_BUTTON_REVEAL = 9.8;

    let lastTimestamp = performance.now();
    stateRef.current.startTime = lastTimestamp;

    const triggeredL1 = new Set<number>();
    const triggeredL2 = new Set<number>();

    function render(now: number) {
      const dt = Math.min((now - lastTimestamp) / 1000, 0.05);
      lastTimestamp = now;

      if (stateRef.current.forcedTime >= 0) {
        stateRef.current.currentTime = stateRef.current.forcedTime;
      } else {
        stateRef.current.currentTime = (now - stateRef.current.startTime) / 1000;
      }

      const t = stateRef.current.currentTime;
      const centerX = width / 2;
      const centerY = height * 0.22;

      // Reveal Tagline
      if (t >= T_TAGLINE_REVEAL && !stateRef.current.taglineTriggered) {
        stateRef.current.taglineTriggered = true;
        setShowTagline(true);
      }

      // Reveal Button
      if (t >= T_BUTTON_REVEAL && !stateRef.current.buttonTriggered) {
        stateRef.current.buttonTriggered = true;
        setShowButton(true);
      }

      ctx!.clearRect(0, 0, width, height);

      // Energy wave computation
      let waveActive = false;
      let waveX = -9999;
      const bounds = stateRef.current.textBounds;
      const waveSpan = bounds.maxX - bounds.minX;
      const waveWidth = Math.max(130, waveSpan * 0.24);

      if (t >= T_WAVE_START && waveSpan > 0) {
        const wavePeriod = 5.8;
        const waveDuration = 1.5;
        const waveTime = (t - T_WAVE_START) % wavePeriod;

        if (waveTime < waveDuration) {
          waveActive = true;
          const prog = waveTime / waveDuration;
          waveX = bounds.minX - waveWidth * 0.5 + prog * (waveSpan + waveWidth);
          setEnergyWaveX(waveX);
        } else {
          setEnergyWaveX(null);
        }
      }

      // Render Particles (Kept strictly behind and around the letters, never covering them)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // 1. Gather Phase: particles travel toward text center
        if (t >= T_GATHER_START && t < T_LINE1_START && p.isAssigned) {
          const gatherProg = Math.min(1, (t - T_GATHER_START) / (T_LINE1_START - T_GATHER_START));
          p.swirlAngle += p.swirlSpeed * dt * (1 + gatherProg * 2.0);

          const targetR = p.swirlRadius * (1 - gatherProg * 0.75);
          const vx = centerX + Math.cos(p.swirlAngle) * targetR;
          const vy = centerY + Math.sin(p.swirlAngle) * (targetR * 0.4);

          p.x += (vx - p.x) * (4.5 * dt);
          p.y += (vy - p.y) * (4.5 * dt);
        }

        // 2. Assembly Phase: form letters letter by letter
        if (p.isAssigned) {
          let charStartTime = 999;
          if (p.lineIdx === 0) {
            charStartTime = T_LINE1_START + p.charIdx * LINE1_INTERVAL;
          } else {
            charStartTime = T_LINE2_START + p.charIdx * LINE2_INTERVAL;
          }

          if (t >= charStartTime) {
            if (p.state !== "settled") {
              p.state = "assembling";
              const flyTime = t - charStartTime;
              const assembleDuration = 0.45;
              const prog = Math.min(1, flyTime / assembleDuration);

              p.x += (p.targetX - p.x) * Math.min(1, 12 * dt);
              p.y += (p.targetY - p.y) * Math.min(1, 12 * dt);

              if (prog >= 0.92 || Math.hypot(p.x - p.targetX, p.y - p.targetY) < 1.2) {
                p.x = p.targetX;
                p.y = p.targetY;
                p.state = "settled";
                p.arrivalFlash = 1.0;

                // Synchronize crisp letter emergence
                if (p.lineIdx === 0 && !triggeredL1.has(p.charIdx)) {
                  triggeredL1.add(p.charIdx);
                  setRevealedL1((prev) => {
                    const next = [...prev];
                    next[p.charIdx] = true;
                    return next;
                  });
                } else if (p.lineIdx === 1 && !triggeredL2.has(p.charIdx)) {
                  triggeredL2.add(p.charIdx);
                  setRevealedL2((prev) => {
                    const next = [...prev];
                    next[p.charIdx] = true;
                    return next;
                  });
                }
              }
            } else {
              // Settled behind and around the letters
              p.x = p.targetX;
              p.y = p.targetY;
            }
          } else if (t >= T_GATHER_START) {
            p.swirlAngle += p.swirlSpeed * dt * 1.2;
            const vx = centerX + Math.cos(p.swirlAngle) * (p.swirlRadius * 0.3);
            const vy = centerY + Math.sin(p.swirlAngle) * (p.swirlRadius * 0.15);
            p.x += (vx - p.x) * (3.5 * dt);
            p.y += (vy - p.y) * (3.5 * dt);
          }
        }

        if (p.arrivalFlash > 0) {
          p.arrivalFlash = Math.max(0, p.arrivalFlash - dt * 3.5);
        }

        // Render dot sprite
        if (p.isAssigned) {
          if (t < T_GATHER_START && p.state === "traveling") continue;

          let rad = p.baseRadius;
          let alpha = 0.85;

          if (p.state === "settled") {
            const twinkle = Math.sin(t * 3.0 + p.shimmerPhase) * 0.15;
            rad = p.baseRadius + twinkle;

            if (waveActive) {
              const distWave = Math.abs(p.x - waveX);
              if (distWave < waveWidth) {
                const waveFactor = Math.cos((distWave / waveWidth) * Math.PI * 0.5);
                rad += waveFactor * 1.2;
                alpha = 1.0;
              }
            }
          } else if (p.state === "assembling") {
            rad = p.baseRadius * 1.3;
            alpha = 1.0;
          }

          const drawD = rad * 5;
          ctx!.globalAlpha = alpha;
          ctx!.drawImage(spriteDot, p.x - drawD / 2, p.y - drawD / 2, drawD, drawD);
          ctx!.globalAlpha = 1.0;
        }
      }

      animationFrameId = requestAnimationFrame(render);
    }

    animationFrameId = requestAnimationFrame(render);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const line1Chars = useMemo(() => LINE_1_TEXT.split(""), []);
  const line2Chars = useMemo(() => LINE_2_TEXT.split(""), []);

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full select-none flex-col items-center justify-start overflow-hidden px-4 pt-[13vh] sm:pt-[15vh] md:pt-[17vh] lg:pt-[18vh]"
    >
      {/* 
        Canvas Particle Layer (z-10):
        Particles render BEHIND the text layer (z-20) so they NEVER cover the letters!
      */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      />

      {/* Skip Intro Control (Discreet & accessible in upper right) */}
      <AnimatePresence>
        {!showButton && !isSkipped && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute right-6 top-6 z-30"
          >
            <button
              onClick={skipToEnd}
              className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-950/40 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-300 backdrop-blur-md transition hover:border-emerald-400/50 hover:bg-emerald-900/50"
              title="Skip intro animation (Space / Enter)"
            >
              <FastForward className="h-3 w-3 text-emerald-400" />
              <span>Skip Intro</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 
        Main Typography & Interactive Overlay (z-20):
        Positioned in the darker upper space (approx 15-20% from top),
        away from the bright galactic core below.
        Sharp, high-contrast, pure legibility.
      */}
      <div className="relative z-20 flex max-w-4xl flex-col items-center justify-center rounded-3xl bg-black/35 px-6 py-5 text-center shadow-[0_4px_30px_rgba(0,0,0,0.6)] backdrop-blur-[2px] sm:px-8 sm:py-6">
        {/* Line 1: WELCOME, GOWTHAM - Bright Emerald-White */}
        <h1
          className="font-display text-2xl font-bold tracking-[0.16em] text-[#f0fdf4] sm:text-3xl md:text-5xl lg:text-6xl"
          style={{
            textShadow:
              "0 0 10px rgba(52, 211, 153, 0.4), 0 2px 4px rgba(0, 0, 0, 0.9)",
          }}
        >
          {line1Chars.map((char, i) => (
            <span
              key={i}
              ref={(el) => {
                line1SpanRefs.current[i] = el;
              }}
              className="inline-block transition-opacity duration-300"
              style={{
                opacity: revealedL1[i] ? 1 : 0,
              }}
            >
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </h1>

        {/* Line 2: TO THE DARK WORLD - Softer Readable Emerald Shade */}
        <h2
          className="mt-2.5 font-display text-xl font-semibold tracking-[0.20em] text-[#6ee7b7] sm:mt-3 sm:text-2xl md:text-3xl lg:text-4xl"
          style={{
            textShadow:
              "0 0 8px rgba(52, 211, 153, 0.35), 0 2px 4px rgba(0, 0, 0, 0.9)",
          }}
        >
          {line2Chars.map((char, i) => (
            <span
              key={i}
              ref={(el) => {
                line2SpanRefs.current[i] = el;
              }}
              className="inline-block transition-opacity duration-300"
              style={{
                opacity: revealedL2[i] ? 1 : 0,
              }}
            >
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </h2>

        {/* Tagline: BEYOND THE VISIBLE. BEYOND THE ORDINARY. */}
        <div className="mt-4 flex h-6 items-center justify-center sm:mt-5">
          <AnimatePresence>
            {showTagline && (
              <motion.p
                initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="font-mono text-[11px] font-medium uppercase tracking-[0.32em] text-emerald-400/90 drop-shadow-[0_0_8px_rgba(52,211,153,0.35)] sm:text-xs md:text-sm md:tracking-[0.40em]"
              >
                {TAGLINE_TEXT}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Button: ENTER THE UNKNOWN → */}
        <div className="mt-6 flex h-13 items-center justify-center sm:mt-7 md:mt-8">
          <AnimatePresence>
            {showButton && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                {onEnterUnknown ? (
                  <button
                    type="button"
                    onClick={onEnterUnknown}
                    className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-emerald-500/40 bg-black/80 px-7 py-3 font-mono text-xs uppercase tracking-[0.3em] text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.2)] backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-emerald-400 hover:text-white hover:shadow-[0_0_35px_rgba(52,211,153,0.45)] active:scale-95 sm:px-8 sm:py-3.5 sm:text-sm cursor-pointer"
                  >
                    {/* Subtle shine sweep on hover */}
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />

                    {/* Pulsing indicator */}
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                    </span>

                    <span className="font-semibold drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]">
                      Initialize System
                    </span>

                    <ArrowRight className="h-4 w-4 text-emerald-400 transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-emerald-500/40 bg-black/80 px-7 py-3 font-mono text-xs uppercase tracking-[0.3em] text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.2)] backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-emerald-400 hover:text-white hover:shadow-[0_0_35px_rgba(52,211,153,0.45)] active:scale-95 sm:px-8 sm:py-3.5 sm:text-sm"
                  >
                    {/* Subtle shine sweep on hover */}
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />

                    {/* Pulsing indicator */}
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                    </span>

                    <span className="font-semibold drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]">
                      Initialize System
                    </span>

                    <ArrowRight className="h-4 w-4 text-emerald-400 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                )}
                <p className="mt-3 text-center font-mono text-[10px] tracking-[0.25em] text-emerald-400/60 uppercase">
                  Press Enter or Click to Engage
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
