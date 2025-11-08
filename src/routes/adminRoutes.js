import express from "express";
import { verifySupabaseAdmin } from "../middlewares/adminAuthMiddleware.js";
import { verifyArtist, rejectArtist, verifyPlanner, rejectPlanner } from "../controllers/adminController.js";
import { createCategory, listCategories, getCategoryById, updateCategory, deleteCategory } from "../controllers/categoryController.js";
import { checkApiKey } from "../middlewares/apiKeyMiddleware.js";

const router = express.Router();

// Artist verification routes
router.put("/artists/:id/verify", checkApiKey, verifySupabaseAdmin, verifyArtist);
router.put("/artists/:id/reject", checkApiKey, verifySupabaseAdmin, rejectArtist);

// Planner verification routes
router.put("/planners/:id/verify", checkApiKey, verifySupabaseAdmin, verifyPlanner);
router.put("/planners/:id/reject", checkApiKey, verifySupabaseAdmin, rejectPlanner);

// Category CRUD routes
router.post("/categories", checkApiKey, verifySupabaseAdmin, createCategory);
router.get("/categories", checkApiKey, listCategories);
router.get("/categories/:id", checkApiKey, getCategoryById);
router.put("/categories/:id", checkApiKey, verifySupabaseAdmin, updateCategory);
router.delete("/categories/:id", checkApiKey, verifySupabaseAdmin, deleteCategory);

export default router;
