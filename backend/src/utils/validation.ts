import { type RocketRange, MAX_CAPACITY, MIN_CAPACITY, ROCKET_RANGES } from "../types/rockets.type.js";

export type FieldValidator = (value: unknown) => string | null;

/** Builds a validator that requires a trimmed, non-empty string. */
export function nonEmptyString(field: string): FieldValidator {
  return (value: unknown): string | null =>
    typeof value === "string" && value.trim() !== "" ? null : `${field} must be a non-empty string`;
}

/**
 * Runs a set of field validators against a body and collects the error messages.
 * When `partial` is true, fields absent from the body are skipped (used for updates).
 */
export function collectErrors(
  validators: Record<string, FieldValidator>,
  body: Record<string, unknown>,
  { partial = false }: { partial?: boolean } = {},
): string[] {
  return Object.entries(validators)
    .map(([field, validate]) => (partial && !(field in body) ? null : validate(body[field])))
    .filter((error): error is string => error !== null);
}

function validateRange(value: unknown): string | null {
  if (!ROCKET_RANGES.includes(value as RocketRange)) return `range must be one of: ${ROCKET_RANGES.join(", ")}`;
  return null;
}

function validateCapacity(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < MIN_CAPACITY || value > MAX_CAPACITY) {
    return `capacity must be an integer between ${MIN_CAPACITY} and ${MAX_CAPACITY}`;
  }
  return null;
}

const FIELD_VALIDATORS: Record<string, FieldValidator> = {
  name: nonEmptyString("name"),
  range: validateRange,
  capacity: validateCapacity,
};

export function validateCreate(body: Record<string, unknown>): string[] {
  return collectErrors(FIELD_VALIDATORS, body);
}

export function validateUpdate(body: Record<string, unknown>): string[] {
  return collectErrors(FIELD_VALIDATORS, body, { partial: true });
}
