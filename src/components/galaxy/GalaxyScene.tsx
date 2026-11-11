import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { useMemo, useRef, Suspense } from "react";
import * as THREE from "three";

// Helper for soft radial glow textures (Natural astronomical colors only - NO GREEN)
function createGlowTexture(inner: string, mid: string, outer: string) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.35, mid);
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// -------------------------------------------------------------
// 1. ROTATING SPIRAL MILKY WAY GALAXY DISC
// High-resolution realistic spiral galaxy with visible arms,
// purple, violet, cyan, blue, subtle pink, and warm golden core.
// -------------------------------------------------------------
function RotatingMilkyWayDisc() {
  const discRef = useRef<THREE.Group>(null);
  const texture = useLoader(THREE.TextureLoader, "/galaxy.jpg");

  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
  }, [texture]);

  // Core golden glow texture
  const coreTex = useMemo(
    () =>
      createGlowTexture(
        "rgba(255,255,255,1)",
        "rgba(254,243,199,0.85)",
        "rgba(245,158,11,0)"
      ),
    []
  );

  // Soft violet-blue outer galactic corona texture
  const coronaTex = useMemo(
    () =>
      createGlowTexture(
        "rgba(219,234,254,0.4)",
        "rgba(147,197,253,0.18)",
        "rgba(0,0,0,0)"
      ),
    []
  );

  const coreRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const dt = Math.min(delta, 0.05);

    // Continuous, smooth visible rotation of the galaxy disc around its center
    if (discRef.current) {
      discRef.current.rotation.z += dt * 0.042;
    }

    // Gentle breathing pulse of the core
    const pulse = 1 + Math.sin(t * 1.4) * 0.06;
    if (coreRef.current) coreRef.current.scale.set(pulse, pulse, 1);
    if (coronaRef.current) coronaRef.current.scale.setScalar(1.2 + Math.sin(t * 0.7) * 0.08);
  });

  return (
    // Tilt the galaxy disc to create an authentic inclined 3D perspective
    <group position={[0, -1, -16]} rotation={[-1.02, 0.22, -0.26]}>
      <group ref={discRef}>
        {/* Main High-Resolution Spiral Galaxy Texture Mesh */}
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[115, 115]} />
          <meshBasicMaterial
            map={texture}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            opacity={0.96}
          />
        </mesh>

        {/* Luminous Warm Golden Core Bulge Layer */}
        <mesh ref={coreRef} position={[0, 0, 0.2]}>
          <planeGeometry args={[32, 32]} />
          <meshBasicMaterial
            map={coreTex}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            opacity={0.9}
          />
        </mesh>

        {/* Soft Violet-Blue Outer Galactic Corona */}
        <mesh ref={coronaRef} position={[0, 0, 0.1]}>
          <planeGeometry args={[70, 70]} />
          <meshBasicMaterial
            map={coronaTex}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            opacity={0.4}
          />
        </mesh>

        {/* Embedded Luminous Stellar Clusters along Spiral Arms */}
        <GalacticArmClusters />
      </group>
    </group>
  );
}

