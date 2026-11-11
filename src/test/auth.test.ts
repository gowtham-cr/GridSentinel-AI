import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  handleLogin,
  handleGetSession,
  handleLogout,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimits,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  COMMANDER_USER,
  type CookieAdapter,
} from "../server/auth.server";
import { hashPassword, createSessionToken } from "../server/crypto";

describe("Server Authentication Handlers", () => {
  const originalEnv = { ...process.env };
  const testSecret = "valid-secret-key-with-sufficient-entropy-123456";
  const testPassword = "CommanderSecretPasscode2026!";
  let testHash: string;

  // In-memory cookie adapter for isolated testing
  let cookies: Record<string, { value: string; options: any }> = {};
  const mockCookieAdapter: CookieAdapter = {
    get: (name: string) => cookies[name]?.value,
    set: (name: string, value: string, options: any) => {
      cookies[name] = { value, options };
    },
    delete: (name: string) => {
      delete cookies[name];
    },
  };

  beforeEach(async () => {
    cookies = {};
    resetRateLimits();
    testHash = await hashPassword(testPassword);
    process.env["SESSION_SECRET"] = testSecret;
    process.env["COMMANDER_PASSWORD_HASH"] = testHash;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("Authentication Success", () => {
    it("authenticates Commander with correct password and sets HTTP-only session cookie", async () => {
      const result = await handleLogin(
        { identity: "COMMANDER_GOWTHAM", password: testPassword },
        { cookieAdapter: mockCookieAdapter, clientKey: "test-client-1" }
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user).toEqual(COMMANDER_USER);
      }

      // Check cookie was set
      const sessionCookie = cookies[SESSION_COOKIE_NAME];
      expect(sessionCookie).toBeDefined();
      if (!sessionCookie) throw new Error("Expected sessionCookie to be set");
      expect(sessionCookie.value).toContain(".");
      expect(sessionCookie.options.httpOnly).toBe(true);
      expect(sessionCookie.options.sameSite).toBe("lax");
      expect(sessionCookie.options.path).toBe("/");
      expect(sessionCookie.options.maxAge).toBeGreaterThan(0);
    });

    it("accepts GOWTHAM as a valid Commander identity alias", async () => {
      const result = await handleLogin(
        { identity: "GOWTHAM", password: testPassword },
        { cookieAdapter: mockCookieAdapter, clientKey: "test-client-alias" }
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.id).toBe("GOWTHAM");
      }
    });
  });

  describe("Authentication Failures", () => {
    it("rejects an incorrect password without setting a cookie", async () => {
      const result = await handleLogin(
        { identity: "COMMANDER_GOWTHAM", password: "WrongPasscode!" },
        { cookieAdapter: mockCookieAdapter, clientKey: "test-client-wrong-pw" }
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid identity or access password.");
        expect(result.code).toBe("INVALID_CREDENTIALS");
      }
      expect(cookies[SESSION_COOKIE_NAME]).toBeUndefined();
    });

    it("rejects an unknown or unauthorized identity", async () => {
      const result = await handleLogin(
        { identity: "ATTACKER_AGENT", password: testPassword },
        { cookieAdapter: mockCookieAdapter, clientKey: "test-client-attacker" }
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid identity or access password.");
      }
      expect(cookies[SESSION_COOKIE_NAME]).toBeUndefined();
    });

    it("validates non-empty input parameters", async () => {
      const res1 = await handleLogin(
        { identity: "", password: testPassword },
        { cookieAdapter: mockCookieAdapter }
      );
      expect(res1.success).toBe(false);

      const res2 = await handleLogin(
        { identity: "COMMANDER_GOWTHAM", password: "" },
        { cookieAdapter: mockCookieAdapter }
      );
      expect(res2.success).toBe(false);
    });
  });

  describe("Missing Server Configuration", () => {
    it("returns a safe configuration error when COMMANDER_PASSWORD_HASH is missing", async () => {
      delete process.env["COMMANDER_PASSWORD_HASH"];

      const result = await handleLogin(
        { identity: "COMMANDER_GOWTHAM", password: testPassword },
        { cookieAdapter: mockCookieAdapter, clientKey: "test-client-no-hash" }
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("CONFIG_ERROR");
        expect(result.error).toContain("COMMANDER_PASSWORD_HASH missing");
      }
      expect(cookies[SESSION_COOKIE_NAME]).toBeUndefined();
    });

    it("returns a safe configuration error when SESSION_SECRET is missing or insecure", async () => {
      process.env["SESSION_SECRET"] = "short";

      const result = await handleLogin(
        { identity: "COMMANDER_GOWTHAM", password: testPassword },
        { cookieAdapter: mockCookieAdapter, clientKey: "test-client-bad-secret" }
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("CONFIG_ERROR");
      }
      expect(cookies[SESSION_COOKIE_NAME]).toBeUndefined();
    });
  });

  describe("Session Verification & Expiration", () => {
    it("validates an active session from cookie", async () => {
      // First login to establish session
      await handleLogin(
        { identity: "COMMANDER_GOWTHAM", password: testPassword },
        { cookieAdapter: mockCookieAdapter, clientKey: "test-session-valid" }
      );

      const session = await handleGetSession({ cookieAdapter: mockCookieAdapter });
      expect(session).not.toBeNull();
      expect(session?.user).toEqual(COMMANDER_USER);
    });

    it("returns null when session cookie is missing", async () => {
      const session = await handleGetSession({ cookieAdapter: mockCookieAdapter });
      expect(session).toBeNull();
    });

    it("returns null when session token is expired", async () => {
      // Create an expired session token
      const expiredToken = createSessionToken(COMMANDER_USER, testSecret, -100);
      mockCookieAdapter.set(SESSION_COOKIE_NAME, expiredToken, getSessionCookieOptions());

      const session = await handleGetSession({ cookieAdapter: mockCookieAdapter });
      expect(session).toBeNull();
    });

    it("returns null when session token signature is invalid", async () => {
      const forgedToken = createSessionToken(COMMANDER_USER, "wrong-forged-secret-123456");
      mockCookieAdapter.set(SESSION_COOKIE_NAME, forgedToken, getSessionCookieOptions());

      const session = await handleGetSession({ cookieAdapter: mockCookieAdapter });
      expect(session).toBeNull();
    });
  });

  describe("Logout Handler", () => {
    it("deletes the session cookie upon logout", async () => {
      // Establish session
      await handleLogin(
        { identity: "COMMANDER_GOWTHAM", password: testPassword },
        { cookieAdapter: mockCookieAdapter, clientKey: "test-logout" }
      );
      expect(cookies[SESSION_COOKIE_NAME]).toBeDefined();

      const logoutResult = await handleLogout({ cookieAdapter: mockCookieAdapter });
      expect(logoutResult.success).toBe(true);
      expect(cookies[SESSION_COOKIE_NAME]).toBeUndefined();

      // Subsequent session check should return null
      const sessionAfterLogout = await handleGetSession({ cookieAdapter: mockCookieAdapter });
      expect(sessionAfterLogout).toBeNull();
    });
  });

  describe("Rate Limiting", () => {
    it("locks out target after 5 consecutive failed attempts", async () => {
      const clientKey = "brute-force-target";

      for (let i = 0; i < 5; i++) {
        const attempt = await handleLogin(
          { identity: "COMMANDER_GOWTHAM", password: "BadPassword" },
          { cookieAdapter: mockCookieAdapter, clientKey }
        );
        expect(attempt.success).toBe(false);
      }

      // 6th attempt should be blocked by rate limiter even if password is correct
      const lockedAttempt = await handleLogin(
        { identity: "COMMANDER_GOWTHAM", password: testPassword },
        { cookieAdapter: mockCookieAdapter, clientKey }
      );

      expect(lockedAttempt.success).toBe(false);
      if (!lockedAttempt.success) {
        expect(lockedAttempt.code).toBe("RATE_LIMITED");
        expect(lockedAttempt.retryAfterSeconds).toBeGreaterThan(0);
      }
    });

    it("clears rate limit after successful login", async () => {
      const clientKey = "recovering-target";

      // 2 failed attempts
      recordFailedAttempt(clientKey);
      recordFailedAttempt(clientKey);

      // Successful login
      const result = await handleLogin(
        { identity: "COMMANDER_GOWTHAM", password: testPassword },
        { cookieAdapter: mockCookieAdapter, clientKey }
      );
      expect(result.success).toBe(true);

      // Rate limit status should be clean
      const status = checkRateLimit(clientKey);
      expect(status.allowed).toBe(true);
    });
  });

  describe("Cookie Security Configuration", () => {
    it("enforces httpOnly, sameSite lax, and root path", () => {
      const opts = getSessionCookieOptions();
      expect(opts.httpOnly).toBe(true);
      expect(opts.sameSite).toBe("lax");
      expect(opts.path).toBe("/");
      expect(opts.maxAge).toBe(60 * 60 * 24 * 7);
    });
  });
});
