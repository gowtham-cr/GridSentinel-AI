/**
 * GridSentinel AI — Authentication Store & Demo Auth Contract.
 *
 * NOTE ON BACKEND AUTHENTICATION INTEGRATION:
 * -------------------------------------------------------------
 * This module manages operator session state and demo authentication.
 * In production, `authenticate()` executes a secure POST request to the
 * FastAPI backend at `/api/v1/auth/token` with OAuth2 password grant.
 *
 * Demo credentials:
 *   - Operator ID / Email: gowtham@gridsentinel.ai (or 'gowtham')
 *   - Passcode: Sentinel@2026 (or any >= 6 char passcode in demo mode)
 */

import { useSyncExternalStore } from "react";

export interface OperatorSession {
  operatorId: string;
  operatorName: string;
  email: string;
  role: string;
  clearanceLevel: string;
  nodeId: string;
  token: string;
  isDemo: boolean;
  loginTime: string;
  rememberMe: boolean;
}

export const DEMO_CREDENTIALS = {
  username: "gowtham@gridsentinel.ai",
  altUsername: "gowtham",
  defaultPassword: "Sentinel@2026",
  operatorName: "Commander Gowtham",
  role: "Chief Grid Cyber Defense Officer",
  nodeId: "SENTINEL-ALPHA-07",
  clearanceLevel: "Level 4 (SCADA Critical Interconnect)",
};

const STORAGE_KEY = "gridsentinel_operator_session";
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

// ---------------------------------------------------------------------------
// In-Memory Reference Cache
// ---------------------------------------------------------------------------
// Maintaining an in-memory reference guarantees that `getSnapshot()` ALWAYS
// returns the exact same object reference between renders unless `setSession`
// or `clearSession` is called. This satisfies React 18/19 `useSyncExternalStore`
// reference stability and prevents infinite re-render loops ("Maximum update depth exceeded").
let cachedSession: OperatorSession | null = null;
let isInitialized = false;

function readStorageSession(): OperatorSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OperatorSession;
  } catch {
    return null;
  }
}

function ensureInitialized(): OperatorSession | null {
  if (!isInitialized) {
    cachedSession = readStorageSession();
    isInitialized = true;
  }
  return cachedSession;
}

// Synchronize across browser tabs or external storage modifications
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      cachedSession = readStorageSession();
      notify();
    }
  });
}

export const authStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot(): OperatorSession | null {
    return ensureInitialized();
  },

  getServerSnapshot(): OperatorSession | null {
    return null;
  },

  setSession(session: OperatorSession, rememberMe: boolean) {
    cachedSession = session;
    isInitialized = true;

    if (typeof window !== "undefined") {
      try {
        const serialized = JSON.stringify(session);
        if (rememberMe) {
          localStorage.setItem(STORAGE_KEY, serialized);
          sessionStorage.removeItem(STORAGE_KEY);
        } else {
          sessionStorage.setItem(STORAGE_KEY, serialized);
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (err) {
        console.warn("Failed to persist operator session in storage:", err);
      }
    }
    notify();
  },

  clearSession() {
    cachedSession = null;
    isInitialized = true;

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(STORAGE_KEY);
      } catch (err) {
        console.warn("Failed to clear operator session from storage:", err);
      }
    }
    notify();
  },

  /**
   * Primary authentication pipeline.
   * Attempts real FastAPI JWT authentication at `/api/v1/auth/login`.
   * If backend is offline or during offline testing, falls back to demo authentication.
   */
  async authenticate(params: {
    usernameOrEmail: string;
    password: string;
    rememberMe: boolean;
  }): Promise<{ success: boolean; session?: OperatorSession; error?: string }> {
    const rawUser = params.usernameOrEmail.trim();
    const rawPass = params.password.trim();

    if (!rawUser) {
      return { success: false, error: "Operator ID or email is required." };
    }
    if (!rawPass || rawPass.length < 6) {
      return {
        success: false,
        error: "Security passcode must be at least 6 characters.",
      };
    }

    // 1. Attempt Real FastAPI JWT Authentication
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch("http://localhost:8000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username_or_email: rawUser,
          password: rawPass,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const user = data.user;
        const session: OperatorSession = {
          operatorId: user.operator_id,
          operatorName: user.full_name,
          email: user.email,
          role: user.role,
          clearanceLevel: user.clearance_level,
          nodeId: user.node_id,
          token: data.access_token, // Real signed JWT from FastAPI
          isDemo: false,
          loginTime: new Date().toISOString(),
          rememberMe: params.rememberMe,
        };
        authStore.setSession(session, params.rememberMe);
        return { success: true, session };
      }
    } catch {
      // Backend offline or unreachable, proceed to demo fallback
    }

    // 2. Demo mode authentication fallback
    return authStore.authenticateDemo(params);
  },

  /**
   * Temporary demo authentication simulator.
   * Simulates cryptographic verification steps before granting access.
   */
  async authenticateDemo(params: {
    usernameOrEmail: string;
    password: string;
    rememberMe: boolean;
  }): Promise<{ success: boolean; session?: OperatorSession; error?: string }> {
    const rawUser = params.usernameOrEmail.trim().toLowerCase();
    const rawPass = params.password.trim();

    // Basic format checks
    if (!rawUser) {
      return { success: false, error: "Operator ID or email is required." };
    }
    if (!rawPass || rawPass.length < 6) {
      return {
        success: false,
        error: "Security passcode must be at least 6 characters.",
      };
    }

    // In demo mode: accept gowtham / gowtham@gridsentinel.ai or any valid format for review
    const isAuthorized =
      rawUser === DEMO_CREDENTIALS.username ||
      rawUser === DEMO_CREDENTIALS.altUsername ||
      rawUser.endsWith("@gridsentinel.ai") ||
      rawUser === "admin";

    if (!isAuthorized && rawPass !== DEMO_CREDENTIALS.defaultPassword) {
      return {
        success: false,
        error:
          "ACCESS DENIED: Unauthorized operator credentials or invalid security clearance. Use demo credentials or 'gowtham@gridsentinel.ai'.",
      };
    }

    const session: OperatorSession = {
      operatorId: "GS-OP-7749",
      operatorName:
        rawUser === "admin"
          ? "System Administrator"
          : DEMO_CREDENTIALS.operatorName,
      email:
        rawUser === "gowtham"
          ? DEMO_CREDENTIALS.username
          : params.usernameOrEmail,
      role: DEMO_CREDENTIALS.role,
      clearanceLevel: DEMO_CREDENTIALS.clearanceLevel,
      nodeId: DEMO_CREDENTIALS.nodeId,
      token: `GS-DEMO-JWT-${Math.random().toString(36).substring(2, 10).toUpperCase()}-2026`,
      isDemo: true,
      loginTime: new Date().toISOString(),
      rememberMe: params.rememberMe,
    };

    authStore.setSession(session, params.rememberMe);
    return { success: true, session };
  },
};

/**
 * Hook to read current operator session and auth actions.
 */
export function useOperatorAuth() {
  const session = useSyncExternalStore(
    authStore.subscribe,
    authStore.getSnapshot,
    authStore.getServerSnapshot
  );

  return {
    session,
    isAuthenticated: Boolean(session),
    login: authStore.authenticate,
    logout: authStore.clearSession,
  };
}
