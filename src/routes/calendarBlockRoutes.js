import express from "express";
import { getAllCalendarBlocks } from "../controllers/calendarBlockController.js";
import { checkApiKey } from "../middlewares/apiKeyMiddleware.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", checkApiKey, verifyToken, getAllCalendarBlocks);

export default router;

