import { describe, expect, it } from "vitest";
import { validateCreateBooking } from "./bookings.validation.js";

const VALID_BODY = {
  launchId: "launch-1",
  customerEmail: "ada@astro.test",
  name: "Ada",
  phone: "+100000000",
  seats: 2,
};

describe("bookings.validation create", () => {
  it("returns no errors for a valid body", () => {
    expect(validateCreateBooking(VALID_BODY)).toEqual([]);
  });

  it("rejects a missing launchId", () => {
    expect(validateCreateBooking({ ...VALID_BODY, launchId: undefined })).toContain(
      "launchId must be a non-empty string",
    );
  });

  it("rejects an empty launchId", () => {
    expect(validateCreateBooking({ ...VALID_BODY, launchId: "  " })).toContain("launchId must be a non-empty string");
  });

  it("rejects a missing customerEmail", () => {
    expect(validateCreateBooking({ ...VALID_BODY, customerEmail: undefined })).toContain(
      "customerEmail must be a non-empty string",
    );
  });

  it("rejects an empty customerEmail", () => {
    expect(validateCreateBooking({ ...VALID_BODY, customerEmail: "" })).toContain(
      "customerEmail must be a non-empty string",
    );
  });

  it("rejects a missing name", () => {
    expect(validateCreateBooking({ ...VALID_BODY, name: undefined })).toContain("name must be a non-empty string");
  });

  it("rejects a missing phone", () => {
    expect(validateCreateBooking({ ...VALID_BODY, phone: undefined })).toContain("phone must be a non-empty string");
  });

  it("rejects a non-integer seats", () => {
    expect(validateCreateBooking({ ...VALID_BODY, seats: 1.5 })).toContain("seats must be an integer >= 1");
  });

  it("rejects seats below one", () => {
    expect(validateCreateBooking({ ...VALID_BODY, seats: 0 })).toContain("seats must be an integer >= 1");
  });

  it("collects all errors for an empty body", () => {
    expect(validateCreateBooking({}).length).toBe(5);
  });
});
