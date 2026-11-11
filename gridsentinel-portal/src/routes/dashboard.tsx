import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Lock, ArrowRight, Sparkles, Orbit } from "lucide-react";
import { Dashboard } from "@/features/dashboard/Dashboard";
import { useOperatorAuth, DEMO_CREDENTIALS } from "@/features/auth/authStore";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Command Center — GridSentinel AI" },
      {
        name: "description",
        content:
          "Live grid threat activity, substation health and AI-driven containment in one security dashboard.",
      },
      { property: "og:title", content: "Command Center — GridSentinel AI" },
      {
        property: "og:description",
        content: "Real-time cybersecurity monitoring for critical grid infrastructure.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const { session, isAuthenticated, login, logout } = useOperatorAuth();

  const handleSignOut = useCallback(() => {
    logout();
    void navigate({ to: "/login", replace: true });
  }, [logout, navigate]);

  const handleQuickDemoLogin = useCallback(async () => {
    await login({
      usernameOrEmail: DEMO_CREDENTIALS.username,
      password: DEMO_CREDENTIALS.defaultPassword,
      rememberMe: true,
    });
  }, [login]);

  // Protected route check
  if (!isAuthenticated || !session) {
    return (
      <div className="relative min-h-dvh overflow-hidden bg-void bg-grid flex items-center justify-center p-4">
        {/* Ambient red / cyan defense glow */}
        <div className="pointer-events-none fixed inset-0 bg-radial-[ellipse_80%_80%_at_50%_50%] from-destructive/10 via-transparent to-void" />

        <motion.div
          className="relative w-full max-w-md overflow-hidden rounded-xl border border-destructive/40 bg-background/95 p-6 sm:p-8 text-center shadow-2xl backdrop-blur-xl"
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Corner accents */}
          <span className="pointer-events-none absolute -top-1 -left-1 size-3 border-t-2 border-l-2 border-destructive/70" />
          <span className="pointer-events-none absolute -top-1 -right-1 size-3 border-t-2 border-r-2 border-destructive/70" />
          <span className="pointer-events-none absolute -bottom-1 -left-1 size-3 border-b-2 border-l-2 border-destructive/70" />
          <span className="pointer-events-none absolute -bottom-1 -right-1 size-3 border-b-2 border-r-2 border-destructive/70" />

          <div className="mx-auto flex size-14 items-center justify-center rounded-full border border-destructive/50 bg-destructive/10 text-destructive shadow-[0_0_20px_rgba(239,68,68,0.3)]">
            <ShieldAlert className="size-7" />
          </div>

          <h2 className="mt-4 font-mono text-sm uppercase tracking-[0.22em] text-destructive font-bold">
            RESTRICTED CONTROLLER ACCESS
          </h2>
          <p className="mt-1 font-mono text-xs text-muted-foreground uppercase tracking-widest">
            NERC CIP-005 ELECTRONIC SECURITY PERIMETER
          </p>

          <p className="mt-4 text-xs text-foreground/80 leading-relaxed font-sans">
            This cyber-physical microgrid dashboard is protected. Valid Level 4
            operator authorization is required before interacting with SCADA
            telemetry or threat mitigation systems.
          </p>

          <div className="mt-6 flex flex-col gap-3 font-mono text-xs">
            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-primary bg-primary px-4 py-3 font-bold uppercase tracking-wider text-primary-foreground shadow-[0_0_15px_rgba(34,211,238,0.4)] hover:bg-primary/90 transition-all cursor-pointer"
            >
              <Lock className="size-3.5" />
              <span>Operator Login Portal</span>
              <ArrowRight className="size-3.5" />
            </Link>

            <button
              type="button"
              onClick={handleQuickDemoLogin}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-accent/40 bg-accent/10 px-4 py-2.5 font-bold uppercase tracking-wider text-accent hover:bg-accent/20 transition-all cursor-pointer"
            >
              <Sparkles className="size-3.5" />
              <span>1-Click Demo Login (Commander Gowtham)</span>
            </button>

            <Link
              to="/"
              className="inline-flex items-center justify-center gap-1.5 text-muted-foreground hover:text-primary transition-colors py-1"
            >
              <Orbit className="size-3" />
              <span>Return to Galaxy Intro</span>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <Dashboard
      operatorName={session.operatorName}
      session={session}
      onSignOut={handleSignOut}
    />
  );
}
