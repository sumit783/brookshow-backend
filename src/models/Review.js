import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    artistId: { type: mongoose.Schema.Types.ObjectId, ref: "Artist" },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rating: Number,
    message: String,
  },
  { timestamps: true }
);

export default mongoose.model("Review", reviewSchema);
