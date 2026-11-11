/**
 * DeceptAI Sentinel — Authentication Server Functions (Isomorphic Bridge)
 *
 * Exposes TanStack Start server functions to the frontend application:
 * 1. loginServerFn: Authenticates Commander credentials.
 * 2. getSessionServerFn: Validates current session.
 * 3. logoutServerFn: Invalidates session.
 *
 * Handlers delegate dynamically to the server-only module (auth.server.ts).
 */

import { createServerFn } from "@tanstack/react-start";
import type {
  AuthResult,
  LoginInput,
  SessionResult,
  CookieAdapter,
} from "./auth.server";

export const SESSION_COOKIE_NAME = "deceptai_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export const COMMANDER_USER = {
  id: "GOWTHAM",
  name: "Commander Gowtham",
  role: "commander",
} as const;

export type { AuthResult, LoginInput, SessionResult, CookieAdapter };

/**
 * Server function: Validates Commander identity & password and sets session cookie.
 * Inherits Start CSRF middleware protection automatically.
 */
export const loginServerFn = createServerFn({ method: "POST" })
  .validator((data: unknown): LoginInput => {
    if (
      !data ||
      typeof data !== "object" ||
      !("identity" in data) ||
      !("password" in data)
    ) {
      throw new Error("Identity and password are required");
    }
    const { identity, password } = data as { identity: unknown; password: unknown };
    if (typeof identity !== "string" || !identity.trim()) {
      throw new Error("Identity is required");
    }
    if (typeof password !== "string" || !password.trim()) {
      throw new Error("Password is required");
    }
    return {
      identity: identity.trim(),
      password: password.trim(),
    };
  })
  .handler(async ({ data }): Promise<AuthResult> => {
    const { handleLogin } = await import("./auth.server");
    return handleLogin(data);
  });

/**
 * Server function: Validates current session from HTTP-only cookie.
 */
export const getSessionServerFn = createServerFn({ method: "GET" })
  .handler(async (): Promise<SessionResult | null> => {
    const { handleGetSession } = await import("./auth.server");
    return handleGetSession();
  });

/**
 * Server function: Clears session cookie upon logout.
 * Inherits Start CSRF middleware protection automatically.
 */
export const logoutServerFn = createServerFn({ method: "POST" })
  .handler(async (): Promise<{ success: true }> => {
    const { handleLogout } = await import("./auth.server");
    return handleLogout();
  });
