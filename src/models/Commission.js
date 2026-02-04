import mongoose from "mongoose";

const commissionSchema = new mongoose.Schema(
  {
    artistBookingCommission: { type: Number, default: 0 },
    ticketSellCommission: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Commission", commissionSchema);
