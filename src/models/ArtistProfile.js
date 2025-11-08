import mongoose from "mongoose";

const artistProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    displayName: { type: String },
    city: { type: String },
    state: { type: String },
    bio: { type: String },
    categories: [String],
    specialties: [String],
    media: [{ type: Object }],
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    walletBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("ArtistProfile", artistProfileSchema);
