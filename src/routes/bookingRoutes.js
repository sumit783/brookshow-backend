import express from "express";
import { createOfflineBooking, getAllBookings } from "../controllers/bookingController.js";
import { checkApiKey } from "../middlewares/apiKeyMiddleware.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/offline", checkApiKey, verifyToken, createOfflineBooking);
router.get("/", checkApiKey, verifyToken, getAllBookings);

export default router;
