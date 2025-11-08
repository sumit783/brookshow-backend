import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    artistProfileId: { type: mongoose.Schema.Types.ObjectId, ref: "ArtistProfile" },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rating: Number,
    title: String,
    body: String,
  },
  { timestamps: true }
);

export default mongoose.model("Review", reviewSchema);
