import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { OpeningScreen } from "@/features/opening/OpeningScreen";

export const Route = createFileRoute("/")({
  // WebGL scene: render only in the browser.
  ssr: false,
  head: () => ({
    meta: [
      { title: "GridSentinel AI — Welcome to the Grid" },
      {
        name: "description",
        content: "Enter GridSentinel AI through a cinematic galaxy portal into your grid cybersecurity command center.",
      },
      { property: "og:title", content: "GridSentinel AI — Welcome to the Grid" },
      {
        property: "og:description",
        content: "A cinematic 3D gateway into GridSentinel AI's cybersecurity command center.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const enter = useCallback(() => navigate({ to: "/login" }), [navigate]);
  return <OpeningScreen operatorName="Gowtham" onEnter={enter} />;
}
