import HeroImage from "../models/HeroImage.js";
import { deleteFromCloudinary } from "../utils/cloudinary.js";

/**
 * Create a new Hero Image with separate device versions
 */
export const createHeroImage = async (req, res) => {
  try {
    const { title, order } = req.body;
    
    // Check if all versions are uploaded
    if (!req.files || !req.files["desktopHero"] || !req.files["tabletHero"] || !req.files["mobileHero"]) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing images. Please provide desktopHero, tabletHero, and mobileHero files." 
      });
    }

    const desktopFile = req.files["desktopHero"][0];
    const tabletFile = req.files["tabletHero"][0];
    const mobileFile = req.files["mobileHero"][0];

    const hero = await HeroImage.create({
      title: title || "",
      order: order || 0,
      desktopUrl: desktopFile.path,
      desktopPublicId: desktopFile.filename,
      tabletUrl: tabletFile.path,
      tabletPublicId: tabletFile.filename,
      mobileUrl: mobileFile.path,
      mobilePublicId: mobileFile.filename,
    });

    return res.status(201).json({ success: true, message: "Hero image uploaded successfully", hero });
  } catch (error) {
    console.error("Error creating hero image:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * List all hero images (Public or Admin)
 */
export const listHeroImages = async (req, res) => {
  try {
    const { all } = req.query;
    const filter = all === "true" ? {} : { isActive: true };
    const heroes = await HeroImage.find(filter).sort({ order: 1, createdAt: -1 });
    return res.status(200).json({ success: true, items: heroes });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update hero image metadata (Admin only)
 */
export const updateHeroImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, order, isActive } = req.body;
    
    const hero = await HeroImage.findByIdAndUpdate(
      id,
      { title, order, isActive },
      { new: true }
    );

    if (!hero) return res.status(404).json({ success: false, message: "Hero image not found" });

    return res.status(200).json({ success: true, message: "Hero image updated", hero });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete hero image (Admin only)
 */
export const deleteHeroImage = async (req, res) => {
  try {
    const { id } = req.params;
    const hero = await HeroImage.findById(id);

    if (!hero) return res.status(404).json({ success: false, message: "Hero image not found" });

    // Delete all versions from Cloudinary
    await Promise.all([
      deleteFromCloudinary(hero.desktopPublicId),
      deleteFromCloudinary(hero.tabletPublicId),
      deleteFromCloudinary(hero.mobilePublicId)
    ]);

    await hero.deleteOne();

    return res.status(200).json({ success: true, message: "Hero image and associated assets deleted" });
  } catch (error) {
    console.error("Error deleting hero image:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
