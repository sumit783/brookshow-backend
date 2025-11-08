import mongoose from "mongoose";

const scanSchema = new mongoose.Schema(
  {
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket" },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
    scannerId: { type: mongoose.Schema.Types.ObjectId, ref: "PlannerEmployee" },
    result: { type: String, enum: ["valid", "invalid", "duplicate", "suspect"], default: "valid" },
    deviceInfo: Object,
    timestamp: Date,
  },
  { timestamps: true }
);

export default mongoose.model("Scan", scanSchema);
