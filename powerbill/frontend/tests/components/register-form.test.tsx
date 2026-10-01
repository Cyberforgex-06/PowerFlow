import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { RegisterForm } from "@/components/auth/register-form";

vi.mock("@/lib/api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api")>("@/lib/api");
  return { ...actual, apiRequest: vi.fn() };
});

describe("RegisterForm", () => {
  it("shows live strong-password hints", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    const password = screen.getByLabelText("Password");
    expect(screen.getByText(/WAIT · At least 10 characters/)).toBeInTheDocument();
    await user.type(password, "StrongPass123");
    expect(screen.getByText(/PASS · At least 10 characters/)).toBeInTheDocument();
    expect(screen.getByText(/PASS · One uppercase letter/)).toBeInTheDocument();
    expect(screen.getByText(/PASS · One lowercase letter/)).toBeInTheDocument();
    expect(screen.getByText(/PASS · One digit/)).toBeInTheDocument();
    expect(screen.getByText(/PASS · Maximum 72 bytes/)).toBeInTheDocument();
  });

  it("rejects invalid fields before calling the API", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    await user.type(screen.getByLabelText("Full name"), "A");
    await user.type(screen.getByLabelText("Email address"), "not-an-email");
    await user.type(screen.getByLabelText("Password"), "weak");
    const form = screen.getByRole("button", { name: /create account/i }).closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    expect(await screen.findByText("Enter your full name.")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText(/Use at least 10 characters/)).toBeInTheDocument();
  });

  it("uses UTF-8 bytes for the bcrypt 72-byte limit", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);
    await user.type(screen.getByLabelText("Password"), `A1a${"é".repeat(35)}`);
    expect(screen.getByText(/WAIT · Maximum 72 bytes/)).toBeInTheDocument();
  });
});
