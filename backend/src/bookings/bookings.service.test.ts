import { describe, expect, it, vi } from "vitest";
import * as customersRepository from "../customers/customers.repository.js";
import * as launchesRepository from "../launches/launches.repository.js";
import type { Launch } from "../types/launches.type.js";
import type { CreateBookingDto } from "../types/bookings.type.js";
import { charge } from "../utils/payment-gateway.js";
import * as bookingsRepository from "./bookings.repository.js";
import { createBooking, getRemainingSeats } from "./bookings.service.js";

// Wrap the real gateway so individual tests can override the outcome via mockReturnValueOnce.
vi.mock("../utils/payment-gateway.js", async (importActual) => {
  const actual = await importActual<typeof import("../utils/payment-gateway.js")>();
  return { charge: vi.fn(actual.charge) };
});

let emailSeq = 0;

function seedLaunch(seatsOffered = 10, pricePerSeat = 1000): Launch {
  return launchesRepository.create({
    rocketId: "rocket-1",
    mission: "Lunar Gateway",
    date: "2999-01-01T00:00:00.000Z",
    pricePerSeat,
    minPassengers: 1,
    seatsOffered,
  });
}

/** A unique customer email so each test starts from an unknown identity. */
function uniqueEmail(): string {
  emailSeq += 1;
  return `customer-${emailSeq}-${Date.now()}@astro.test`;
}

/** Booking payload with sensible customer defaults; override per test. */
function bookingDto(overrides: Partial<CreateBookingDto> = {}): CreateBookingDto {
  return {
    launchId: "launch-1",
    customerEmail: uniqueEmail(),
    name: "Ada",
    phone: "+100000000",
    seats: 1,
    ...overrides,
  };
}

describe("bookings.service createBooking", () => {
  it("creates a booking with paid status, totalPrice and a payment reference", () => {
    const launch = seedLaunch(10, 1500);

    const result = createBooking(bookingDto({ launchId: launch.id, seats: 3 }));

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.booking.id).toBeTypeOf("string");
      expect(result.booking.customerId).toBeTypeOf("string");
      expect(result.booking.totalPrice).toBe(4500);
      expect(result.booking.paymentStatus).toBe("paid");
      expect(result.booking.paymentReference).toBeTypeOf("string");
      expect(result.booking.paymentReference.length).toBeGreaterThan(0);
      expect(result.booking.createdAt).toBeTypeOf("string");
    }
  });

  it("creates a new customer when the email is unknown", () => {
    const launch = seedLaunch();
    const customerEmail = uniqueEmail();
    expect(customersRepository.findByEmail(customerEmail)).toBeUndefined();

    const result = createBooking(bookingDto({ launchId: launch.id, customerEmail }));

    expect(result.status).toBe("ok");
    const customer = customersRepository.findByEmail(customerEmail);
    expect(customer).toBeDefined();
    if (result.status === "ok" && customer) {
      expect(result.booking.customerId).toBe(customer.id);
      expect(customer.name).toBe("Ada");
      expect(customer.phone).toBe("+100000000");
    }
  });

  it("reuses the existing customer when the email already matches", () => {
    const launch = seedLaunch();
    const existing = customersRepository.create({
      email: uniqueEmail(),
      name: "Grace",
      phone: "+199999999",
    });
    const before = customersRepository.findAll().length;

    const result = createBooking(bookingDto({ launchId: launch.id, customerEmail: existing.email }));

    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.booking.customerId).toBe(existing.id);
    // No duplicate customer is created for a known email.
    expect(customersRepository.findAll().length).toBe(before);
  });

  it("returns not-found for an unknown launch", () => {
    const result = createBooking(bookingDto({ launchId: "missing-launch" }));

    expect(result.status).toBe("not-found");
    if (result.status === "not-found") expect(result.message).toBe("Launch not found");
  });

  it("returns conflict when seats exceed remaining availability", () => {
    const launch = seedLaunch(4);

    const result = createBooking(bookingDto({ launchId: launch.id, seats: 5 }));

    expect(result.status).toBe("conflict");
  });

  it("accounts for existing bookings when computing availability", () => {
    const launch = seedLaunch(5);
    createBooking(bookingDto({ launchId: launch.id, seats: 3 }));

    const result = createBooking(bookingDto({ launchId: launch.id, seats: 3 }));

    expect(result.status).toBe("conflict");
  });

  it("does not attempt the charge when the launch does not exist", () => {
    vi.mocked(charge).mockClear();

    const result = createBooking(bookingDto({ launchId: "missing-launch" }));

    expect(result.status).toBe("not-found");
    expect(charge).not.toHaveBeenCalled();
  });

  it("does not attempt the charge when seats exceed availability", () => {
    const launch = seedLaunch(2);
    vi.mocked(charge).mockClear();

    const result = createBooking(bookingDto({ launchId: launch.id, seats: 5 }));

    expect(result.status).toBe("conflict");
    expect(charge).not.toHaveBeenCalled();
  });

  it("charges the launch price multiplied by seats only after checks pass", () => {
    const launch = seedLaunch(10, 1200);
    vi.mocked(charge).mockClear();

    createBooking(bookingDto({ launchId: launch.id, seats: 4 }));

    expect(charge).toHaveBeenCalledWith(4800);
  });

  it("does not persist the booking nor create the customer when the gateway declines", () => {
    const launch = seedLaunch(10, 1000);
    const customerEmail = uniqueEmail();
    vi.mocked(charge).mockReturnValueOnce({ outcome: "failed", reason: "card declined" });

    const result = createBooking(bookingDto({ launchId: launch.id, customerEmail, seats: 2 }));

    expect(result.status).toBe("payment-failed");
    if (result.status === "payment-failed") expect(result.message).toBe("card declined");
    expect(bookingsRepository.findByLaunch(launch.id)).toHaveLength(0);
    expect(customersRepository.findByEmail(customerEmail)).toBeUndefined();
  });
});

describe("bookings.service getRemainingSeats", () => {
  it("derives remaining seats from existing bookings", () => {
    const launch = seedLaunch(8);
    createBooking(bookingDto({ launchId: launch.id, seats: 2 }));

    expect(getRemainingSeats(launch)).toBe(6);
  });
});
