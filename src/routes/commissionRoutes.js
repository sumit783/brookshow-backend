import express from "express";
import {
  getCommission,
  createCommission,
  updateCommission,
  deleteCommission,
} from "../controllers/commissionController.js";
import { verifySupabaseAdmin } from "../middlewares/adminAuthMiddleware.js";

const router = express.Router();

// Public or User accessible GET (if needed, but usually admin only for editing)
// For now, let's keep GET public if it's needed by the frontend to show charges, 
// but creation/updates must be admin.
router.get("/", getCommission);

// Admin only routes
router.post("/", verifySupabaseAdmin, createCommission);
router.put("/:id", verifySupabaseAdmin, updateCommission);
router.delete("/:id", verifySupabaseAdmin, deleteCommission);

export default router;
