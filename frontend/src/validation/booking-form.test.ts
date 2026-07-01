import { describe, expect, it } from 'vitest'
import { isBookingFormValid, validateBookingForm } from './booking-form'

const validInput = {
  customerEmail: 'ada@astro.test',
  name: 'Ada Lovelace',
  phone: '+1-555-0100',
  seats: 2,
}

const SEATS_AVAILABLE = 5

describe('validateBookingForm', () => {
  it('returns no errors for valid input', () => {
    const errors = validateBookingForm(validInput, SEATS_AVAILABLE)
    expect(errors).toEqual({})
    expect(isBookingFormValid(errors)).toBe(true)
  })

  it('flags an empty email', () => {
    expect(validateBookingForm({ ...validInput, customerEmail: '  ' }, SEATS_AVAILABLE).customerEmail).toBeDefined()
  })

  it('flags an empty name', () => {
    expect(validateBookingForm({ ...validInput, name: '' }, SEATS_AVAILABLE).name).toBeDefined()
  })

  it('flags an empty phone', () => {
    expect(validateBookingForm({ ...validInput, phone: '   ' }, SEATS_AVAILABLE).phone).toBeDefined()
  })

  it('flags a missing seat count', () => {
    expect(validateBookingForm({ ...validInput, seats: null }, SEATS_AVAILABLE).seats).toBeDefined()
  })

  it('flags a non-integer seat count', () => {
    expect(validateBookingForm({ ...validInput, seats: 1.5 }, SEATS_AVAILABLE).seats).toBeDefined()
  })

  it('flags seats below one', () => {
    expect(validateBookingForm({ ...validInput, seats: 0 }, SEATS_AVAILABLE).seats).toBeDefined()
  })

  it('flags seats above remaining availability', () => {
    const errors = validateBookingForm({ ...validInput, seats: 6 }, SEATS_AVAILABLE)
    expect(errors.seats).toBeDefined()
    expect(isBookingFormValid(errors)).toBe(false)
  })

  it('accepts seats equal to remaining availability', () => {
    expect(validateBookingForm({ ...validInput, seats: 5 }, SEATS_AVAILABLE).seats).toBeUndefined()
  })

  it('reports multiple field errors at once', () => {
    const errors = validateBookingForm(
      { customerEmail: '', name: '', phone: '', seats: null },
      SEATS_AVAILABLE,
    )
    expect(errors.customerEmail).toBeDefined()
    expect(errors.name).toBeDefined()
    expect(errors.phone).toBeDefined()
    expect(errors.seats).toBeDefined()
  })
})
