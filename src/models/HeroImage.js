import mongoose from "mongoose";

const heroImageSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    
    // Desktop Version
    desktopUrl: { type: String, required: true },
    desktopPublicId: { type: String, required: true },
    
    // Tablet Version
    tabletUrl: { type: String, required: true },
    tabletPublicId: { type: String, required: true },
    
    // Mobile Version
    mobileUrl: { type: String, required: true },
    mobilePublicId: { type: String, required: true },
    
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("HeroImage", heroImageSchema);
