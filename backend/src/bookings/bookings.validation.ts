import { type FieldValidator, collectErrors, nonEmptyString, positiveInteger } from "../utils/validation.js";

const FIELD_VALIDATORS: Record<string, FieldValidator> = {
  launchId: nonEmptyString("launchId"),
  customerEmail: nonEmptyString("customerEmail"),
  name: nonEmptyString("name"),
  phone: nonEmptyString("phone"),
  seats: positiveInteger("seats"),
};

export function validateCreateBooking(body: Record<string, unknown>): string[] {
  return collectErrors(FIELD_VALIDATORS, body);
}
