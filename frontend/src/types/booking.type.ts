/**
 * Frontend mirror of the backend booking DTOs (`backend/src/types/bookings.type.ts`).
 * The API stays the single source of truth for billing and availability; these
 * types only shape the booking request and its confirmation response.
 */

export type PaymentStatus = 'pending' | 'paid' | 'failed'

export type Booking = {
  id: string
  launchId: string
  customerId: string
  seats: number
  totalPrice: number
  paymentStatus: PaymentStatus
  paymentReference: string
  createdAt: string
}

/**
 * Payload for `POST /api/bookings`. The customer is identified by email and
 * resolved-or-created server-side (ADR 5); `name`/`phone` are only used when a
 * new customer must be created.
 */
export type CreateBookingDto = {
  launchId: string
  customerEmail: string
  name: string
  phone: string
  seats: number
}
