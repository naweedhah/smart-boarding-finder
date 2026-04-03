import express from "express";
import { createReport, warnUser } from "./report.controller.js";

const router = express.Router();

router.post("/", createReport);
router.post("/warn", warnUser);

export default router;