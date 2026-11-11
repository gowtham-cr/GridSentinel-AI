import { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { BusData, LineData } from "@/lib/api";
import { Zap, ShieldAlert, Activity, Eye, Sun, Wind, Battery, Hospital, Factory, Home } from "lucide-react";

interface CyberGrid3DProps {
  buses: BusData[];
  lines: LineData[];
  activeAttacks?: Array<{ attack_type: string; target_bus_id?: number | null }>;
  onSelectBus?: (bus: BusData) => void;
}

interface Node3DConfig {
  id: number;
  name: string;
  type: "slack" | "solar" | "wind" | "bess" | "hospital" | "industrial" | "residential" | "switchgear";
  pos: [number, number, number];
  color: string;
}

const NODES_CONFIG: Node3DConfig[] = [
  { id: 0, name: "Substation Intertie (20kV)", type: "slack", pos: [-6, 0.5, 0], color: "#06b6d4" },
  { id: 1, name: "Main Switchgear Incomer", type: "switchgear", pos: [-2.5, 0.5, 0], color: "#38bdf8" },
  { id: 2, name: "Solar PV Plant (1.5MW)", type: "solar", pos: [-1.2, 0.4, -4], color: "#facc15" },
  { id: 3, name: "Wind Turbine Farm (1.8MW)", type: "wind", pos: [2.5, 0.4, -4.2], color: "#60a5fa" },
  { id: 4, name: "BESS Storage (0.8MW / 2.4MWh)", type: "bess", pos: [1.8, 0.4, 0], color: "#10b981" },
  { id: 5, name: "Critical Hospital Feeder", type: "hospital", pos: [-2.2, 0.5, 4], color: "#ef4444" },
  { id: 6, name: "Industrial Manufacturing", type: "industrial", pos: [1.5, 0.5, 4], color: "#f97316" },
  { id: 7, name: "Residential Smart District", type: "residential", pos: [5.2, 0.4, 2], color: "#a855f7" },
];

const LINE_CONNECTIONS: [number, number][] = [
  [0, 1],
  [1, 2],
  [1, 3],
  [1, 4],
  [1, 5],
  [1, 6],
  [4, 6],
  [4, 7],
];

export default function CyberGrid3D({
  buses,
  lines,
  activeAttacks = [],
  onSelectBus,
}: CyberGrid3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node3DConfig | null>(null);
  const [cameraPreset, setCameraPreset] = useState<string>("isometric");

  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const windBladesRef = useRef<THREE.Group[]>([]);
  const lineParticlesRef = useRef<THREE.Points[]>([]);

  // Find if any bus is targeted by active attacks
  const attackedBusIds = useMemo(() => {
    return activeAttacks.map((a) => a.target_bus_id).filter((id): id is number => id !== null && id !== undefined);
  }, [activeAttacks]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 520;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#020617");
    scene.fog = new THREE.FogExp2("#020617", 0.025);

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 14, 16);
    cameraRef.current = camera;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.05; // Prevent camera going below floor
    controls.minDistance = 5;
    controls.maxDistance = 35;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const cyanPointLight = new THREE.PointLight(0x06b6d4, 1.5, 20);
    cyanPointLight.position.set(0, 4, 0);
    scene.add(cyanPointLight);

    // 6. Holographic Cyber Floor Grid
    const gridHelper = new THREE.GridHelper(30, 30, 0x0ea5e9, 0x1e293b);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Glowing concentric circuit boundary rings
    const ringGeo = new THREE.RingGeometry(11.8, 12.0, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.02;
    scene.add(ringMesh);

    // 7. Create 3D Nodes
    const nodeMeshes: THREE.Group[] = [];
    const raycastTargets: THREE.Object3D[] = [];

    NODES_CONFIG.forEach((node) => {
      const group = new THREE.Group();
      group.position.set(...node.pos);
      group.userData = { nodeConfig: node };

      const isAttacked = attackedBusIds.includes(node.id);
      const nodeColor = isAttacked ? 0xef4444 : new THREE.Color(node.color).getHex();

      // Base Pedestal
      const pedestalGeo = new THREE.CylinderGeometry(0.7, 0.85, 0.25, 16);
      const pedestalMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.4,
        metalness: 0.8,
      });
      const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
      pedestal.position.y = 0.12;
      group.add(pedestal);

      // Node Geometry based on type
      if (node.type === "slack") {
        // High-voltage Substation Transformer
        const trafoGeo = new THREE.BoxGeometry(0.8, 0.9, 0.8);
        const trafoMat = new THREE.MeshStandardMaterial({ color: nodeColor, metalness: 0.7, roughness: 0.3 });
        const trafo = new THREE.Mesh(trafoGeo, trafoMat);
        trafo.position.y = 0.65;
        group.add(trafo);

        // Insulators
        for (let i = -0.25; i <= 0.25; i += 0.25) {
          const insGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.4, 8);
          const insMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });
          const ins = new THREE.Mesh(insGeo, insMat);
          ins.position.set(i, 1.2, 0);
          group.add(ins);
        }
      } else if (node.type === "solar") {
        // Slanted Solar Panels
        for (let r = -0.3; r <= 0.3; r += 0.6) {
          const panelGeo = new THREE.BoxGeometry(0.9, 0.04, 0.6);
          const panelMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.2, metalness: 0.9 });
          const panel = new THREE.Mesh(panelGeo, panelMat);
          panel.position.set(0, 0.45, r);
          panel.rotation.x = -Math.PI / 6;
          group.add(panel);
        }
      } else if (node.type === "wind") {
        // Wind Turbine Tower
        const towerGeo = new THREE.CylinderGeometry(0.1, 0.2, 1.8, 12);
        const towerMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });
        const tower = new THREE.Mesh(towerGeo, towerMat);
        tower.position.y = 1.0;
        group.add(tower);

        // Nacelle
        const nacelleGeo = new THREE.BoxGeometry(0.3, 0.2, 0.45);
        const nacelle = new THREE.Mesh(nacelleGeo, towerMat);
        nacelle.position.set(0, 1.9, 0);
        group.add(nacelle);

        // Blades
        const bladesGroup = new THREE.Group();
        bladesGroup.position.set(0, 1.9, 0.25);
        for (let b = 0; b < 3; b++) {
          const bladeGeo = new THREE.BoxGeometry(0.08, 1.1, 0.02);
          const bladeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
          const blade = new THREE.Mesh(bladeGeo, bladeMat);
          blade.rotation.z = (b * Math.PI * 2) / 3;
          blade.position.y = 0.5 * Math.cos((b * Math.PI * 2) / 3);
          blade.position.x = 0.5 * Math.sin((b * Math.PI * 2) / 3);
          bladesGroup.add(blade);
        }
        group.add(bladesGroup);
        windBladesRef.current.push(bladesGroup);
      } else if (node.type === "bess") {
        // Battery Storage Units
        for (let b = -0.3; b <= 0.3; b += 0.6) {
          const battGeo = new THREE.BoxGeometry(0.5, 0.7, 0.8);
          const battMat = new THREE.MeshStandardMaterial({ color: 0x047857, metalness: 0.8 });
          const batt = new THREE.Mesh(battGeo, battMat);
          batt.position.set(b, 0.55, 0);
          group.add(batt);
        }
      } else if (node.type === "hospital") {
        // Hospital Facility with Emergency Cross
        const hospGeo = new THREE.BoxGeometry(0.9, 0.85, 0.9);
        const hospMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5 });
        const hosp = new THREE.Mesh(hospGeo, hospMat);
        hosp.position.y = 0.6;
        group.add(hosp);

        const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.05), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        crossV.position.set(0, 0.7, 0.46);
        group.add(crossV);

        const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.05), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        crossH.position.set(0, 0.7, 0.46);
        group.add(crossH);
      } else if (node.type === "industrial") {
        // Factory with chimneys
        const factGeo = new THREE.BoxGeometry(1.1, 0.65, 0.9);
        const factMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 });
        const fact = new THREE.Mesh(factGeo, factMat);
        fact.position.y = 0.5;
        group.add(fact);

        const chim1 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.6, 8), factMat);
        chim1.position.set(0.3, 0.9, 0.2);
        group.add(chim1);
      } else {
        // Smart District / Switchgear
        const distGeo = new THREE.DodecahedronGeometry(0.45);
        const distMat = new THREE.MeshStandardMaterial({ color: nodeColor, metalness: 0.9, roughness: 0.2 });
        const dist = new THREE.Mesh(distGeo, distMat);
        dist.position.y = 0.6;
        group.add(dist);
      }

      // Glowing Aura Spheres
      const auraGeo = new THREE.SphereGeometry(isAttacked ? 1.05 : 0.85, 16, 16);
      const auraMat = new THREE.MeshBasicMaterial({
        color: nodeColor,
        transparent: true,
        opacity: isAttacked ? 0.35 : 0.15,
        wireframe: true,
      });
      const aura = new THREE.Mesh(auraGeo, auraMat);
      aura.position.y = 0.6;
      group.add(aura);

      scene.add(group);
      nodeMeshes.push(group);
      raycastTargets.push(pedestal);
    });

    // 8. Transmission Lines with Animated Pulsing Particles
    const lineParticles: THREE.Points[] = [];

    LINE_CONNECTIONS.forEach(([fromId, toId]) => {
      const fromNode = NODES_CONFIG.find((n) => n.id === fromId);
      const toNode = NODES_CONFIG.find((n) => n.id === toId);
      if (!fromNode || !toNode) return;

      const p1 = new THREE.Vector3(...fromNode.pos).add(new THREE.Vector3(0, 0.5, 0));
      const p2 = new THREE.Vector3(...toNode.pos).add(new THREE.Vector3(0, 0.5, 0));

      // Cable Curve with catenary sag
      const mid = p1.clone().lerp(p2, 0.5);
      mid.y -= 0.25;
      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);

      // Line Tube
      const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.04, 8, false);
      const isConnectionAttacked = attackedBusIds.includes(fromId) || attackedBusIds.includes(toId);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: isConnectionAttacked ? 0xef4444 : 0x0284c7,
        transparent: true,
        opacity: 0.6,
      });
      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      scene.add(tube);

      // Flowing Power Particles
      const particleCount = 20;
      const points = curve.getPoints(particleCount);
      const particleGeo = new THREE.BufferGeometry().setFromPoints(points);

      const particleMat = new THREE.PointsMaterial({
        color: isConnectionAttacked ? 0xf87171 : 0x38bdf8,
        size: 0.12,
        transparent: true,
        opacity: 0.9,
      });

      const particleSystem = new THREE.Points(particleGeo, particleMat);
      particleSystem.userData = { curve, progress: Math.random() };
      scene.add(particleSystem);
      lineParticles.push(particleSystem);
    });

    lineParticlesRef.current = lineParticles;

    // 9. Raycasting Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(raycastTargets, true);

      if (intersects.length > 0) {
        let parent: THREE.Object3D | null = intersects[0].object;
        while (parent && !parent.userData?.nodeConfig) {
          parent = parent.parent;
        }
        if (parent?.userData?.nodeConfig) {
          const cfg = parent.userData.nodeConfig as Node3DConfig;
          setSelectedNode(cfg);
          const matchedBus = buses.find((b) => b.bus_id === cfg.id);
          if (matchedBus && onSelectBus) {
            onSelectBus(matchedBus);
          }
        }
      }
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    // 10. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      controls.update();

      // Rotate wind blades
      windBladesRef.current.forEach((blades) => {
        blades.rotation.z += delta * 2.5;
      });

      // Animate flowing power particles
      lineParticles.forEach((p) => {
        const curve = p.userData.curve as THREE.QuadraticBezierCurve3;
        const pts = curve.getPoints(20);
        const posAttr = p.geometry.attributes.position;
        if (!posAttr) return;

        const offset = (elapsed * 0.3) % 1;
        for (let i = 0; i < 20; i++) {
          const t = (i / 20 + offset) % 1;
          const pt = curve.getPoint(t);
          posAttr.setXYZ(i, pt.x, pt.y, pt.z);
        }
        posAttr.needsUpdate = true;
      });

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 520;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [attackedBusIds, buses, onSelectBus]);

  // Camera preset views
  const handleSetCamera = (view: "isometric" | "top" | "solar" | "hospital") => {
    setCameraPreset(view);
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (view === "isometric") {
      camera.position.set(0, 14, 16);
      controls.target.set(0, 0, 0);
    } else if (view === "top") {
      camera.position.set(0, 24, 0.1);
      controls.target.set(0, 0, 0);
    } else if (view === "solar") {
      camera.position.set(-1.2, 5, -1);
      controls.target.set(-1.2, 0.4, -4);
    } else if (view === "hospital") {
      camera.position.set(-2.2, 4.5, 7);
      controls.target.set(-2.2, 0.5, 4);
    }
  };

  const selectedBusData = selectedNode ? buses.find((b) => b.bus_id === selectedNode.id) : null;
  const isSelectedAttacked = selectedNode ? attackedBusIds.includes(selectedNode.id) : false;

  return (
    <div className="relative w-full h-[520px] rounded-2xl border border-cyan-500/25 bg-slate-950 overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.12)]">
      {/* 3D Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Overlay HUD */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-slate-900/80 px-3.5 py-1.5 backdrop-blur-md">
          <Activity className="h-4 w-4 text-cyan-400 animate-pulse" />
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-cyan-200">
            3D Microgrid Digital Twin
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </div>

        {attackedBusIds.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-xl border border-red-500/50 bg-red-950/80 px-3 py-1.5 text-red-300 font-mono text-xs animate-bounce">
            <ShieldAlert className="h-4 w-4 text-red-400" />
            <span>CYBER INTRUSION DETECTED ON NODE {attackedBusIds.join(", ")}</span>
          </div>
        )}
      </div>

      {/* Camera View Switcher */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/80 p-1 backdrop-blur-md font-mono text-[11px]">
        <button
          onClick={() => handleSetCamera("isometric")}
          className={`px-2.5 py-1 rounded-lg transition-colors ${
            cameraPreset === "isometric" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "text-slate-400 hover:text-white"
          }`}
        >
          Isometric
        </button>
        <button
          onClick={() => handleSetCamera("top")}
          className={`px-2.5 py-1 rounded-lg transition-colors ${
            cameraPreset === "top" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "text-slate-400 hover:text-white"
          }`}
        >
          Overhead 2D
        </button>
        <button
          onClick={() => handleSetCamera("solar")}
          className={`px-2.5 py-1 rounded-lg transition-colors ${
            cameraPreset === "solar" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "text-slate-400 hover:text-white"
          }`}
        >
          Solar DER
        </button>
        <button
          onClick={() => handleSetCamera("hospital")}
          className={`px-2.5 py-1 rounded-lg transition-colors ${
            cameraPreset === "hospital" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "text-slate-400 hover:text-white"
          }`}
        >
          Critical Feeder
        </button>
      </div>

      {/* Selected Node Details Card */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 z-10 w-80 rounded-xl border border-cyan-500/30 bg-slate-950/90 p-4 backdrop-blur-xl shadow-2xl font-mono text-xs text-slate-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: isSelectedAttacked ? "#ef4444" : selectedNode.color }}
              />
              <span className="font-semibold text-white">Node {selectedNode.id}</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                isSelectedAttacked
                  ? "bg-red-500/20 text-red-300 border border-red-500/40"
                  : selectedBusData?.voltage_violation
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-emerald-500/20 text-emerald-300"
              }`}
            >
              {isSelectedAttacked ? "COMPROMISED" : selectedBusData?.voltage_violation ? "VOLTAGE SAG" : "SECURE"}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 mb-3">{selectedNode.name}</p>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg bg-slate-900/60 p-2">
              <span className="text-slate-500 block text-[10px]">VOLTAGE (Vm)</span>
              <span className={`font-bold ${isSelectedAttacked ? "text-red-400" : "text-cyan-300"}`}>
                {selectedBusData ? `${selectedBusData.vm_pu.toFixed(3)} p.u.` : "1.015 p.u."}
              </span>
            </div>

            <div className="rounded-lg bg-slate-900/60 p-2">
              <span className="text-slate-500 block text-[10px]">ANGLE (δ)</span>
              <span className="font-bold text-white">
                {selectedBusData ? `${selectedBusData.va_degree.toFixed(2)}°` : "-0.85°"}
              </span>
            </div>

            <div className="rounded-lg bg-slate-900/60 p-2">
              <span className="text-slate-500 block text-[10px]">ACTIVE POWER (P)</span>
              <span className="font-bold text-white">
                {selectedBusData ? `${selectedBusData.p_mw.toFixed(2)} MW` : "0.50 MW"}
              </span>
            </div>

            <div className="rounded-lg bg-slate-900/60 p-2">
              <span className="text-slate-500 block text-[10px]">REACTIVE (Q)</span>
              <span className="font-bold text-white">
                {selectedBusData ? `${selectedBusData.q_mvar.toFixed(2)} MVAr` : "0.15 MVAr"}
              </span>
            </div>
          </div>

          <button
            onClick={() => setSelectedNode(null)}
            className="mt-3 w-full rounded-lg bg-slate-800/80 py-1 text-center text-[10px] text-slate-400 hover:text-white transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Bottom Hint */}
      <div className="absolute bottom-3 right-4 z-10 pointer-events-none font-mono text-[10px] text-slate-500">
        Click node to inspect telemetry • Drag to orbit • Scroll to zoom
      </div>
    </div>
  );
}

