import { type RocketRange, MAX_CAPACITY, MIN_CAPACITY, ROCKET_RANGES } from "../types/rockets.type.js";

type FieldValidator = (value: unknown) => string | null;

function validateName(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return "name must be a non-empty string";
  return null;
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
  name: validateName,
  range: validateRange,
  capacity: validateCapacity,
};

export function validateCreate(body: Record<string, unknown>): string[] {
  return Object.entries(FIELD_VALIDATORS)
    .map(([field, validate]) => validate(body[field]))
    .filter((error): error is string => error !== null);
}

export function validateUpdate(body: Record<string, unknown>): string[] {
  return Object.entries(FIELD_VALIDATORS)
    .map(([field, validate]) => (field in body ? validate(body[field]) : null))
    .filter((error): error is string => error !== null);
}
