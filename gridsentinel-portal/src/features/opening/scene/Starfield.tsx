import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { softPointGLSL } from "./glsl";

const vertex = /* glsl */ `
attribute float aSize;
attribute float aPhase;
attribute vec3 aColor;
uniform float uTime;
uniform float uPixelRatio;
varying vec3 vColor;
varying float vTwinkle;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.55 + 0.45 * sin(uTime * (0.6 + aPhase * 2.2) + aPhase * 40.0);
  vTwinkle = tw;
  vColor = aColor;
  gl_PointSize = clamp(aSize * uPixelRatio * (260.0 / -mv.z) * (0.75 + tw * 0.5), 0.0, 48.0);
}
`;

const fragment = /* glsl */ `
${softPointGLSL}
varying vec3 vColor;
varying float vTwinkle;
void main(){
  float a = softPoint();
  if (a < 0.01) discard;
  gl_FragColor = vec4(min(vColor * (0.6 + vTwinkle), vec3(2.0)), a);
}
`;

export function Starfield({ count }: { count: number }) {
  const group = useRef<THREE.Points>(null);
  const dpr = useThree((s) => s.viewport.dpr);

  const { geometry, material } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    const phase = new Float32Array(count);
    const col = new Float32Array(count * 3);
    const palette = [
      new THREE.Color("#cfefff"),
      new THREE.Color("#ffffff"),
      new THREE.Color("#9fd8ff"),
      new THREE.Color("#ffd7a8"),
    ];
    for (let i = 0; i < count; i++) {
      // Spherical shell around the scene
      const r = 60 + Math.random() * 240;
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      pos[i * 3] = r * s * Math.cos(t);
      pos[i * 3 + 1] = r * u;
      pos[i * 3 + 2] = r * s * Math.sin(t);
      size[i] = Math.random() < 0.04 ? 2.4 + Math.random() * 2 : 0.5 + Math.random() * 1.2;
      phase[i] = Math.random();
      const c = palette[Math.floor(Math.random() * palette.length)]!;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    g.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    const m = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry: g, material: m };
  }, [count]);

  useFrame((state, delta) => {
    material.uniforms["uTime"]!.value = state.clock.elapsedTime;
    material.uniforms["uPixelRatio"]!.value = dpr;
    if (group.current) group.current.rotation.y += Math.min(delta, 0.05) * 0.006;
  });

  return <points ref={group} geometry={geometry} material={material} frustumCulled={false} />;
}
