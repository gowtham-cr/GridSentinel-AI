import React, { useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  ShieldAlert,
  TowerControl,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BusElectricalData, LineElectricalData, ActiveAttack } from "@/lib/gridApi";

// Node 3D Spatial Coordinates [X, Y, Z]
export const NODE_POSITIONS: Record<number, [number, number, number]> = {
  0: [-9, 0, -4], // Bus 0: Slack / Central Thermal Generation
  1: [0, 0, 0],   // Bus 1: Main 20 kV Substation & Switchgear
  2: [-8, 0, 5],  // Bus 2: Solar PV Farm
  3: [-3, 0, 8],  // Bus 3: Wind Generation Farm
  4: [3, 0, 6],   // Bus 4: BESS Inverter Storage
  5: [8, 0, -5],  // Bus 5: Heavy Industrial Complex
  6: [8, 0, 2],   // Bus 6: Commercial Business District
  7: [5, 0, 8],   // Bus 7: Residential Community
};

// Control Centre Position
const CONTROL_CENTRE_POS: [number, number, number] = [0.5, 0, -5];

// Physical Feeder Connections [fromBus, toBus]
const LINE_CONNECTIONS: [number, number][] = [
  [0, 1], // Feeder 0-1 (Slack to Substation)
  [1, 2], // Feeder 1-2 (Substation to Solar PV)
  [1, 3], // Feeder 1-3 (Substation to Wind)
  [1, 4], // Feeder 1-4 (Substation to BESS)
  [1, 5], // Feeder 1-5 (Substation to Industrial)
  [1, 6], // Feeder 1-6 (Substation to Commercial)
  [1, 7], // Feeder 1-7 (Substation to Residential)
];

