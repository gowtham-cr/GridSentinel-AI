import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { softPointGLSL } from "./glsl";

const RADIUS = 34;
const BRANCHES = 4;
const SPIN = 1.15;

const vertex = /* glsl */ `
attribute float aScale;
attribute vec3 aColor;
attribute vec3 aJitter;
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
varying vec3 vColor;
void main(){
  float d = max(length(position.xz), 0.4);
  // gentle differential rotation: inner arms turn faster
  float ang = atan(position.x, position.z) + uTime * (0.015 + 0.35 / (d + 6.0));
  vec3 p = vec3(sin(ang) * d, position.y, cos(ang) * d) + aJitter;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(uSize * aScale * uPixelRatio / -mv.z, 0.0, 32.0);
  vColor = aColor;
}
`;

const fragment = /* glsl */ `
${softPointGLSL}
varying vec3 vColor;
void main(){
  float a = softPoint();
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor, a * 0.85);
}
`;

export function SpiralGalaxy({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);
  const dpr = useThree((s) => s.viewport.dpr);

  const { geometry, material } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const jitter = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const scale = new Float32Array(count);
    const inside = new THREE.Color("#ffd2a0");
    const mid = new THREE.Color("#7fdcff");
    const outside = new THREE.Color("#1d4fa8");
    const tmp = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const r = Math.pow(Math.random(), 1.6) * RADIUS;
      const branch = ((i % BRANCHES) / BRANCHES) * Math.PI * 2;
      const spin = r * SPIN * 0.12;
      pos[i * 3] = Math.sin(branch + spin) * r;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = Math.cos(branch + spin) * r;
      const spread = 0.35 + (r / RADIUS) * 2.2;
      const rnd = () => Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * spread;
      jitter[i * 3] = rnd();
      jitter[i * 3 + 1] = rnd() * 0.35;
      jitter[i * 3 + 2] = rnd();
      const k = r / RADIUS;
      if (k < 0.35) tmp.copy(inside).lerp(mid, k / 0.35);
      else tmp.copy(mid).lerp(outside, (k - 0.35) / 0.65);
      col[i * 3] = tmp.r;
      col[i * 3 + 1] = tmp.g;
      col[i * 3 + 2] = tmp.b;
      scale[i] = 0.4 + Math.random() * 1.1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aJitter", new THREE.BufferAttribute(jitter, 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    g.setAttribute("aScale", new THREE.BufferAttribute(scale, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: { uTime: { value: 0 }, uSize: { value: 90 }, uPixelRatio: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry: g, material: m };
  }, [count]);

  useFrame((state) => {
    material.uniforms["uTime"]!.value = state.clock.elapsedTime;
    material.uniforms["uPixelRatio"]!.value = dpr;
  });

  return (
    <points
      ref={ref}
      geometry={geometry}
      material={material}
      position={[-6, -10, -70]}
      rotation={[0.55, 0, 0.32]}
      frustumCulled={false}
    />
  );
}
