import mongoose from "mongoose";

const calendarBlockSchema = new mongoose.Schema(
  {
    artistId: { type: mongoose.Schema.Types.ObjectId, ref: "Artist" },
    startDate: Date,
    endDate: Date,
    type: { type: String, enum: ["busy", "offlineBooking", "onlineBooking"] },
    title: String,
    linkedBookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    createdBy: String,
  },
  { timestamps: true }
);

export default mongoose.model("CalendarBlock", calendarBlockSchema);