// Wind Turbine with rotating blades
function WindTurbine({ position, isTargeted }: { position: [number, number, number]; isTargeted: boolean }) {
  const rotorRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (rotorRef.current) {
      rotorRef.current.rotation.z += delta * (isTargeted ? 0.4 : 2.2);
    }
  });

  return (
    <group position={position}>
      {/* Tower Mast */}
      <mesh position={[0, 2.5, 0]}>
        <cylinderGeometry args={[0.08, 0.18, 5, 12]} />
        <meshStandardMaterial color={isTargeted ? "#ef4444" : "#e2e8f0"} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Nacelle */}
      <mesh position={[0, 5, 0]}>
        <boxGeometry args={[0.5, 0.3, 0.8]} />
        <meshStandardMaterial color={isTargeted ? "#dc2626" : "#cbd5e1"} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Rotor Hub & Blades */}
      <group position={[0, 5, 0.42]} ref={rotorRef}>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.18, 12, 12]} />
          <meshBasicMaterial color={isTargeted ? "#ef4444" : "#38bdf8"} />
        </mesh>
        {[0, 120, 240].map((angle, i) => (
          <group key={i} rotation={[0, 0, (angle * Math.PI) / 180]}>
            <mesh position={[0, 1.2, 0]}>
              <boxGeometry args={[0.08, 2.4, 0.02]} />
              <meshStandardMaterial color="#f8fafc" />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

// Single Animated Energy Particle along a 3D Catmull-Rom Curve
function EnergyPulseParticle({
  curve,
  initialOffset,
  speed = 1.0,
  isReversed = false,
  color = "#38bdf8",
  isDisconnected = false,
}: {
  curve: THREE.CatmullRomCurve3;
  initialOffset: number;
  speed?: number;
  isReversed?: boolean;
  color?: string;
  isDisconnected?: boolean;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const progress = useRef(initialOffset);

  useFrame((_, delta) => {
    if (isDisconnected) return;
    const direction = isReversed ? -1 : 1;
    const step = delta * 0.28 * speed * direction;
    progress.current = (progress.current + step + 1.0) % 1.0;

    if (meshRef.current) {
      const pt = curve.getPoint(progress.current);
      meshRef.current.position.set(pt.x, pt.y, pt.z);
    }
  });

  if (isDisconnected) return null;

  return (
    <group ref={meshRef}>
      {/* Core Glowing Bead */}
      <mesh>
        <sphereGeometry args={[0.14, 10, 10]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Outer Halo / Aura */}
      <mesh>
        <sphereGeometry args={[0.26, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

// Catenary Transmission Line with Dynamic Physics-Driven Pulses
function PhysicsTransmissionLine({
  from,
  to,
  lineData,
  isOverloaded,
  isAttacked,
  isDisconnected = false,
}: {
  from: [number, number, number];
  to: [number, number, number];
  lineData?: LineElectricalData;
  isOverloaded: boolean;
  isAttacked: boolean;
  isDisconnected?: boolean;
}) {
  const curve = useMemo(() => {
    const midX = (from[0] + to[0]) / 2;
    const midZ = (from[2] + to[2]) / 2;
    const midY = 1.7; // Catenary sag height
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(from[0], 2.8, from[2]),
      new THREE.Vector3(midX, midY, midZ),
      new THREE.Vector3(to[0], 2.8, to[2]),
    ]);
  }, [from, to]);

  const points = useMemo(() => curve.getPoints(36), [curve]);
  const lineGeom = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  const loading = lineData?.loading_percent ?? 35;
  const pFrom = lineData?.p_from_mw ?? 1.0;
  // If active power p_from_mw < 0, flow is reversed (flowing into from_bus)
  const isReversed = pFrom < 0;

  // Pulse Speed & Density based on actual Pandapower line loading
  const pulseSpeed = isDisconnected ? 0 : Math.max(0.6, (loading / 45));

  // Determine Color Scheme
  let cableColor = "#0284c7";
  let pulseColor = "#38bdf8";

  if (isAttacked || isOverloaded) {
    cableColor = "#ef4444";
    pulseColor = "#f87171";
  } else if (loading > 75) {
    cableColor = "#f59e0b";
    pulseColor = "#fbbf24";
  } else {
    cableColor = "#0284c7";
    pulseColor = "#38bdf8";
  }

  // Determine number of pulse beads along line (density scales with loading)
  const pulseOffsets = useMemo(() => {
    if (isDisconnected) return [];
    if (isOverloaded || isAttacked) return [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9];
    if (loading > 75) return [0, 0.2, 0.4, 0.6, 0.8];
    if (loading > 40) return [0, 0.25, 0.5, 0.75];
    return [0, 0.5]; // Low loading
  }, [loading, isOverloaded, isAttacked, isDisconnected]);

  return (
    <group>
      {/* Physical Catenary Line Cable */}
      {/* @ts-ignore */}
      <line geometry={lineGeom}>
        <lineBasicMaterial
          color={cableColor}
          linewidth={isAttacked || isOverloaded ? 3 : 1.5}
        />
      </line>

      {/* Dynamic Animated Energy Packets */}
      {!isDisconnected &&
        pulseOffsets.map((offset, idx) => (
          <EnergyPulseParticle
            key={idx}
            curve={curve}
            initialOffset={offset}
            speed={pulseSpeed}
            isReversed={isReversed}
            color={pulseColor}
            isDisconnected={isDisconnected}
          />
        ))}
    </group>
  );
}

// Transmission Tower (Lattice Pylon)
function TransmissionTower({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.08, 0.45, 3.0, 4]} />
        <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} wireframe />
      </mesh>
      <mesh position={[0, 2.7, 0]}>
        <boxGeometry args={[1.6, 0.08, 0.2]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

// Holographic Warning Ring for Compromised Assets
function WarningHoloRing({ position }: { position: [number, number, number] }) {
  const ringRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.y += delta * 2.8;
    }
  });

  return (
    <group position={[position[0], position[1] + 3.8, position[2]]} ref={ringRef}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.1, 1.4, 24]} />
        <meshBasicMaterial color="#ef4444" side={THREE.DoubleSide} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <octahedronGeometry args={[0.35, 0]} />
        <meshBasicMaterial color="#ef4444" wireframe />
      </mesh>
    </group>
  );
}

// Holographic Recovery Shield for Restored Assets
function RecoveryHoloShield({ position }: { position: [number, number, number] }) {
  const shieldRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (shieldRef.current) {
      shieldRef.current.rotation.y += delta * 1.5;
    }
  });

  return (
    <group position={[position[0], position[1] + 3.8, position[2]]} ref={shieldRef}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.0, 1.3, 24]} />
        <meshBasicMaterial color="#22c55e" side={THREE.DoubleSide} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.25, 8, 8]} />
        <meshBasicMaterial color="#22c55e" wireframe />
      </mesh>
    </group>
  );
}

