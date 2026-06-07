import { Router } from "express";
import type { CreateRocketDto, UpdateRocketDto } from "./rockets.type.js";
import * as repository from "./rockets.repository.js";
import { validateCreate, validateUpdate } from "./rockets.validation.js";

export const rocketsRouter = Router();

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
