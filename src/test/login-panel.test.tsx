import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPanel from "@/components/auth/LoginPanel";
import * as authModule from "@/server/auth";

// Mock the server function for unit testing UI interactions
vi.mock("@/server/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof authModule>();
  return {
    ...actual,
    loginServerFn: vi.fn(),
  };
});

describe("LoginPanel Component", () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with an empty password input field and pre-identified Commander badge", () => {
    render(<LoginPanel onSuccess={mockOnSuccess} />);

    const passwordInput = screen.getByPlaceholderText("Enter access password") as HTMLInputElement;
    expect(passwordInput).toBeDefined();
    expect(passwordInput.value).toBe("");
    expect(passwordInput.type).toBe("password");

    expect(screen.getByText("COMMANDER GOWTHAM")).toBeDefined();
    expect(screen.getByText("Identity Verification")).toBeDefined();
  });

  it("toggles password visibility when the eye button is clicked", () => {
    render(<LoginPanel onSuccess={mockOnSuccess} />);

    const passwordInput = screen.getByPlaceholderText("Enter access password") as HTMLInputElement;
    const toggleButton = screen.getByTitle("Show password");

    expect(passwordInput.type).toBe("password");

    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe("text");

    fireEvent.click(screen.getByTitle("Hide password"));
    expect(passwordInput.type).toBe("password");
  });

  it("displays client-side validation error when password is empty", async () => {
    render(<LoginPanel onSuccess={mockOnSuccess} />);

    const submitButton = screen.getByRole("button", { name: /secure login/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Password is required for identity verification.")).toBeDefined();
    });

    expect(authModule.loginServerFn).not.toHaveBeenCalled();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("calls loginServerFn with identity and password on submit and triggers onSuccess on success", async () => {
    const mockLoginServerFn = vi.mocked(authModule.loginServerFn);
    mockLoginServerFn.mockResolvedValueOnce({
      success: true,
      user: {
        id: "GOWTHAM",
        name: "Commander Gowtham",
        role: "commander",
      },
    });

    render(<LoginPanel onSuccess={mockOnSuccess} />);

    const passwordInput = screen.getByPlaceholderText("Enter access password");
    fireEvent.change(passwordInput, { target: { value: "CommanderPassword2026!" } });

    const submitButton = screen.getByRole("button", { name: /secure login/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLoginServerFn).toHaveBeenCalledWith({
        data: {
          identity: "COMMANDER_GOWTHAM",
          password: "CommanderPassword2026!",
        },
      });
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("displays server error message when loginServerFn rejects authentication", async () => {
    const mockLoginServerFn = vi.mocked(authModule.loginServerFn);
    mockLoginServerFn.mockResolvedValueOnce({
      success: false,
      error: "Invalid identity or access password.",
      code: "INVALID_CREDENTIALS",
    });

    render(<LoginPanel onSuccess={mockOnSuccess} />);

    const passwordInput = screen.getByPlaceholderText("Enter access password");
    fireEvent.change(passwordInput, { target: { value: "WrongPasscode" } });

    const submitButton = screen.getByRole("button", { name: /secure login/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLoginServerFn).toHaveBeenCalled();
      expect(screen.getByText("Invalid identity or access password.")).toBeDefined();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });
});