// Main 3D Scene Inside Canvas
function Scene({
  buses,
  lines,
  activeAttacks,
  selectedBusId,
  onSelectBus,
  stateMode,
}: {
  buses: BusElectricalData[];
  lines: LineElectricalData[];
  activeAttacks: ActiveAttack[];
  selectedBusId: number | null;
  onSelectBus: (id: number) => void;
  stateMode: "NORMAL" | "ATTACKED" | "RECOVERED";
}) {
  const targetedBusIds = useMemo(() => {
    const set = new Set<number>();
    activeAttacks.forEach((a) => {
      const match = a.target_component.match(/Bus[_\s](\d+)/i);
      if (match) set.add(parseInt(match[1], 10));
    });
    // In demo attacked state without active attacks array
    if (stateMode === "ATTACKED" && set.size === 0) {
      set.add(3); // Bus 3 Wind/Voltage
    }
    return set;
  }, [activeAttacks, stateMode]);

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[15, 25, 10]} intensity={1.3} />
      <directionalLight position={[-15, 15, -10]} intensity={0.5} color="#38bdf8" />
      <pointLight position={[0, 10, 0]} intensity={1.5} color="#22d3ee" distance={30} />

      {/* Cybernetic Grid Floor */}
      <gridHelper args={[32, 32, "#0284c7", "#0f172a"]} position={[0, -0.01, 0]} />

      {/* 1. BUS 0: Slack Thermal Generation Station */}
      <group
        position={NODE_POSITIONS[0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectBus(0);
        }}
      >
        <TransmissionTower position={[0, 0, 0]} />
        <mesh position={[0, 0.8, -1.2]}>
          <boxGeometry args={[3.2, 1.6, 2.2]} />
          <meshStandardMaterial
            color={targetedBusIds.has(0) ? "#ef4444" : "#1e293b"}
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[-1.2, 1.2, 1.2]}>
          <cylinderGeometry args={[0.5, 0.8, 2.4, 16]} />
          <meshStandardMaterial color="#334155" metalness={0.4} roughness={0.6} />
        </mesh>
        <mesh position={[1.2, 1.2, 1.2]}>
          <cylinderGeometry args={[0.5, 0.8, 2.4, 16]} />
          <meshStandardMaterial color="#334155" metalness={0.4} roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.8, -1.2]}>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshBasicMaterial color={targetedBusIds.has(0) ? "#ef4444" : "#38bdf8"} />
        </mesh>
        {targetedBusIds.has(0) && <WarningHoloRing position={[0, 0, 0]} />}
        {stateMode === "RECOVERED" && <RecoveryHoloShield position={[0, 0, 0]} />}
      </group>

      {/* 2. BUS 1: Central Substation & Switchgear */}
      <group
        position={NODE_POSITIONS[1]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectBus(1);
        }}
      >
        <TransmissionTower position={[0, 0, 0]} />
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[4.2, 0.2, 3.2]} />
          <meshStandardMaterial color="#1e293b" metalness={0.6} roughness={0.4} />
        </mesh>
        {[-1.2, 0, 1.2].map((x, i) => (
          <group key={i} position={[x, 0.7, 0]}>
            <mesh>
              <boxGeometry args={[0.8, 1.2, 0.8]} />
              <meshStandardMaterial
                color={targetedBusIds.has(1) ? "#ef4444" : "#334155"}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
            <mesh position={[0, 0.75, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 0.4, 8]} />
              <meshStandardMaterial color="#e2e8f0" />
            </mesh>
          </group>
        ))}
        {targetedBusIds.has(1) && <WarningHoloRing position={[0, 0, 0]} />}
        {stateMode === "RECOVERED" && <RecoveryHoloShield position={[0, 0, 0]} />}
      </group>

      {/* 3. BUS 2: Solar PV Generation Farm */}
      <group
        position={NODE_POSITIONS[2]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectBus(2);
        }}
      >
        <TransmissionTower position={[0, 0, 0]} />
        {[-1.2, 0, 1.2].map((z, row) => (
          <group key={row} position={[0, 0.4, z]} rotation={[-0.35, 0, 0]}>
            <mesh>
              <boxGeometry args={[2.8, 0.06, 0.9]} />
              <meshStandardMaterial
                color={targetedBusIds.has(2) ? "#ef4444" : "#0284c7"}
                metalness={0.8}
                roughness={0.1}
              />
            </mesh>
          </group>
        ))}
        {targetedBusIds.has(2) && <WarningHoloRing position={[0, 0, 0]} />}
        {stateMode === "RECOVERED" && <RecoveryHoloShield position={[0, 0, 0]} />}
      </group>

      {/* 4. BUS 3: Wind Turbines Farm */}
      <group
        position={NODE_POSITIONS[3]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectBus(3);
        }}
      >
        <TransmissionTower position={[0, 0, 0]} />
        <WindTurbine position={[-1.2, 0, -0.8]} isTargeted={targetedBusIds.has(3)} />
        <WindTurbine position={[1.4, 0, 0.8]} isTargeted={targetedBusIds.has(3)} />
        {targetedBusIds.has(3) && <WarningHoloRing position={[0, 0, 0]} />}
        {stateMode === "RECOVERED" && <RecoveryHoloShield position={[0, 0, 0]} />}
      </group>

      {/* 5. BUS 4: BESS Energy Storage Containers */}
      <group
        position={NODE_POSITIONS[4]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectBus(4);
        }}
      >
        <TransmissionTower position={[0, 0, 0]} />
        {[-0.9, 0.9].map((z, i) => (
          <mesh key={i} position={[0, 0.6, z]}>
            <boxGeometry args={[2.4, 1.2, 0.9]} />
            <meshStandardMaterial
              color={targetedBusIds.has(4) ? "#ef4444" : "#f8fafc"}
              metalness={0.4}
              roughness={0.5}
            />
          </mesh>
        ))}
        <mesh position={[0, 1.3, 0]}>
          <boxGeometry args={[1.5, 0.1, 0.1]} />
          <meshBasicMaterial color={targetedBusIds.has(4) ? "#ef4444" : "#22c55e"} />
        </mesh>
        {targetedBusIds.has(4) && <WarningHoloRing position={[0, 0, 0]} />}
        {stateMode === "RECOVERED" && <RecoveryHoloShield position={[0, 0, 0]} />}
      </group>

      {/* 6. BUS 5: Heavy Industrial Complex */}
      <group
        position={NODE_POSITIONS[5]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectBus(5);
        }}
      >
        <TransmissionTower position={[0, 0, 0]} />
        <mesh position={[-0.8, 1.0, 0]}>
          <boxGeometry args={[2.4, 2.0, 2.4]} />
          <meshStandardMaterial
            color={targetedBusIds.has(5) ? "#ef4444" : "#475569"}
            metalness={0.6}
            roughness={0.4}
          />
        </mesh>
        <mesh position={[1.2, 1.2, -0.6]}>
          <cylinderGeometry args={[0.45, 0.45, 2.4, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[1.2, 1.2, 0.6]}>
          <cylinderGeometry args={[0.45, 0.45, 2.4, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
        </mesh>
        {targetedBusIds.has(5) && <WarningHoloRing position={[0, 0, 0]} />}
        {stateMode === "RECOVERED" && <RecoveryHoloShield position={[0, 0, 0]} />}
      </group>

      {/* 7. BUS 6: Commercial Business District */}
      <group
        position={NODE_POSITIONS[6]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectBus(6);
        }}
      >
        <TransmissionTower position={[0, 0, 0]} />
        <mesh position={[-0.6, 2.0, -0.4]}>
          <boxGeometry args={[1.2, 4.0, 1.2]} />
          <meshStandardMaterial
            color={targetedBusIds.has(6) ? "#ef4444" : "#0f172a"}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
        <mesh position={[0.7, 1.5, 0.5]}>
          <boxGeometry args={[1.0, 3.0, 1.0]} />
          <meshStandardMaterial
            color={targetedBusIds.has(6) ? "#ef4444" : "#1e293b"}
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
        {targetedBusIds.has(6) && <WarningHoloRing position={[0, 0, 0]} />}
        {stateMode === "RECOVERED" && <RecoveryHoloShield position={[0, 0, 0]} />}
      </group>

      {/* 8. BUS 7: Residential Community Houses */}
      <group
        position={NODE_POSITIONS[7]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectBus(7);
        }}
      >
        <TransmissionTower position={[0, 0, 0]} />
        {[
          [-0.8, -0.6],
          [0.8, -0.6],
          [-0.8, 0.6],
          [0.8, 0.6],
        ].map(([x, z], i) => (
          <group key={i} position={[x, 0.4, z]}>
            <mesh>
              <boxGeometry args={[0.7, 0.7, 0.7]} />
              <meshStandardMaterial
                color={targetedBusIds.has(7) ? "#ef4444" : "#e2e8f0"}
                metalness={0.2}
                roughness={0.6}
              />
            </mesh>
            <mesh position={[0, 0.55, 0]} rotation={[0, Math.PI / 4, 0]}>
              <coneGeometry args={[0.55, 0.4, 4]} />
              <meshStandardMaterial color="#b91c1c" />
            </mesh>
          </group>
        ))}
        {targetedBusIds.has(7) && <WarningHoloRing position={[0, 0, 0]} />}
        {stateMode === "RECOVERED" && <RecoveryHoloShield position={[0, 0, 0]} />}
      </group>

      {/* 9. GRID CONTROL CENTRE HQ */}
      <group position={CONTROL_CENTRE_POS}>
        <mesh position={[0, 0.8, 0]}>
          <boxGeometry args={[2.8, 1.6, 2.2]} />
          <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, 1.9, 0]}>
          <sphereGeometry args={[0.65, 16, 16]} />
          <meshBasicMaterial color="#22d3ee" wireframe />
        </mesh>
        <mesh position={[1.0, 2.2, 0.6]}>
          <cylinderGeometry args={[0.04, 0.04, 1.4, 8]} />
          <meshStandardMaterial color="#38bdf8" />
        </mesh>
      </group>

      {/* 10. Dynamic Physics-Directed Transmission Lines */}
      {LINE_CONNECTIONS.map(([fromId, toId], idx) => {
        const lineData = lines.find((l) => l.from_bus === fromId && l.to_bus === toId);
        const fromPos = NODE_POSITIONS[fromId];
        const toPos = NODE_POSITIONS[toId];
        const isOverloaded = (lineData?.loading_percent ?? 0) > 100;
        const isLineAttacked = targetedBusIds.has(fromId) || targetedBusIds.has(toId);

        return (
          <PhysicsTransmissionLine
            key={idx}
            from={fromPos}
            to={toPos}
            lineData={lineData}
            isOverloaded={isOverloaded}
            isAttacked={isLineAttacked}
          />
        );
      })}

      <OrbitControls
        makeDefault
        minDistance={8}
        maxDistance={45}
        maxPolarAngle={Math.PI / 2.05}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  );
}

