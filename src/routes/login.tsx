import { ClientOnly, createFileRoute, useRouter } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import LoginPanel from "@/components/auth/LoginPanel";

const GalaxyScene = lazy(() => import("@/components/galaxy/GalaxyScene"));

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Identity Verification — GridSentinel AI" },
      { name: "description", content: "GridSentinel Commander Identity Verification" },
    ],
  }),
  component: LoginScreen,
});

function LoginScreen() {
  const router = useRouter();

  const handleSuccess = () => {
    router.navigate({ to: "/overview" });
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#02050e] select-none">
      {/* Background Star & Space Atmosphere */}
      <div className="absolute inset-0 opacity-40">
        <ClientOnly fallback={null}>
          <Suspense fallback={null}>
            <GalaxyScene />
          </Suspense>
        </ClientOnly>
      </div>

      {/* Deep Navy & Charcoal Black Atmosphere Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#02050e]/85 via-[#060c1c]/90 to-[#02050e]/95 backdrop-blur-[3px]" />

      {/* Subtle Blue-White Radial Highlight */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-900/15 via-transparent to-transparent" />

      {/* Centered Glassmorphism Login Panel */}
      <div className="relative z-10 flex h-full items-center justify-center p-4">
        <LoginPanel onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
