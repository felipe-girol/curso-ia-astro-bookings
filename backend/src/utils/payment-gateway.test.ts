import { describe, expect, it } from "vitest";
import { charge } from "./payment-gateway.js";

describe("payment-gateway charge", () => {
  it("returns a paid outcome with a reference for a positive amount", () => {
    const result = charge(1500);

    expect(result.outcome).toBe("paid");
    if (result.outcome === "paid") {
      expect(result.reference).toBeTypeOf("string");
      expect(result.reference.length).toBeGreaterThan(0);
    }
  });

  it("returns distinct references on each successful charge", () => {
    const first = charge(100);
    const second = charge(100);

    if (first.outcome === "paid" && second.outcome === "paid") {
      expect(first.reference).not.toBe(second.reference);
    }
  });

  it("returns a failed outcome with a reason for a zero amount", () => {
    const result = charge(0);

    expect(result.outcome).toBe("failed");
    if (result.outcome === "failed") {
      expect(result.reason).toBeTypeOf("string");
    }
  });

  it("returns a failed outcome for a negative amount", () => {
    const result = charge(-50);

    expect(result.outcome).toBe("failed");
  });
});
