import express from "express";
import { getAllCalendarBlocks, createCalendarBlock, deleteCalendarBlock } from "../controllers/calendarBlockController.js";
import { checkApiKey } from "../middlewares/apiKeyMiddleware.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", checkApiKey, verifyToken, getAllCalendarBlocks);
router.post("/", checkApiKey, verifyToken, createCalendarBlock);
router.delete("/:id", checkApiKey, verifyToken, deleteCalendarBlock);

export default router;