// -------------------------------------------------------------
// 2. EMBEDDED SPIRAL ARM STELLAR CLUSTERS & H II REGIONS
// Natural white, diamond silver, and celestial blue star knots
// that rotate with the galaxy arms.
// -------------------------------------------------------------
function GalacticArmClusters() {
  const count = 3500;
  const pointsRef = useRef<THREE.Points>(null);

  const { geo, mat } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const c = new Float32Array(count * 3);
    const s = new Float32Array(count);
    const tw = new Float32Array(count * 2);

    const naturalColors = [
      new THREE.Color("#ffffff"),
      new THREE.Color("#f8fafc"),
      new THREE.Color("#e2e8f0"),
      new THREE.Color("#dbeafe"),
      new THREE.Color("#bfdbfe"),
      new THREE.Color("#fef3c7"),
      new THREE.Color("#fbcfe8"), // Subtle pink H II region stars
    ];

    const branches = 4;
    const radius = 54;
    const spin = 1.6;

    for (let i = 0; i < count; i++) {
      const arm = i % branches;
      const r = 8 + Math.pow(Math.random(), 1.4) * (radius - 8);
      const branchAngle = (arm * 2 * Math.PI) / branches;
      const spinAngle = Math.pow(r / radius, 0.78) * spin * Math.PI * 2;

      const normR = r / radius;
      const armWidth = (0.12 + normR * 0.28) * r;

      const randX = Math.pow(Math.random(), 2.5) * (Math.random() < 0.5 ? 1 : -1) * armWidth;
      const randY = Math.pow(Math.random(), 2.5) * (Math.random() < 0.5 ? 1 : -1) * armWidth;
      const randZ = (Math.random() - 0.5) * 2.0 * Math.exp(-r / 30);

      p[i * 3] = Math.cos(branchAngle + spinAngle) * r + randX;
      p[i * 3 + 1] = Math.sin(branchAngle + spinAngle) * r + randY;
      p[i * 3 + 2] = randZ + 0.3; // slightly above disc plane

      const col = naturalColors[Math.floor(Math.random() * naturalColors.length)];
      c[i * 3] = col.r;
      c[i * 3 + 1] = col.g;
      c[i * 3 + 2] = col.b;

      s[i] = 0.8 + Math.random() * 1.4;
      tw[i * 2] = Math.random() * Math.PI * 2;
      tw[i * 2 + 1] = 1.0 + Math.random() * 3.5;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    g.setAttribute("aScale", new THREE.BufferAttribute(s, 1));
    g.setAttribute("aTw", new THREE.BufferAttribute(tw, 2));

    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute float aScale;
        attribute vec2 aTw;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;

        void main() {
          vColor = color;
          vec3 pos = position;
          float twinkle = 0.7 + 0.3 * sin(uTime * aTw.y + aTw.x);
          vAlpha = twinkle;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = (1.8 * aScale * twinkle) * (360.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float dist = length(gl_PointCoord - 0.5);
          if (dist > 0.5) discard;
          float core = smoothstep(0.2, 0.0, dist);
          float halo = smoothstep(0.5, 0.0, dist);
          float intensity = core * 0.8 + halo * 0.35;
          gl_FragColor = vec4(vColor * 1.25, intensity * vAlpha);
        }
      `,
    });

    return { geo: g, mat: m };
  }, []);

  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime;
  });

  return <points ref={pointsRef} geometry={geo} material={mat} />;
}

// -------------------------------------------------------------
// 3. DEEP SPACE DRIFT STARS (Natural silver/blue/white)
// Thousands of realistic stars slowly gliding towards camera,
// creating a cinematic feeling of travelling through the universe.
// -------------------------------------------------------------
function DeepSpaceDriftStars() {
  const count = 4500;
  const ref = useRef<THREE.Points>(null);

  const { geo, mat } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const c = new Float32Array(count * 3);
    const tw = new Float32Array(count * 2);

    const naturalPalette = [
      new THREE.Color("#ffffff"),
      new THREE.Color("#f8fafc"),
      new THREE.Color("#e2e8f0"),
      new THREE.Color("#dbeafe"),
      new THREE.Color("#fef3c7"),
      new THREE.Color("#bfdbfe"),
    ];

    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 260;
      p[i * 3 + 1] = (Math.random() - 0.5) * 160;
      p[i * 3 + 2] = -Math.random() * 280 + 20;

      const col = naturalPalette[Math.floor(Math.random() * naturalPalette.length)];
      c[i * 3] = col.r;
      c[i * 3 + 1] = col.g;
      c[i * 3 + 2] = col.b;

      tw[i * 2] = Math.random() * Math.PI * 2;
      tw[i * 2 + 1] = 1.0 + Math.random() * 3.0;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    g.setAttribute("aTw", new THREE.BufferAttribute(tw, 2));

    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute vec2 aTw;
        varying vec3 vColor;
        varying float vTw;
        uniform float uTime;

        void main() {
          vColor = color;
          vec3 pos = position;
          vTw = 0.55 + 0.45 * sin(uTime * aTw.y + aTw.x);

          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = (1.5 + vTw * 1.8) * (380.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vTw;

        void main() {
          float dist = length(gl_PointCoord - 0.5);
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, dist);
          gl_FragColor = vec4(vColor * (1.0 + vTw * 0.4), alpha * vTw);
        }
      `,
    });

    return { geo: g, mat: m };
  }, []);

  useFrame(({ clock }, delta) => {
    mat.uniforms.uTime.value = clock.elapsedTime;
    const dt = Math.min(delta, 0.05);

    // Continuous, elegant forward star motion towards camera creating depth
    const speed = 1.4;
    const positions = geo.attributes.position.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const idx = i * 3 + 2;
      positions[idx] += speed * dt;
      if (positions[idx] > 32) {
        positions[idx] = -240;
      }
    }
    geo.attributes.position.needsUpdate = true;
  });

  return <points ref={ref} geometry={geo} material={mat} />;
}

// -------------------------------------------------------------
// 4. CINEMATIC CAMERA RIG (Slow push towards galaxy & mouse parallax)
// -------------------------------------------------------------
function CameraRig() {
  useFrame(({ camera, clock, pointer }, delta) => {
    const t = clock.elapsedTime;
    const dt = Math.min(delta, 0.05);

    // Subtle, continuous camera glide towards the galaxy
    const targetZ = 34 + 14 * Math.exp(-t * 0.12);

    const targetX = Math.sin(t * 0.04) * 2.0 + pointer.x * 1.8;
    const targetY = Math.cos(t * 0.035) * 1.1 + pointer.y * 1.0;

    camera.position.z += (targetZ - camera.position.z) * (1 - Math.exp(-2.0 * dt));
    camera.position.x += (targetX - camera.position.x) * (1 - Math.exp(-1.6 * dt));
    camera.position.y += (targetY - camera.position.y) * (1 - Math.exp(-1.6 * dt));

    camera.lookAt(0, -1, -16);
  });
  return null;
}

// -------------------------------------------------------------
// MAIN SCENE EXPORT (Deep natural black background)
// -------------------------------------------------------------
export default function GalaxyScene() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: false, powerPreference: "low-power" }}
      camera={{ position: [0, 0, 48], fov: 60, far: 500 }}
      onCreated={({ gl }) =>
        gl.domElement.parentElement?.parentElement?.setAttribute("data-scene-ready", "true")
      }
    >
      {/* Deep natural cosmic black & midnight blue background */}
      <color attach="background" args={["#010104"]} />
      <fog attach="fog" args={["#010104", 90, 360]} />
      <DeepSpaceDriftStars />
      <Suspense fallback={null}>
        <RotatingMilkyWayDisc />
      </Suspense>
      <CameraRig />
    </Canvas>
  );
}
