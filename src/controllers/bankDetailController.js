import BankDetail from "../models/BankDetail.js";
import mongoose from "mongoose";

// Add Bank Detail
export const addBankDetail = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const {
            accountHolderName,
            accountNumber,
            bankName,
            ifscCode,
            upiId,
            isPrimary
        } = req.body;

        // Validation: Require either bank account details OR UPI ID
        const hasBankDetails = accountHolderName && accountNumber && bankName && ifscCode;
        const hasUpi = !!upiId;

        if (!hasBankDetails && !hasUpi) {
            return res.status(400).json({
                success: false,
                message: "Please provide either full bank account details or a UPI ID"
            });
        }

        // If making this primary, unset other primaries for this user
        if (isPrimary) {
            await BankDetail.updateMany({ userId }, { isPrimary: false });
        }

        const bankDetail = await BankDetail.create({
            userId,
            accountHolderName,
            accountNumber,
            bankName,
            ifscCode,
            upiId,
            isPrimary: isPrimary || false
        });

        return res.status(201).json({ success: true, message: "Bank details added", bankDetail });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Get All Bank Details for User
export const getBankDetails = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const bankDetails = await BankDetail.find({ userId }).sort({ isPrimary: -1, createdAt: -1 });

        return res.status(200).json({ success: true, bankDetails });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Update Bank Detail
export const updateBankDetail = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }

        const updates = req.body;
        delete updates.userId; // Prevent changing owner

        // If setting as primary, unset others first
        if (updates.isPrimary) {
            await BankDetail.updateMany({ userId }, { isPrimary: false });
        }

        const bankDetail = await BankDetail.findOneAndUpdate(
            { _id: id, userId },
            updates,
            { new: true }
        );

        if (!bankDetail) return res.status(404).json({ message: "Bank detail not found" });

        return res.status(200).json({ success: true, message: "Bank details updated", bankDetail });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Delete Bank Detail
export const deleteBankDetail = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid ID format" });
        }

        const bankDetail = await BankDetail.findOneAndDelete({ _id: id, userId });

        if (!bankDetail) return res.status(404).json({ message: "Bank detail not found" });

        return res.status(200).json({ success: true, message: "Bank details deleted" });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
