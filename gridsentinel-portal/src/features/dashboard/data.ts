/** Deterministic demo data for the security dashboard (safe for SSR). */

export const threatTimeline = Array.from({ length: 24 }, (_, i) => {
  const base = 40 + Math.sin(i / 2.4) * 18 + Math.cos(i / 1.3) * 9;
  return {
    hour: `${String(i).padStart(2, "0")}:00`,
    blocked: Math.round(base * 3.2 + (i % 5) * 11),
    anomalies: Math.round(base * 0.9 + ((i * 7) % 13)),
  };
});

export const threatVectors = [
  { name: "SCADA intrusion attempts", value: 82, level: "critical" as const },
  { name: "Phishing / credential stuffing", value: 64, level: "high" as const },
  { name: "DDoS on substation gateways", value: 47, level: "high" as const },
  { name: "Firmware tampering", value: 23, level: "medium" as const },
  { name: "Insider anomalies", value: 11, level: "low" as const },
];

export type Severity = "critical" | "high" | "medium" | "low";

export interface SecurityEvent {
  id: number;
  severity: Severity;
  source: string;
  message: string;
}

const SOURCES = ["SUB-14 Chennai", "SUB-03 Bengaluru", "PMU-221", "RTU-08 Hyderabad", "EMS Core", "Edge GW-7"];
const MESSAGES: Array<[Severity, string]> = [
  ["critical", "Unauthorized Modbus write blocked"],
  ["high", "Brute-force login pattern quarantined"],
  ["medium", "Anomalous load signature detected"],
  ["low", "Certificate rotation completed"],
  ["high", "Port scan from external ASN dropped"],
  ["medium", "Firmware hash drift flagged for review"],
  ["low", "Operator session verified (MFA)"],
  ["critical", "Lateral movement attempt isolated"],
];

export function makeEvent(id: number): SecurityEvent {
  const [severity, message] = MESSAGES[id % MESSAGES.length]!;
  return { id, severity, message, source: SOURCES[(id * 5) % SOURCES.length]! };
}

export const initialEvents = Array.from({ length: 7 }, (_, i) => makeEvent(i));

/** 14 × 8 grid of nodes; a few are flagged. */
export const gridNodes = Array.from({ length: 14 * 8 }, (_, i) => {
  const flagged = [17, 42, 43, 77, 96].includes(i);
  const warn = [8, 29, 61, 88, 103].includes(i);
  return { id: i, state: flagged ? "alert" : warn ? "warn" : "ok" } as const;
});
