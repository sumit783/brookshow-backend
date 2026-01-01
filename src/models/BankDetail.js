import mongoose from "mongoose";

const bankDetailSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        accountHolderName: { type: String },
        accountNumber: { type: String },
        bankName: { type: String },
        ifscCode: { type: String },
        upiId: { type: String },
        isPrimary: { type: Boolean, default: false },
    },
    { timestamps: true }
);

bankDetailSchema.pre("save", async function (next) {
    if (this.isPrimary) {
        await this.constructor.updateMany(
            { userId: this.userId, _id: { $ne: this._id } },
            { $set: { isPrimary: false } }
        );
    }
    next();
});

export default mongoose.model("BankDetail", bankDetailSchema);
