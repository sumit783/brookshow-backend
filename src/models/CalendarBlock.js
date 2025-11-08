import mongoose from "mongoose";

const calendarBlockSchema = new mongoose.Schema(
  {
    artistProfileId: { type: mongoose.Schema.Types.ObjectId, ref: "ArtistProfile" },
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
