import { type Booking, type CreateBookingDto } from "../types/bookings.type.js";
import type { Launch } from "../types/launches.type.js";
import * as customersRepository from "../customers/customers.repository.js";
import * as launchesRepository from "../launches/launches.repository.js";
import { logInfo } from "../utils/logger.js";
import { charge } from "../utils/payment-gateway.js";
import * as repository from "./bookings.repository.js";

const CONTEXT = "Bookings";

export type CreateBookingResult =
  | { status: "ok"; booking: Booking }
  | { status: "not-found"; message: string }
  | { status: "conflict"; message: string }
  | { status: "payment-failed"; message: string };

/**
 * Derived seat availability (single source of truth): the launch's seatsOffered
 * minus the sum of seats across that launch's existing bookings.
 */
export function getRemainingSeats(launch: Launch): number {
  const booked = repository
    .findByLaunch(launch.id)
    .reduce((total, booking) => total + booking.seats, 0);
  return launch.seatsOffered - booked;
}

/**
 * Resolve the customer by email (natural key) or create one on the fly with the
 * supplied name/phone. Keeps customer identity server-side per ADR 5.
 */
function resolveOrCreateCustomer(dto: CreateBookingDto): string {
  const existing = customersRepository.findByEmail(dto.customerEmail);
  if (existing) return existing.id;
  const created = customersRepository.create({
    email: dto.customerEmail,
    name: dto.name,
    phone: dto.phone,
  });
  logInfo(CONTEXT, `Created customer ${created.id} for booking`);
  return created.id;
}

export function createBooking(dto: CreateBookingDto): CreateBookingResult {
  const launch = launchesRepository.findById(dto.launchId);
  if (!launch) return { status: "not-found", message: "Launch not found" };

  const remaining = getRemainingSeats(launch);
  if (dto.seats > remaining) {
    return {
      status: "conflict",
      message: `Insufficient availability: ${remaining} seat(s) remaining`,
    };
  }

  const totalPrice = dto.seats * launch.pricePerSeat;
  const payment = charge(totalPrice);
  if (payment.outcome === "failed") {
    return { status: "payment-failed", message: payment.reason };
  }

  const customerId = resolveOrCreateCustomer(dto);
  const booking = repository.create({
    launchId: dto.launchId,
    customerId,
    seats: dto.seats,
    totalPrice,
    paymentStatus: "paid",
    paymentReference: payment.reference,
    createdAt: new Date().toISOString(),
  });
  logInfo(CONTEXT, `Created booking ${booking.id} for launch ${booking.launchId}`);
  return { status: "ok", booking };
}
