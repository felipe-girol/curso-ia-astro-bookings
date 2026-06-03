import { Router } from "express";
import { rocketsRouter } from "../rockets/rockets.router.js";

export const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

router.use("/rockets", rocketsRouter);
