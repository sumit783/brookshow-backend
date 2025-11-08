import express from "express";
import { createOfflineBooking, getAllBookings, getBookingById } from "../controllers/bookingController.js";
import { checkApiKey } from "../middlewares/apiKeyMiddleware.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/offline", checkApiKey, verifyToken, createOfflineBooking);
router.get("/", checkApiKey, verifyToken, getAllBookings);
router.get("/:id", checkApiKey, verifyToken, getBookingById);

export default router;
