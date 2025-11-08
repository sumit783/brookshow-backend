import mongoose from "mongoose";

const plannerProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    organization: { type: String },
    logoUrl: { type: String, default: "" },
    verified: { type: Boolean, default: false },
    verificationNote: { type: String, default: "" },
    walletBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("PlannerProfile", plannerProfileSchema);
