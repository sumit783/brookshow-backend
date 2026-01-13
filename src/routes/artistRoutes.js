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
} from "../controllers/artistController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { checkApiKey } from "../middlewares/apiKeyMiddleware.js";

const router = express.Router();

// Resolve uploads directory (allow override via env)
const resolvedUploads = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.resolve("uploads");

// Create uploads dir if not exists
if (!fs.existsSync(resolvedUploads)) {
  fs.mkdirSync(resolvedUploads, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, resolvedUploads);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, fileName);
  },
});

const uploadMiddleware = multer({
  storage,
});

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

export default router;
