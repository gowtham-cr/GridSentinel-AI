import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Rig } from "../rig";
import { noiseGLSL, softPointGLSL } from "./glsl";

/** Portal world radius (bright rim). */
export const PORTAL_RADIUS = 3;

const diskVertex = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const diskFragment = /* glsl */ `
${noiseGLSL}
uniform float uTime;
uniform float uBoost;
varying vec2 vUv;
void main(){
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float speed = 0.35 + uBoost * 2.2;
  // vortex: rotate space more strongly near the core
  vec2 q = rot2(1.6 / (r + 0.18) + uTime * speed) * p;
  float n = fbm(q * 3.2 + vec2(0.0, -uTime * 0.3));
  float n2 = fbm(q * 6.0 - uTime * 0.2);

  float rimR = 0.74;
  float rimDist = abs(r - rimR);
  float rim = exp(-rimDist * 60.0);
  float rimGlow = exp(-rimDist * 9.0);
  float inner = smoothstep(rimR + 0.02, 0.0, r);

  vec3 deep = vec3(0.01, 0.04, 0.09);
  vec3 cyan = vec3(0.3, 0.85, 1.0);
  vec3 amber = vec3(1.0, 0.6, 0.25);
  vec3 white = vec3(1.0);

  vec3 col = mix(deep, cyan * 0.9, n * n * 1.6) * inner;
  col += amber * (n2 * n2 * n2) * inner * 0.9;
  col += cyan * rimGlow * (0.5 + uBoost * 0.6) + white * rim * (0.55 + uBoost);

  // core: dark eye at rest, blinding white during the jump
  float core = smoothstep(0.42, 0.0, r);
  col *= mix(1.0 - core * 0.7, 1.0, uBoost);
  col += white * core * uBoost * 2.2;
  col *= 1.0 + uBoost * 0.8;

  float outerFade = smoothstep(1.0, rimR, r);
  float alpha = clamp(inner * 0.95 + rimGlow * outerFade, 0.0, 1.0);
  gl_FragColor = vec4(min(col, vec3(4.0)), alpha);
}
`;

const accretionVertex = /* glsl */ `
attribute float aAngle;
attribute float aPhase;
attribute float aSpeed;
attribute float aSize;
attribute float aLift;
uniform float uTime;
uniform float uBoost;
uniform float uPixelRatio;
varying float vAlpha;
varying float vHeat;
void main(){
  float life = fract(aPhase + uTime * aSpeed * (1.0 + uBoost * 3.5));
  float r = mix(7.5, 0.4, life * life);
  float ang = aAngle + life * 5.0 + uTime * 0.15;
  vec3 p = vec3(cos(ang) * r, sin(ang) * r, aLift * r * 0.08);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  vAlpha = smoothstep(0.0, 0.2, life) * smoothstep(1.0, 0.75, life);
  vHeat = life;
  gl_PointSize = clamp(aSize * uPixelRatio * (40.0 / -mv.z) * (1.0 + uBoost), 0.0, 24.0);
}
`;

const accretionFragment = /* glsl */ `
${softPointGLSL}
varying float vAlpha;
varying float vHeat;
void main(){
  float a = softPoint() * vAlpha;
  if (a < 0.01) discard;
  vec3 col = mix(vec3(0.35, 0.85, 1.0), vec3(1.0, 0.78, 0.5), smoothstep(0.55, 1.0, vHeat));
  gl_FragColor = vec4(col * 1.4, a);
}
`;

export function Portal({ rig, accretion }: { rig: Rig; accretion: number }) {
  const dpr = useThree((s) => s.viewport.dpr);

  const diskMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: diskVertex,
        fragmentShader: diskFragment,
        uniforms: { uTime: { value: 0 }, uBoost: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const { geometry, material } = useMemo(() => {
    const angle = new Float32Array(accretion);
    const phase = new Float32Array(accretion);
    const speed = new Float32Array(accretion);
    const size = new Float32Array(accretion);
    const lift = new Float32Array(accretion);
    const pos = new Float32Array(accretion * 3);
    for (let i = 0; i < accretion; i++) {
      angle[i] = Math.random() * Math.PI * 2;
      phase[i] = Math.random();
      speed[i] = 0.04 + Math.random() * 0.08;
      size[i] = 0.6 + Math.random() * 1.6;
      lift[i] = (Math.random() - 0.5) * 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aAngle", new THREE.BufferAttribute(angle, 1));
    g.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    g.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    g.setAttribute("aLift", new THREE.BufferAttribute(lift, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: accretionVertex,
      fragmentShader: accretionFragment,
      uniforms: { uTime: { value: 0 }, uBoost: { value: 0 }, uPixelRatio: { value: 1 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry: g, material: m };
  }, [accretion]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    diskMaterial.uniforms["uTime"]!.value = t;
    diskMaterial.uniforms["uBoost"]!.value = rig.boost;
    material.uniforms["uTime"]!.value = t;
    material.uniforms["uBoost"]!.value = rig.boost;
    material.uniforms["uPixelRatio"]!.value = dpr;
  });

  const size = (PORTAL_RADIUS / 0.74) * 2;

  return (
    <group>
      <mesh material={diskMaterial}>
        <planeGeometry args={[size, size]} />
      </mesh>
      <points geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}
