import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    ownerType: { type: String, enum: ["artist", "planner"], required: true },
    type: { type: String, enum: ["credit", "debit"], required: true },
    amount: Number,
    source: { type: String, enum: ["booking", "withdraw", "refund", "adjustment"] },
    referenceId: { type: String, default: null },
    description: String,
    status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
    adminNote: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("WalletTransaction", walletTransactionSchema);
