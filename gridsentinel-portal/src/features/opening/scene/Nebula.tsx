import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { noiseGLSL } from "./glsl";

const vertex = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const fragment = /* glsl */ `
${noiseGLSL}
uniform float uTime;
uniform float uSeed;
uniform float uOpacity;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
varying vec2 vUv;
void main(){
  vec2 p = (vUv - 0.5) * 3.2 + uSeed;
  float t = uTime * 0.018;
  vec2 q = vec2(fbm(p + vec2(t, -t)), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 3.5*q + vec2(1.7, 9.2) + t*1.4), fbm(p + 3.5*q + vec2(8.3, 2.8) - t));
  float f = fbm(p + 3.5*r);
  vec3 col = mix(uColorA, uColorB, clamp(f*f*2.2, 0.0, 1.0));
  col = mix(col, uColorC, clamp(length(r) - 0.55, 0.0, 1.0) * smoothstep(0.45, 0.85, f));
  float mask = smoothstep(0.5, 0.05, length(vUv - 0.5));
  float density = smoothstep(0.32, 0.95, f) * mask;
  gl_FragColor = vec4(min(col, vec3(1.5)), density * uOpacity);
}
`;

interface LayerProps {
  position: [number, number, number];
  rotation?: number;
  scale: number;
  seed: number;
  opacity: number;
  colors: [string, string, string];
  drift: number;
}

function NebulaLayer({ position, rotation = 0, scale, seed, opacity, colors, drift }: LayerProps) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: {
          uTime: { value: 0 },
          uSeed: { value: seed },
          uOpacity: { value: opacity },
          uColorA: { value: new THREE.Color(colors[0]) },
          uColorB: { value: new THREE.Color(colors[1]) },
          uColorC: { value: new THREE.Color(colors[2]) },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [seed, opacity, colors],
  );

  useFrame((state) => {
    material.uniforms["uTime"]!.value = state.clock.elapsedTime * drift;
  });

  return (
    <mesh position={position} rotation={[0, 0, rotation]} scale={scale} material={material}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}

export function Nebula() {
  return (
    <group>
      <NebulaLayer
        position={[10, 6, -120]}
        scale={260}
        seed={1.3}
        opacity={0.75}
        colors={["#04122c", "#0f5c86", "#ff9a4a"]}
        drift={1}
      />
      <NebulaLayer
        position={[-30, -14, -95]}
        rotation={0.8}
        scale={190}
        seed={7.7}
        opacity={0.55}
        colors={["#020a1c", "#1a7f9c", "#9fe8ff"]}
        drift={1.6}
      />
      <NebulaLayer
        position={[34, -20, -80]}
        rotation={-0.5}
        scale={120}
        seed={3.1}
        opacity={0.35}
        colors={["#100a14", "#a2471f", "#ffc27a"]}
        drift={1.2}
      />
    </group>
  );
}
