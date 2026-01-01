import mongoose from "mongoose";

const withdrawalRequestSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        userType: { type: String, enum: ["artist", "planner"], required: true },
        amount: { type: Number, required: true },
        status: {
            type: String,
            enum: ["pending", "rejected", "processed"],
            default: "pending"
        },
        bankDetails: {
            accountHolder: String,
            accountNumber: String,
            bankName: String,
            ifscCode: String,
            upiId: String,
        },
        adminNotes: String,
        transactionId: { type: mongoose.Schema.Types.ObjectId, ref: "WalletTransaction" },
    },
    { timestamps: true }
);

export default mongoose.model("WithdrawalRequest", withdrawalRequestSchema);
