/** Raw, possibly-invalid values straight from the booking form inputs. */
export type BookingFormInput = {
  customerEmail: string
  name: string
  phone: string
  seats: number | null
}

/** Per-field validation messages; absent keys mean the field is valid. */
export type BookingFormErrors = Partial<Record<keyof BookingFormInput, string>>

/**
 * Pure mirror of the backend booking rules (FR8) for fast inline feedback. The
 * server stays authoritative for availability and billing; this only blocks
 * obviously invalid submits. `seatsAvailable` (from the launch read, FR12)
 * bounds the seat count.
 */
export function validateBookingForm(
  input: BookingFormInput,
  seatsAvailable: number,
): BookingFormErrors {
  const errors: BookingFormErrors = {}

  if (input.customerEmail.trim().length === 0) {
    errors.customerEmail = 'Email is required.'
  }

  if (input.name.trim().length === 0) {
    errors.name = 'Name is required.'
  }

  if (input.phone.trim().length === 0) {
    errors.phone = 'Phone is required.'
  }

  const { seats } = input
  if (seats === null || Number.isNaN(seats)) {
    errors.seats = 'Number of seats is required.'
  } else if (!Number.isInteger(seats) || seats < 1) {
    errors.seats = 'Seats must be a whole number of at least 1.'
  } else if (seats > seatsAvailable) {
    errors.seats = `Only ${seatsAvailable} seat(s) remaining.`
  }

  return errors
}

/** Convenience guard: true when no field errors are present. */
export function isBookingFormValid(errors: BookingFormErrors): boolean {
  return Object.keys(errors).length === 0
}
