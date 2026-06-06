import { Router } from "express";
import type { CreateRocketDto, RocketRange, UpdateRocketDto } from "./rockets.type.js";
import { MAX_CAPACITY, MIN_CAPACITY, ROCKET_RANGES } from "./rockets.type.js";
import * as repository from "./rockets.repository.js";

export const rocketsRouter = Router();

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

function validateCreate(body: Record<string, unknown>): string[] {
  return [
    validateName(body.name),
    validateRange(body.range),
    validateCapacity(body.capacity),
  ].filter((error): error is string => error !== null);
}

function validateUpdate(body: Record<string, unknown>): string[] {
  return [
    "name" in body ? validateName(body.name) : null,
    "range" in body ? validateRange(body.range) : null,
    "capacity" in body ? validateCapacity(body.capacity) : null,
  ].filter((error): error is string => error !== null);
}

rocketsRouter.get("/", (_req, res) => {
  res.json(repository.findAll());
});

rocketsRouter.get("/:id", (req, res) => {
  const rocket = repository.findById(req.params.id);
  if (!rocket) {
    res.status(404).json({ error: "Rocket not found" });
    return;
  }
  res.json(rocket);
});

rocketsRouter.post("/", (req, res) => {
  const errors = validateCreate(req.body);
  if (errors.length > 0) {
    res.status(400).json({ errors });
    return;
  }
  const dto: CreateRocketDto = {
    name: req.body.name,
    range: req.body.range,
    capacity: req.body.capacity,
  };
  const rocket = repository.create(dto);
  res.status(201).json(rocket);
});

rocketsRouter.put("/:id", (req, res) => {
  const errors = validateUpdate(req.body);
  if (errors.length > 0) {
    res.status(400).json({ errors });
    return;
  }
  const dto: UpdateRocketDto = {};
  if ("name" in req.body) dto.name = req.body.name;
  if ("range" in req.body) dto.range = req.body.range;
  if ("capacity" in req.body) dto.capacity = req.body.capacity;
  const rocket = repository.update(req.params.id, dto);
  if (!rocket) {
    res.status(404).json({ error: "Rocket not found" });
    return;
  }
  res.json(rocket);
});

rocketsRouter.delete("/:id", (req, res) => {
  const deleted = repository.remove(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: "Rocket not found" });
    return;
  }
  res.status(204).send();
});
