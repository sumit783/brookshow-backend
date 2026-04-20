import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  createArtistProfile,
  updateArtistProfile,
  getArtistProfile,
  deleteArtistProfile,
  uploadArtistMedia,
  deleteArtistMedia,
  listCategories,
  listArtistMedia,

  requestWithdrawal,
  getWalletStats,
  listWalletTransactions,
  addBankDetail,
  getBankDetails,
  updateBankDetail,
  deleteBankDetail,
  toggleArtistActiveStatus,
} from "../controllers/artistController.js";
import { getArtistBookings, updateBookingStatus } from "../controllers/bookingController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { checkApiKey } from "../middlewares/apiKeyMiddleware.js";

import { cloudinaryUpload } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

const uploadMiddleware = cloudinaryUpload;


// Get active categories (public route)
router.get("/categories", checkApiKey, listCategories);

router.post(
  "/profile",
  checkApiKey,
  verifyToken,
  uploadMiddleware.fields([{ name: "profileImage", maxCount: 1 }]),
  createArtistProfile
);

router.put(
  "/profile",
  checkApiKey,
  verifyToken,
  uploadMiddleware.fields([{ name: "profileImage", maxCount: 1 }]),
  updateArtistProfile
);

router.get("/profile", verifyToken, getArtistProfile);
router.delete("/profile", verifyToken, deleteArtistProfile);

// List all media for current artist
router.get("/profile/media", checkApiKey, verifyToken, listArtistMedia);

router.post(
  "/profile/media",
  checkApiKey,
  verifyToken,
  uploadMiddleware.fields([
    { name: "photos", maxCount: 10 },
    { name: "videos", maxCount: 5 },
  ]),
  uploadArtistMedia
);
router.delete("/profile/media/:id", checkApiKey, verifyToken, deleteArtistMedia);

// Bank Details
router.post("/bank-details", checkApiKey, verifyToken, addBankDetail);
router.get("/bank-details", checkApiKey, verifyToken, getBankDetails);
router.put("/bank-details/:id", checkApiKey, verifyToken, updateBankDetail);
router.delete("/bank-details/:id", checkApiKey, verifyToken, deleteBankDetail);

// Wallet & Withdrawals
router.get("/wallet", checkApiKey, verifyToken, getWalletStats);
router.get("/wallet/transactions", checkApiKey, verifyToken, listWalletTransactions);

// Withdraw Request
router.post("/withdraw", checkApiKey, verifyToken, requestWithdrawal);

// Bookings for artist
router.get("/bookings", checkApiKey, verifyToken, getArtistBookings);

// Toggle Active Status
router.patch("/toggle-active", checkApiKey, verifyToken, toggleArtistActiveStatus);

// Booking Status Update
router.patch("/bookings/:id/status", checkApiKey, verifyToken, updateBookingStatus);

export default router;
