import mongoose from "mongoose";

const ticketTypeSchema = new mongoose.Schema(
  {
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
    title: String,
    price: Number,
    quantity: Number,
    sold: { type: Number, default: 0 },
    salesStart: Date,
    salesEnd: Date,
  },
  { timestamps: true }
);

export default mongoose.model("TicketType", ticketTypeSchema);
