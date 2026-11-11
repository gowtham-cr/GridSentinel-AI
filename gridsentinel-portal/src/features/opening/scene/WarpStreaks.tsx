import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Rig } from "../rig";

const LENGTH = 90;

const vertex = /* glsl */ `
attribute float aAngle;
attribute float aRadius;
attribute float aOffset;
attribute float aSpeed;
attribute float aEnd;
uniform float uTravel;
uniform float uWarp;
varying float vAlpha;
void main(){
  float z = -70.0 + mod(aOffset + uTravel * aSpeed, ${LENGTH.toFixed(1)});
  z -= aEnd * (1.0 + uWarp * 14.0) * aSpeed;
  vec3 p = vec3(cos(aAngle) * aRadius, sin(aAngle) * aRadius, z);
  vAlpha = (1.0 - aEnd) * uWarp * smoothstep(-70.0, -40.0, z);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

const fragment = /* glsl */ `
varying float vAlpha;
void main(){
  gl_FragColor = vec4(vec3(0.75, 0.95, 1.0) * 1.6, vAlpha);
}
`;

export function WarpStreaks({ rig, count }: { rig: Rig; count: number }) {
  const { geometry, material } = useMemo(() => {
    const n = count * 2;
    const pos = new Float32Array(n * 3);
    const angle = new Float32Array(n);
    const radius = new Float32Array(n);
    const offset = new Float32Array(n);
    const speed = new Float32Array(n);
    const end = new Float32Array(n);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 1.6 + Math.pow(Math.random(), 0.6) * 12;
      const o = Math.random() * LENGTH;
      const s = 0.6 + Math.random() * 0.8;
      for (let k = 0; k < 2; k++) {
        const j = i * 2 + k;
        angle[j] = a;
        radius[j] = r;
        offset[j] = o;
        speed[j] = s;
        end[j] = k;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aAngle", new THREE.BufferAttribute(angle, 1));
    g.setAttribute("aRadius", new THREE.BufferAttribute(radius, 1));
    g.setAttribute("aOffset", new THREE.BufferAttribute(offset, 1));
    g.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));
    g.setAttribute("aEnd", new THREE.BufferAttribute(end, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: { uTravel: { value: 0 }, uWarp: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry: g, material: m };
  }, [count]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    material.uniforms["uWarp"]!.value = rig.warp;
    material.uniforms["uTravel"]!.value += dt * (4 + rig.warp * 120);
  });

  return <lineSegments geometry={geometry} material={material} frustumCulled={false} />;
}
