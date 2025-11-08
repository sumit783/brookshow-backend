import Category from "../models/Category.js";
import mongoose from "mongoose";

export const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Category name is required" });

    const existing = await Category.findOne({ name: name.trim() });
    if (existing) return res.status(409).json({ message: "Category already exists" });

    const payload = {
      name: name.trim(),
    };
    const adminId = req.admin?.id;
    if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
      payload.createdBy = adminId;
    }

    const category = await Category.create(payload);

    return res.status(201).json({ message: "Category created", category });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const listCategories = async (req, res) => {
  try {
    const { activeOnly } = req.query;
    const filter = activeOnly === "true" ? { isActive: true } : {};
    const categories = await Category.find(filter).sort({ name: 1 });
    return res.status(200).json({ categories });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ message: "Category not found" });
    return res.status(200).json({ category });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (isActive !== undefined) updates.isActive = isActive;

    const category = await Category.findByIdAndUpdate(id, updates, { new: true });
    if (!category) return res.status(404).json({ message: "Category not found" });
    return res.status(200).json({ message: "Category updated", category });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Category not found" });
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

