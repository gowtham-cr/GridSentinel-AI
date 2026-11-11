import { describe, expect, it } from "vitest";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  generateRandomSecret,
  type SessionUser,
} from "../server/crypto";

describe("Server Cryptographic Utilities", () => {
  const testUser: SessionUser = {
    id: "GOWTHAM",
    name: "Commander Gowtham",
    role: "commander",
  };
  const testSecret = "super-secret-key-with-sufficient-entropy-123456789";

  describe("Password Hashing & Verification (scrypt)", () => {
    it("successfully hashes a password and verifies it", async () => {
      const password = "QuantumSecurePassword2026!";
      const hash = await hashPassword(password);

      expect(hash).toContain(":");
      const [salt, derivedKey] = hash.split(":");
      expect(salt).toHaveLength(32); // 16 bytes hex
      expect(derivedKey).toHaveLength(128); // 64 bytes hex

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it("rejects an incorrect password", async () => {
      const password = "CorrectPassword123";
      const wrongPassword = "WrongPassword123";
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it("generates different salts for identical passwords", async () => {
      const password = "SamePasswordTwice!";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);

      const [salt1] = hash1.split(":");
      const [salt2] = hash2.split(":");
      expect(salt1).not.toBe(salt2);

      expect(await verifyPassword(password, hash1)).toBe(true);
      expect(await verifyPassword(password, hash2)).toBe(true);
    });

    it("safely handles empty, invalid, or malformed hashes without throwing", async () => {
      expect(await verifyPassword("password", "")).toBe(false);
      expect(await verifyPassword("password", "invalid_format")).toBe(false);
      expect(await verifyPassword("password", "malformed:nothex!@#")).toBe(false);
      expect(await verifyPassword("", "abc:def")).toBe(false);
    });

    it("throws when hashing an empty password", async () => {
      await expect(hashPassword("")).rejects.toThrow("Password must be a non-empty string");
      await expect(hashPassword("   ")).rejects.toThrow("Password must be a non-empty string");
    });
  });

  describe("Session Token Signing & Verification (HMAC-SHA256)", () => {
    it("creates a signed token and successfully verifies it", () => {
      const token = createSessionToken(testUser, testSecret, 3600);
      expect(token).toContain(".");

      const verifiedUser = verifySessionToken(token, testSecret);
      expect(verifiedUser).toEqual(testUser);
    });

    it("rejects a token signed with a different secret", () => {
      const token = createSessionToken(testUser, testSecret, 3600);
      const wrongSecret = "different-secret-key-1234567890abcdef";

      const verifiedUser = verifySessionToken(token, wrongSecret);
      expect(verifiedUser).toBeNull();
    });

    it("rejects a tampered token payload or signature", () => {
      const token = createSessionToken(testUser, testSecret, 3600);
      const parts = token.split(".");
      const payload = parts[0];
      const signature = parts[1];

      expect(payload).toBeDefined();
      expect(signature).toBeDefined();
      if (!payload || !signature) return;

      // Tamper with payload
      const tamperedPayload = Buffer.from(
        JSON.stringify({
          user: { ...testUser, role: "superadmin" },
          createdAt: Date.now(),
          expiresAt: Date.now() + 100000,
        })
      ).toString("base64url");

      const tamperedToken = `${tamperedPayload}.${signature}`;
      expect(verifySessionToken(tamperedToken, testSecret)).toBeNull();

      // Tamper with signature
      const badSigToken = `${payload}.${signature.slice(0, -2)}xx`;
      expect(verifySessionToken(badSigToken, testSecret)).toBeNull();
    });

    it("rejects an expired token", () => {
      // Set expiration to negative seconds (already expired)
      const token = createSessionToken(testUser, testSecret, -10);
      const verifiedUser = verifySessionToken(token, testSecret);
      expect(verifiedUser).toBeNull();
    });

    it("throws when creating token with insecure secret", () => {
      expect(() => createSessionToken(testUser, "too-short")).toThrow(
        "Session secret must be a secure string with at least 16 characters"
      );
    });

    it("generates random secrets of requested byte length", () => {
      const secret = generateRandomSecret(32);
      expect(secret).toHaveLength(64); // 32 bytes hex = 64 chars
    });
  });
});
