import type { RocketRange } from "./rockets.type.js";
import { MAX_CAPACITY, MIN_CAPACITY, ROCKET_RANGES } from "./rockets.type.js";

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

export function validateCreate(body: Record<string, unknown>): string[] {
  return [
    validateName(body.name),
    validateRange(body.range),
    validateCapacity(body.capacity),
  ].filter((error): error is string => error !== null);
}

export function validateUpdate(body: Record<string, unknown>): string[] {
  return [
    "name" in body ? validateName(body.name) : null,
    "range" in body ? validateRange(body.range) : null,
    "capacity" in body ? validateCapacity(body.capacity) : null,
  ].filter((error): error is string => error !== null);
}
