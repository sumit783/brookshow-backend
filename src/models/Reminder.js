import mongoose from "mongoose";

const reminderSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["whatsapp", "sms", "email"] },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event", default: null },
    sendAt: Date,
    status: { type: String, enum: ["scheduled", "sent", "failed", "cancelled"], default: "scheduled" },
    payload: Object,
  },
  { timestamps: true }
);

export default mongoose.model("Reminder", reminderSchema);
