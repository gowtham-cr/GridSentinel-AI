import { Shield, ShieldCheck, CheckCircle2, Lock, Zap, Activity } from "lucide-react";

export function KeySafetyFeaturesPanel() {
  const safetyFeatures = [
    {
      title: "Control Barrier Functions (CBF)",
      code: "h(x) ≥ 0 Invariance",
      status: "ACTIVE",
      desc: "Guarantees formal mathematical forward invariance of the safe operating set, preventing thermal overloads and voltage collapse.",
      tag: "Formal Verification",
    },
    {
      title: "NERC PRC-024 Envelope",
      code: "0.95 - 1.05 pu / 49.8 - 50.2 Hz",
      status: "COMPLIANT",
      desc: "Mandatory bulk-power grid voltage and frequency ride-through protection boundary, automatically isolating out-of-band equipment.",
      tag: "Regulatory Standard",
    },
    {
      title: "IEEE 1547-2018 DER Intertie",
      code: "Anti-Islanding & V-Q Droop",
      status: "ENGAGED",
      desc: "Smart inverter autonomous ride-through with Volt-VAR and Frequency-Watt active droop control during transmission disturbances.",
      tag: "Microgrid Intertie",
    },
    {
      title: "SCADA Bad Data Filter (BDD)",
      code: "Normalized Residual ||r_N||_∞",
      status: "ARMED",
      desc: "Identifies and discards falsified telemetry injected via false data injection (FDIA) attacks before feeding state estimators.",
      tag: "Cyber Defense",
    },
    {
      title: "Fast Frequency Response (FFR)",
      code: "BESS Synthetic Inertia (4% Droop)",
      status: "ONLINE",
      desc: "Millisecond-scale battery energy storage response to arresting rapid rate-of-change-of-frequency (RoCoF) under sudden generator trips.",
      tag: "Grid Stability",
    },
  ];

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-4 backdrop-blur-xl shadow-lg font-mono text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-primary" />
          <h4 className="font-bold uppercase tracking-wider text-foreground">
            Key Safety Features & Cyber-Physical Interlocks
          </h4>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="rounded border border-success/40 bg-success/15 px-2 py-0.5 text-success font-semibold flex items-center gap-1">
            <CheckCircle2 className="size-3" />
            ALL BARRIERS ARMED
          </span>
        </div>
      </div>

      {/* 5 Safety Barrier Cards */}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {safetyFeatures.map((feat, idx) => (
          <div
            key={idx}
            className="p-2.5 rounded-lg border border-border/60 bg-void/50 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-primary-glow font-bold truncate">{feat.title}</span>
                <span className="rounded bg-success/20 px-1 py-0.2 text-[8px] text-success font-semibold">
                  {feat.status}
                </span>
              </div>
              <p className="mt-1 font-mono text-[9px] text-muted-foreground font-semibold">
                {feat.code}
              </p>
              <p className="mt-1 text-[9px] text-muted-foreground leading-tight line-clamp-3">
                {feat.desc}
              </p>
            </div>
            <div className="mt-2 pt-1 border-t border-border/40 text-[8px] text-primary/80 font-semibold">
              {feat.tag}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

