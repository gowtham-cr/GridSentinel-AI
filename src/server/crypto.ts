/**
 * DeceptAI Sentinel — Server Cryptographic Utilities
 *
 * Server-only cryptographic module for:
 * 1. Password hashing & salting using Node.js scrypt.
 * 2. Timing-safe password verification.
 * 3. HMAC-SHA256 signed session token creation and verification with expiration.
 *
 * SECURITY NOTICE:
 * This module runs exclusively on the Node.js server runtime.
 * NEVER import this file into client components or browser bundles.
 */

import { scrypt, randomBytes, timingSafeEqual, createHmac, type ScryptOptions } from "node:crypto";

/**
 * Standard scrypt derivation parameters:
 * N = 16384 (CPU/memory cost parameter)
 * r = 8 (block size parameter)
 * p = 1 (parallelization parameter)
 * maxmem = 64MB memory limit
 */
const SCRYPT_PARAMS: ScryptOptions = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};

const DERIVED_KEY_LENGTH = 64; // 64 bytes = 512 bits
const SALT_BYTE_LENGTH = 16; // 16 bytes = 128 bits of entropy

export interface SessionUser {
  id: string;
  name: string;
  role: string;
}

export interface SessionPayload {
  user: SessionUser;
  createdAt: number;
  expiresAt: number;
}

/**
 * Internal async wrapper around Node.js scrypt using standard callback API.
 */
function deriveKey(password: string, salt: string, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, SCRYPT_PARAMS, (err, derivedKey) => {
      if (err) {
        reject(err);
      } else {
        resolve(derivedKey);
      }
    });
  });
}

/**
 * Hashes a plaintext password using Node.js scrypt with a cryptographically secure random salt.
 *
 * @param password Plaintext password to hash
 * @returns Promise resolving to formatted string: `<saltHex>:<derivedKeyHex>`
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || typeof password !== "string" || password.trim().length === 0) {
    throw new Error("Password must be a non-empty string");
  }

  // Generate 16 bytes of cryptographically secure random salt
  const salt = randomBytes(SALT_BYTE_LENGTH).toString("hex");

  // Derive the key using scrypt
  const derivedKey = await deriveKey(password, salt, DERIVED_KEY_LENGTH);

  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verifies a candidate password against a stored scrypt hash using timingSafeEqual
 * to eliminate timing side-channel attacks.
 *
 * @param password Candidate password provided by user
 * @param storedHash Stored hash string in `<saltHex>:<derivedKeyHex>` format
 * @returns Promise resolving to true if password matches, false otherwise
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  if (
    !password ||
    !storedHash ||
    typeof password !== "string" ||
    typeof storedHash !== "string"
  ) {
    return false;
  }

  try {
    const parts = storedHash.split(":");
    let salt = "";
    let expectedKeyHex = "";

    if (parts.length === 2 && parts[0] && parts[1]) {
      salt = parts[0];
      expectedKeyHex = parts[1];
    } else if (
      parts.length === 4 &&
      parts[0] === "scrypt" &&
      parts[1] === "v1" &&
      parts[2] &&
      parts[3]
    ) {
      // Supports prefixed format "scrypt:v1:<salt>:<hash>" if used
      salt = parts[2];
      expectedKeyHex = parts[3];
    } else {
      return false;
    }

    if (!salt || !expectedKeyHex) {
      return false;
    }

    const expectedKeyBuffer = Buffer.from(expectedKeyHex, "hex");
    if (expectedKeyBuffer.length === 0) {
      return false;
    }

    // Derive candidate key with identical salt and key length
    const candidateKeyBuffer = await deriveKey(
      password,
      salt,
      expectedKeyBuffer.length
    );

    // Both buffers must have identical length for timingSafeEqual
    if (expectedKeyBuffer.length !== candidateKeyBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedKeyBuffer, candidateKeyBuffer);
  } catch {
    // Fail safely on any format or processing exception
    return false;
  }
}

/**
 * Creates an HMAC-SHA256 signed session token containing user details and expiration timestamp.
 *
 * @param user Authenticated user information
 * @param secret Server session secret (minimum 16 characters)
 * @param expiresInSeconds Lifetime of the token in seconds (defaults to 7 days)
 * @returns URL-safe token in format: `<base64urlPayload>.<base64urlSignature>`
 */
export function createSessionToken(
  user: SessionUser,
  secret: string,
  expiresInSeconds: number = 60 * 60 * 24 * 7
): string {
  if (!secret || typeof secret !== "string" || secret.trim().length < 16) {
    throw new Error(
      "Session secret must be a secure string with at least 16 characters"
    );
  }

  if (!user || !user.id || !user.name || !user.role) {
    throw new Error("Invalid session user data: id, name, and role are required");
  }

  const now = Date.now();
  const payload: SessionPayload = {
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
    },
    createdAt: now,
    expiresAt: now + expiresInSeconds * 1000,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );

  const signature = createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies an HMAC-SHA256 signed session token, validates expiration, and returns the SessionUser.
 * Uses timingSafeEqual for signature verification to protect against timing attacks.
 *
 * @param token Signed token string
 * @param secret Server session secret
 * @returns SessionUser if valid and not expired, null otherwise
 */
export function verifySessionToken(
  token: string,
  secret: string
): SessionUser | null {
  if (
    !token ||
    !secret ||
    typeof token !== "string" ||
    typeof secret !== "string"
  ) {
    return null;
  }

  try {
    const dotIndex = token.indexOf(".");
    if (dotIndex === -1) {
      return null;
    }

    const encodedPayload = token.slice(0, dotIndex);
    const signature = token.slice(dotIndex + 1);

    if (!encodedPayload || !signature || signature.includes(".")) {
      return null;
    }

    // Compute expected HMAC signature
    const expectedSignature = createHmac("sha256", secret)
      .update(encodedPayload)
      .digest("base64url");

    const sigBuffer = Buffer.from(signature, "utf8");
    const expectedSigBuffer = Buffer.from(expectedSignature, "utf8");

    if (sigBuffer.length !== expectedSigBuffer.length) {
      return null;
    }

    // Constant-time comparison
    if (!timingSafeEqual(sigBuffer, expectedSigBuffer)) {
      return null;
    }

    // Decode and parse payload
    const rawJson = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const payload = JSON.parse(rawJson) as SessionPayload;

    if (
      !payload ||
      !payload.user ||
      !payload.user.id ||
      typeof payload.expiresAt !== "number"
    ) {
      return null;
    }

    // Check expiration timestamp
    if (Date.now() > payload.expiresAt) {
      return null;
    }

    return payload.user;
  } catch {
    return null;
  }
}

/**
 * Generates a cryptographically secure random hexadecimal string.
 *
 * @param byteLength Number of random bytes to generate (default: 32)
 */
export function generateRandomSecret(byteLength: number = 32): string {
  return randomBytes(byteLength).toString("hex");
}
