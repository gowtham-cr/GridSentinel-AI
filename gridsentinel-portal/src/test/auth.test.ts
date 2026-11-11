import { describe, expect, it, beforeEach } from "vitest";
import { authStore, DEMO_CREDENTIALS } from "@/features/auth/authStore";

describe("Demo Auth Engine & Session Store", () => {
  beforeEach(() => {
    authStore.clearSession();
  });

  it("fails when operator ID is empty", async () => {
    const res = await authStore.authenticateDemo({
      usernameOrEmail: "",
      password: "somepassword",
      rememberMe: false,
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("Operator ID or email is required");
    expect(authStore.getSnapshot()).toBeNull();
  });

  it("fails when passcode is shorter than 6 characters", async () => {
    const res = await authStore.authenticateDemo({
      usernameOrEmail: "gowtham@gridsentinel.ai",
      password: "123",
      rememberMe: false,
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("at least 6 characters");
    expect(authStore.getSnapshot()).toBeNull();
  });

  it("fails when credentials are completely invalid", async () => {
    const res = await authStore.authenticateDemo({
      usernameOrEmail: "unknown_intruder@darknet.org",
      password: "unauthorized_pass",
      rememberMe: false,
    });

    expect(res.success).toBe(false);
    expect(res.error).toContain("ACCESS DENIED");
    expect(authStore.getSnapshot()).toBeNull();
  });

  it("authenticates Commander Gowtham with demo credentials", async () => {
    const res = await authStore.authenticateDemo({
      usernameOrEmail: DEMO_CREDENTIALS.username,
      password: DEMO_CREDENTIALS.defaultPassword,
      rememberMe: true,
    });

    expect(res.success).toBe(true);
    expect(res.session).toBeDefined();
    expect(res.session?.operatorName).toBe(DEMO_CREDENTIALS.operatorName);
    expect(res.session?.role).toBe(DEMO_CREDENTIALS.role);
    expect(res.session?.clearanceLevel).toBe(DEMO_CREDENTIALS.clearanceLevel);

    const snapshot = authStore.getSnapshot();
    expect(snapshot?.operatorId).toBe("GS-OP-7749");
    expect(snapshot?.token).toContain("GS-DEMO-JWT-");
  });

  it("clears session properly upon logout", async () => {
    await authStore.authenticateDemo({
      usernameOrEmail: DEMO_CREDENTIALS.username,
      password: DEMO_CREDENTIALS.defaultPassword,
      rememberMe: false,
    });

    expect(authStore.getSnapshot()).not.toBeNull();

    authStore.clearSession();
    expect(authStore.getSnapshot()).toBeNull();
  });
});

