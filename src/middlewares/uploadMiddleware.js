import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = "brookshow/others";
    let resource_type = "auto";

    if (file.fieldname === "profileImage" || file.fieldname === "photos") {
      folder = "brookshow/artists";
    } else if (file.fieldname === "logo") {
      folder = "brookshow/planners";
    } else if (file.fieldname === "banner") {
      folder = "brookshow/events";
    } else if (file.fieldname === "videos") {
      folder = "brookshow/videos";
      resource_type = "video";
    } else if (file.fieldname === "desktopHero" || file.fieldname === "tabletHero" || file.fieldname === "mobileHero") {
      folder = "brookshow/hero";
    }

    return {
      folder: folder,
      resource_type: resource_type,
      allowed_formats: ["jpg", "jpeg", "png", "webp", "mp4", "mov", "avi"],
      public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
    };
  },
});

export const cloudinaryUpload = multer({ storage });
