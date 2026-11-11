import { memo, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import { particleBudget, type Rig } from "../rig";
import { Starfield } from "./Starfield";
import { SpiralGalaxy } from "./SpiralGalaxy";
import { Nebula } from "./Nebula";
import { Portal } from "./Portal";
import { HoloRings } from "./HoloRings";
import { WarpStreaks } from "./WarpStreaks";

/** The single camera driver: reads the GSAP-tweened rig every frame. */
function CameraRig({ rig, onReady }: { rig: Rig; onReady: () => void }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const smooth = useRef({ x: 0, y: 0 });
  const readyFired = useRef(false);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const calm = 1 - rig.warp;

    // pointer parallax, eased with exponential damping
    const k = 1 - Math.exp(-2.5 * dt);
    smooth.current.x += (rig.pointerX - smooth.current.x) * k;
    smooth.current.y += (rig.pointerY - smooth.current.y) * k;

    const driftX = Math.sin(t * 0.11) * 0.9 + smooth.current.x * 1.6;
    const driftY = Math.cos(t * 0.09) * 0.5 + smooth.current.y * 0.9;
    const shake = rig.warp * rig.warp * 0.06;

    camera.position.set(
      driftX * calm + (Math.random() - 0.5) * shake,
      driftY * calm + (Math.random() - 0.5) * shake,
      rig.z,
    );
    camera.lookAt(0, 0, rig.z - 20);
    camera.rotation.z = Math.sin(t * 0.07) * 0.02 * calm + rig.warp * 0.12;

    if (Math.abs(camera.fov - rig.fov) > 0.01) {
      camera.fov = rig.fov;
      camera.updateProjectionMatrix();
    }

    if (!readyFired.current) {
      readyFired.current = true;
      onReady();
    }
  });

  return null;
}

function World({ rig, onReady }: { rig: Rig; onReady: () => void }) {
  const size = useThree((s) => s.size);
  // Budget is fixed at mount so resizing never rebuilds geometry.
  const budget = useMemo(() => particleBudget(size.width), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <color attach="background" args={["#03060f"]} />
      <fog attach="fog" args={["#03060f", 120, 340]} />
      <CameraRig rig={rig} onReady={onReady} />
      <Nebula />
      <Starfield count={budget.stars} />
      <SpiralGalaxy count={budget.galaxy} />
      <Portal rig={rig} accretion={budget.accretion} />
      <HoloRings rig={rig} />
      <WarpStreaks rig={rig} count={budget.streaks} />
    </>
  );
}

function GalaxyCanvasImpl({ rig, onReady }: { rig: Rig; onReady: () => void }) {
  const [dpr, setDpr] = useState(1.5);
  return (
    <Canvas
      dpr={[1, dpr]}
      camera={{ position: [0, 0, rig.z], fov: rig.fov, near: 0.1, far: 600 }}
      gl={{ antialias: false, powerPreference: "high-performance", alpha: false }}
      className="!fixed inset-0"
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} />
      <World rig={rig} onReady={onReady} />
      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={0.95} luminanceThreshold={0.24} luminanceSmoothing={0.3} radius={0.75} />
        <Vignette eskil={false} offset={0.25} darkness={0.85} />
      </EffectComposer>
    </Canvas>
  );
}

/** Memoised so overlay UI state changes never re-render the 3D shell. */
export const GalaxyCanvas = memo(GalaxyCanvasImpl);
