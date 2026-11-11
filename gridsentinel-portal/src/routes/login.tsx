import { createFileRoute } from "@tanstack/react-router";
import { LoginScreen } from "@/features/auth/LoginScreen";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Operator Authentication — GridSentinel AI" },
      {
        name: "description",
        content: "Futuristic cybersecurity login gateway for GridSentinel AI CPS controller.",
      },
      { property: "og:title", content: "Operator Authentication — GridSentinel AI" },
      {
        property: "og:description",
        content: "Secure CIP-005 authentication portal for microgrid cybersecurity operations.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return <LoginScreen />;
}
