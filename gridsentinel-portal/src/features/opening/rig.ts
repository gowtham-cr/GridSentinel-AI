/**
 * Shared, mutable camera/FX state for the opening scene.
 * GSAP tweens these numbers; the scene reads them every frame.
 * Kept outside React so animation never triggers re-renders.
 */
export interface Rig {
  /** Camera distance on the z axis (portal sits at z = 0). */
  z: number;
  /** Camera vertical field of view in degrees. */
  fov: number;
  /** 0 → 1: portal energy surge. */
  boost: number;
  /** 0 → 1: hyperspace streaks + camera shake. */
  warp: number;
  /** Normalised pointer position, -1..1. */
  pointerX: number;
  pointerY: number;
}

export const RIG_START_Z = 64;
export const RIG_IDLE_Z = 13;
export const RIG_IDLE_FOV = 55;

export function createRig(): Rig {
  return {
    z: RIG_START_Z,
    fov: RIG_IDLE_FOV,
    boost: 0,
    warp: 0,
    pointerX: 0,
    pointerY: 0,
  };
}

/** Particle budgets scale with screen size so phones stay smooth. */
export function particleBudget(width: number) {
  const small = width < 768;
  return {
    stars: small ? 3500 : 7000,
    galaxy: small ? 18000 : 42000,
    accretion: small ? 1400 : 2800,
    streaks: small ? 260 : 520,
  };
}
