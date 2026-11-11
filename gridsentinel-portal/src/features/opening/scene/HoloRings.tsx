import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Rig } from "../rig";

const vertex = /* glsl */ `
varying vec3 vPos;
void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const fragment = /* glsl */ `
uniform float uTime;
uniform float uSegments;
uniform float uDuty;
uniform float uSpeed;
uniform float uOpacity;
uniform float uBoost;
uniform vec3 uColor;
varying vec3 vPos;
void main(){
  float a = atan(vPos.y, vPos.x) / 6.28318 + 0.5;
  float seg = uSegments > 0.0 ? step(uDuty, fract(a * uSegments)) : 1.0;
  float head = fract(a - uTime * uSpeed);
  head = head * head; head = head * head; head = head * head; // ^8 comet
  float alpha = (seg * 0.4 + head * 1.1) * uOpacity * (1.0 + uBoost);
  gl_FragColor = vec4(uColor * (1.0 + head * 2.0 + uBoost), clamp(alpha, 0.0, 1.0));
}
`;

interface RingSpec {
  inner: number;
  outer: number;
  color: string;
  segments: number;
  duty: number;
  speed: number;
  opacity: number;
  tilt: [number, number];
  spin: number;
}

const RINGS: RingSpec[] = [
  { inner: 3.35, outer: 3.42, color: "#7fe3ff", segments: 96, duty: 0.3, speed: 0.12, opacity: 0.9, tilt: [0, 0], spin: 0.08 },
  { inner: 3.9, outer: 3.93, color: "#ffb766", segments: 0, duty: 0, speed: -0.08, opacity: 0.7, tilt: [0.25, -0.15], spin: -0.12 },
  { inner: 4.5, outer: 4.75, color: "#7fe3ff", segments: 180, duty: 0.82, speed: 0.05, opacity: 0.55, tilt: [-0.18, 0.3], spin: 0.05 },
  { inner: 5.4, outer: 5.44, color: "#bdf2ff", segments: 12, duty: 0.55, speed: -0.15, opacity: 0.6, tilt: [1.15, 0.2], spin: 0.18 },
  { inner: 6.3, outer: 6.33, color: "#ffb766", segments: 48, duty: 0.6, speed: 0.1, opacity: 0.4, tilt: [0.4, 1.1], spin: -0.07 },
];

function Ring({ spec, rig }: { spec: RingSpec; rig: Rig }) {
  const spinner = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: {
          uTime: { value: 0 },
          uSegments: { value: spec.segments },
          uDuty: { value: spec.duty },
          uSpeed: { value: spec.speed },
          uOpacity: { value: spec.opacity },
          uBoost: { value: 0 },
          uColor: { value: new THREE.Color(spec.color) },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [spec],
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    material.uniforms["uTime"]!.value = state.clock.elapsedTime;
    material.uniforms["uBoost"]!.value = rig.boost;
    if (spinner.current) spinner.current.rotation.z += dt * spec.spin * (1 + rig.boost * 6);
  });

  return (
    <group rotation={[spec.tilt[0], spec.tilt[1], 0]}>
      <mesh ref={spinner} material={material}>
        <ringGeometry args={[spec.inner, spec.outer, 192, 1]} />
      </mesh>
    </group>
  );
}

export function HoloRings({ rig }: { rig: Rig }) {
  const root = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!root.current) return;
    const t = state.clock.elapsedTime;
    root.current.rotation.x = Math.sin(t * 0.15) * 0.08;
    root.current.rotation.y = Math.cos(t * 0.12) * 0.1;
  });
  return (
    <group ref={root}>
      {RINGS.map((spec, i) => (
        <Ring key={i} spec={spec} rig={rig} />
      ))}
    </group>
  );
}
