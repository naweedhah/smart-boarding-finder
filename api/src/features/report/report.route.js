import express from "express";
import {
  createReport,
  createDevSeedReport,
  getAdminOverview,
  getReports,
  resolveReport,
  setReportedUserActiveState,
  warnUser,
} from "./report.controller.js";
import { verifyToken } from "../../shared/middleware/verifyToken.js";

const router = express.Router();

router.post("/", verifyToken, createReport);
router.post("/dev-seed", verifyToken, createDevSeedReport);
router.get("/admin/overview", verifyToken, getAdminOverview);
router.get("/", verifyToken, getReports);
router.post("/user-state", verifyToken, setReportedUserActiveState);
router.patch("/:id", verifyToken, resolveReport);
router.post("/warn", verifyToken, warnUser);

export default router;
