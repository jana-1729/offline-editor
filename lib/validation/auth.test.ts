import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "./auth";

describe("registerSchema", () => {
  it("accepts valid input and normalizes email", () => {
    const r = registerSchema.safeParse({
      name: "Jane",
      email: "JANE@Example.com ",
      password: "supersecret",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("jane@example.com");
  });

  it("rejects short passwords", () => {
    const r = registerSchema.safeParse({
      name: "Jane",
      email: "jane@example.com",
      password: "short",
    });
    expect(r.success).toBe(false);
  });

  it("rejects invalid emails", () => {
    const r = registerSchema.safeParse({
      name: "Jane",
      email: "not-an-email",
      password: "supersecret",
    });
    expect(r.success).toBe(false);
  });

  it("rejects empty name", () => {
    const r = registerSchema.safeParse({
      name: "  ",
      email: "jane@example.com",
      password: "supersecret",
    });
    expect(r.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires a non-empty password", () => {
    expect(
      loginSchema.safeParse({ email: "a@b.com", password: "" }).success,
    ).toBe(false);
  });
});
