import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    artistProfileId: { type: mongoose.Schema.Types.ObjectId, ref: "ArtistProfile" },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", default: null },
    source: { type: String, enum: ["user", "planner", "offline"], default: "user" },
    startAt: Date,
    endAt: Date,
    totalPrice: Number,
    status: { type: String, enum: ["pending", "confirmed", "completed", "cancelled"], default: "pending" },
    paymentStatus: { type: String, enum: ["unpaid", "authorized", "paid", "refunded"], default: "unpaid" },
    notes: String,
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);
