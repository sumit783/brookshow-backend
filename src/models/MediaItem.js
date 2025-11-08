import mongoose from "mongoose";

const mediaItemSchema = new mongoose.Schema(
  {
    ownerType: { type: String, enum: ["artist", "event", "planner"], required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ["image", "video"], required: true },
    url: String,
    isCover: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("MediaItem", mediaItemSchema);
