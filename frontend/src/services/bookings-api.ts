import type { ApiResult } from '../types/api.type'
import type { Booking, CreateBookingDto } from '../types/booking.type'
import { request } from './api-client'

/** JSON headers for write operations. */
const JSON_HEADERS = { 'Content-Type': 'application/json' }

/**
 * `POST /api/bookings` — book seats on a launch. The backend resolves-or-creates
 * the customer by email, bills via the mock gateway, and returns the paid
 * booking (with `totalPrice`, `paymentReference`, `paymentStatus`).
 */
export function createBooking(dto: CreateBookingDto): Promise<ApiResult<Booking>> {
  return request<Booking>('/bookings', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(dto),
  })
}
