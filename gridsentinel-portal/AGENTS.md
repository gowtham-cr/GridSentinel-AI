<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Opening screen lives in `src/features/opening/` and the dashboard in `src/features/dashboard/`; neither imports the other — routes (`/` and `/dashboard`) wire them together so each can be developed independently.
- The opening 3D scene is R3F on an `ssr: false` route; camera/FX values live in a plain mutable `Rig` object tweened by GSAP and read in `useFrame`, so animation never re-renders React.
- Overlay text/button animation uses Framer Motion; the portal transition timeline uses GSAP and calls `onEnter` when done.
- Particle counts come from `particleBudget()` in `rig.ts` so phones get smaller budgets.
- The canvas wrapper sets `data-scene-ready` after the first frame (used by headless screenshot checks).
