/**
 * DeceptAI Sentinel — Server-Side Authentication Implementation
 *
 * Server-only module for authentication, rate limiting, and session cookies.
 * NEVER import this file into browser/client components.
 */

import {
  setCookie,
  getCookie,
  deleteCookie,
  getRequestIP,
} from "@tanstack/react-start/server";
import {
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  type SessionUser,
} from "./crypto";

export const SESSION_COOKIE_NAME = "deceptai_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export const COMMANDER_USER: SessionUser = {
  id: "GOWTHAM",
  name: "Commander Gowtham",
  role: "commander",
};

const VALID_IDENTITIES = new Set(["COMMANDER_GOWTHAM", "GOWTHAM"]);

export interface LoginInput {
  identity: string;
  password: string;
}

export type AuthResult =
  | { success: true; user: SessionUser }
  | { success: false; error: string; code?: string | undefined; retryAfterSeconds?: number | undefined };

export interface SessionResult {
  user: SessionUser;
}

export interface CookieAdapter {
  get(name: string): string | undefined;
  set(
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: "lax" | "strict" | "none";
      path: string;
      maxAge: number;
    }
  ): void;
  delete(name: string, options?: { path?: string }): void;
}

// Default runtime cookie adapter delegating to TanStack Start / Nitro H3
const defaultCookieAdapter: CookieAdapter = {
  get: (name) => {
    try {
      return getCookie(name);
    } catch {
      return undefined;
    }
  },
  set: (name, value, options) => {
    setCookie(name, value, options);
  },
  delete: (name, options) => {
    deleteCookie(name, options);
  },
};

/**
 * Returns cookie security options: HTTP-only, SameSite=Lax, and Secure in production.
 */
export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

/**
 * In-Memory Rate Limiter for Authentication Attempts
 * 
 * Policy:
 * - Max 5 failed attempts within a 5-minute window.
 * - After 5 failed attempts, target key is locked out for 15 minutes.
 */
interface RateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const rateLimitStore = new Map<string, RateLimitRecord>();

function pruneRateLimitStore(now: number) {
  if (rateLimitStore.size > 200) {
    for (const [key, record] of rateLimitStore.entries()) {
      if (
        (record.lockedUntil && now > record.lockedUntil) ||
        now - record.firstAttemptAt > ATTEMPT_WINDOW_MS * 2
      ) {
        rateLimitStore.delete(key);
      }
    }
  }
}

export function checkRateLimit(key: string): {
  allowed: boolean;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  pruneRateLimitStore(now);

  const record = rateLimitStore.get(key);
  if (!record) {
    return { allowed: true };
  }

  if (record.lockedUntil) {
    if (now < record.lockedUntil) {
      const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return { allowed: false, retryAfterSeconds };
    }
    rateLimitStore.delete(key);
    return { allowed: true };
  }

  if (now - record.firstAttemptAt > ATTEMPT_WINDOW_MS) {
    rateLimitStore.delete(key);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now - record.firstAttemptAt > ATTEMPT_WINDOW_MS) {
    rateLimitStore.set(key, {
      attempts: 1,
      firstAttemptAt: now,
    });
    return;
  }

  record.attempts += 1;
  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCK_DURATION_MS;
  }
}

export function clearRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

export function resetRateLimits(): void {
  rateLimitStore.clear();
}

function getClientIdentifier(identity: string): string {
  try {
    const ip = getRequestIP();
    if (ip) {
      return `${ip}:${identity.trim().toUpperCase()}`;
    }
  } catch {
    // Non-server-request runtime or test environment
  }
  return identity.trim().toUpperCase();
}

/**
 * Core Authentication Handler:
 * 1. Checks rate limiting.
 * 2. Validates identity.
 * 3. Verifies scrypt hash.
 * 4. Signs session token and sets HTTP-only cookie.
 */
export async function handleLogin(
  input: LoginInput,
  options?: {
    cookieAdapter?: CookieAdapter;
    clientKey?: string;
  }
): Promise<AuthResult> {
  const cookie = options?.cookieAdapter ?? defaultCookieAdapter;
  const clientKey = options?.clientKey ?? getClientIdentifier(input.identity ?? "UNKNOWN");

  // 1. Check rate limiting
  const rateLimitStatus = checkRateLimit(clientKey);
  if (!rateLimitStatus.allowed) {
    return {
      success: false,
      error: `Too many failed attempts. Identity verification locked for ${Math.ceil(
        (rateLimitStatus.retryAfterSeconds ?? 900) / 60
      )} minutes.`,
      code: "RATE_LIMITED",
      retryAfterSeconds: rateLimitStatus.retryAfterSeconds,
    };
  }

  // 2. Validate input fields
  if (!input.identity || !input.identity.trim() || !input.password || !input.password.trim()) {
    return {
      success: false,
      error: "Identity and password are required.",
      code: "INVALID_INPUT",
    };
  }

  // 3. Verify server environment configuration
  const sessionSecret = process.env["SESSION_SECRET"];
  const storedHash = process.env["COMMANDER_PASSWORD_HASH"];

  if (!sessionSecret || sessionSecret.trim().length < 16) {
    return {
      success: false,
      error: "Authentication service configuration incomplete on server. SESSION_SECRET missing or insecure.",
      code: "CONFIG_ERROR",
    };
  }

  if (!storedHash || !storedHash.trim()) {
    return {
      success: false,
      error: "Commander credentials are not configured on server. COMMANDER_PASSWORD_HASH missing.",
      code: "CONFIG_ERROR",
    };
  }

  // 4. Verify identity matches Commander
  const normalizedIdentity = input.identity.trim().toUpperCase();
  if (!VALID_IDENTITIES.has(normalizedIdentity)) {
    recordFailedAttempt(clientKey);
    return {
      success: false,
      error: "Invalid identity or access password.",
      code: "INVALID_CREDENTIALS",
    };
  }

  // 5. Verify password against stored scrypt hash using timingSafeEqual
  const isPasswordValid = await verifyPassword(input.password, storedHash);
  if (!isPasswordValid) {
    recordFailedAttempt(clientKey);
    return {
      success: false,
      error: "Invalid identity or access password.",
      code: "INVALID_CREDENTIALS",
    };
  }

  // 6. Authentication successful: reset rate limiter
  clearRateLimit(clientKey);

  // 7. Create signed HMAC-SHA256 session token
  const token = createSessionToken(
    COMMANDER_USER,
    sessionSecret,
    SESSION_MAX_AGE_SECONDS
  );

  // 8. Issue HTTP-only, SameSite=Lax session cookie
  cookie.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());

  return {
    success: true,
    user: COMMANDER_USER,
  };
}

export async function handleGetSession(options?: {
  cookieAdapter?: CookieAdapter;
}): Promise<SessionResult | null> {
  const cookie = options?.cookieAdapter ?? defaultCookieAdapter;
  const token = cookie.get(SESSION_COOKIE_NAME);

  if (!token) {
    return null;
  }

  const sessionSecret = process.env["SESSION_SECRET"];
  if (!sessionSecret) {
    return null;
  }

  const user = verifySessionToken(token, sessionSecret);
  if (!user) {
    return null;
  }

  return { user };
}

export async function handleLogout(options?: {
  cookieAdapter?: CookieAdapter;
}): Promise<{ success: true }> {
  const cookie = options?.cookieAdapter ?? defaultCookieAdapter;
  cookie.delete(SESSION_COOKIE_NAME, { path: "/" });
  return { success: true };
}

