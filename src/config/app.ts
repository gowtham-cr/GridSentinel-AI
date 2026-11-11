// Central app configuration for GridSentinel AI platform.
export const appConfig = {
  name: "GridSentinel AI",
  tagline: "AI-Powered Cyber-Physical Smart Grid & Microgrid Security Platform",
  apiBaseUrl: (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "http://localhost:8000/api/v1",
  wsBaseUrl: (import.meta.env["VITE_WS_BASE_URL"] as string | undefined) ?? "ws://localhost:8000",
} as const;

export const navItems = [
  { to: "/overview", label: "CPS Dashboard" },
  { to: "/detections", label: "Security & Alerts" },
  { to: "/decoys", label: "Attack Simulation" },
  { to: "/settings", label: "System & Compliance" },
] as const;