interface GridCanvas3DProps {
  buses: BusElectricalData[];
  lines: LineElectricalData[];
  activeAttacks: ActiveAttack[];
  selectedBusId: number | null;
  onSelectBus: (id: number) => void;
  stateMode?: "NORMAL" | "ATTACKED" | "RECOVERED";
  onStateModeChange?: (mode: "NORMAL" | "ATTACKED" | "RECOVERED") => void;
}

export function GridCanvas3D({
  buses,
  lines,
  activeAttacks,
  selectedBusId,
  onSelectBus,
  stateMode = "NORMAL",
  onStateModeChange,
}: GridCanvas3DProps) {
  const [cameraPreset, setCameraPreset] = useState<"iso" | "top" | "gen" | "load">("iso");
  const selectedBus = buses.find((b) => b.bus_id === selectedBusId);

  // Camera initial position based on preset
  const cameraPos = useMemo<[number, number, number]>(() => {
    switch (cameraPreset) {
      case "top":
        return [0, 32, 0.01];
      case "gen":
        return [-15, 12, -4];
      case "load":
        return [15, 12, 4];
      case "iso":
      default:
        return [16, 18, 20];
    }
  }, [cameraPreset]);

  return (
    <div className="relative h-[490px] w-full rounded-xl border border-primary/40 bg-card overflow-hidden shadow-2xl">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: cameraPos, fov: 45 }}
        style={{ background: "radial-gradient(circle at 50% 50%, #0a0f1d 0%, #020617 100%)" }}
      >
        <Scene
          buses={buses}
          lines={lines}
          activeAttacks={activeAttacks}
          selectedBusId={selectedBusId}
          onSelectBus={onSelectBus}
          stateMode={stateMode}
        />
      </Canvas>

      {/* Top Overlay Controls: State Selector + Camera Presets */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-void/80 px-2.5 py-1.5 backdrop-blur-md font-mono text-[11px] text-primary shadow">
            <TowerControl className="size-3.5 text-primary animate-pulse" />
            <span className="font-bold">3D CYBER-PHYSICAL DIGITAL TWIN</span>
          </div>

          {/* Physical State Switcher: Normal, Attacked, Recovered */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-void/85 p-1 backdrop-blur-md font-mono text-[10px]">
            <span className="text-muted-foreground px-1">Physical State:</span>
            {(["NORMAL", "ATTACKED", "RECOVERED"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onStateModeChange?.(m)}
                className={cn(
                  "rounded px-2.5 py-0.5 font-bold transition-all cursor-pointer",
                  stateMode === m
                    ? m === "ATTACKED"
                      ? "bg-destructive text-destructive-foreground shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                      : m === "RECOVERED"
                      ? "bg-success text-success-foreground shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                      : "bg-primary text-primary-foreground shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m === "NORMAL" ? "Normal State" : m === "ATTACKED" ? "Attacked State" : "Recovered State"}
              </button>
            ))}
          </div>

          {activeAttacks.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-destructive/60 bg-destructive/20 px-2.5 py-1 backdrop-blur-md font-mono text-[10px] text-destructive shadow animate-pulse">
              <ShieldAlert className="size-3" />
              <span className="font-bold">{activeAttacks.length} ATTACK ACTIVE</span>
            </div>
          )}
        </div>

        {/* Camera Preset Switches */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-void/80 p-1 backdrop-blur-md pointer-events-auto font-mono text-[10px]">
          <button
            type="button"
            onClick={() => setCameraPreset("iso")}
            className={cn(
              "rounded px-2 py-1 font-semibold transition-all cursor-pointer",
              cameraPreset === "iso" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Isometric
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset("top")}
            className={cn(
              "rounded px-2 py-1 font-semibold transition-all cursor-pointer",
              cameraPreset === "top" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Overhead
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset("gen")}
            className={cn(
              "rounded px-2 py-1 font-semibold transition-all cursor-pointer",
              cameraPreset === "gen" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Generation
          </button>
          <button
            type="button"
            onClick={() => setCameraPreset("load")}
            className={cn(
              "rounded px-2 py-1 font-semibold transition-all cursor-pointer",
              cameraPreset === "load" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Substation & Loads
          </button>
        </div>
      </div>

      {/* Bottom Floating Legend / Quick Inspector */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {selectedBus ? (
          <div className="rounded-lg border border-primary/50 bg-void/90 px-3.5 py-2 backdrop-blur-md font-mono text-xs text-foreground shadow-lg pointer-events-auto flex items-center gap-4">
            <div>
              <span className="text-[10px] text-muted-foreground block">Selected Asset</span>
              <strong className="text-primary-glow">{selectedBus.name}</strong>
            </div>
            <div className="border-l border-border pl-3">
              <span className="text-[10px] text-muted-foreground block">Voltage</span>
              <span
                className={cn(
                  "font-bold",
                  selectedBus.vm_pu < 0.95 || selectedBus.vm_pu > 1.05
                    ? "text-destructive"
                    : "text-foreground"
                )}
              >
                {selectedBus.vm_pu.toFixed(4)} pu ({selectedBus.vn_kv} kV)
              </span>
            </div>
            <div className="border-l border-border pl-3">
              <span className="text-[10px] text-muted-foreground block">Active / Reactive</span>
              <span>
                {selectedBus.p_mw >= 0 ? `+${selectedBus.p_mw.toFixed(2)}` : selectedBus.p_mw.toFixed(2)} MW |{" "}
                {selectedBus.q_mvar.toFixed(2)} MVAR
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border/60 bg-void/70 px-3 py-1.5 backdrop-blur-md font-mono text-[11px] text-muted-foreground pointer-events-auto">
            💡 Click any 3D asset or transmission tower to inspect live Pandapower telemetry
          </div>
        )}

        {/* 3D Visual Key */}
        <div className="hidden sm:flex items-center gap-3 rounded-lg border border-border/60 bg-void/80 px-3 py-1.5 backdrop-blur-md font-mono text-[10px] text-muted-foreground pointer-events-auto">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-primary" /> Blue: Normal Flow
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-warning" /> Amber: High Load (&gt;75%)
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-destructive animate-pulse" /> Red: Spoofed / Overloaded
          </span>
        </div>
      </div>
    </div>
  );
}
