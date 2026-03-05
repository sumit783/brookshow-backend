import PlannerProfile from "../models/PlannerProfile.js";
import User from "../models/User.js";
import PlannerEmployee from "../models/PlannerEmployee.js";
import mongoose from "mongoose";

export const createEmployee = async (req, res) => {
    try {
        const plannerUserId = req.user?.id;
        if (!plannerUserId) return res.status(401).json({ message: "Unauthorized" });

        const plannerProfile = await PlannerProfile.findOne({ userId: plannerUserId }).select("_id");
        if (!plannerProfile) return res.status(404).json({ message: "Planner profile not found" });

        const { displayName, email, phone, countryCode, isActive } = req.body;
        if (!displayName || !email || !phone || isActive === undefined) {
            return res.status(400).json({ success: false, message: "Display name, email, phone, and isActive are required" });
        }
        // Check if user already exists (by email or phone)
        let userToLink;
        const existingUser = await User.findOne({ $or: [{ email: email }, { phone: phone }] });
        if (existingUser) {
            existingUser.role = "employee";
            existingUser.isActive = isActive;
            await existingUser.save();
            userToLink = existingUser;
        } else {
            const newUser = await User.create({
                displayName,
                email,
                phone,
                countryCode: countryCode || "+91",
                role: "employee",
                isPhoneVerified: true,
                isEmailVerified: true,
                isAdminVerified: true,
                isActive: isActive !== undefined ? isActive : true, // Default active
            });
            userToLink = newUser;
        }

        // Link the user as an employee to the planner profile
        const plannerEmployee = await PlannerEmployee.create({
            plannerProfileId: plannerProfile._id,
            name: displayName,
            email,
            phone,
            employeeId: userToLink._id,
        });

        return res.status(201).json({ success: true, message: "Employee created successfully", employee: userToLink._id, plannerEmployee });
    } catch (err) {
        console.error("Error creating employee:", err);
        return res.status(500).json({ success: false, message: "Failed to create employee" });
    }
};

export const listEmployees = async (req, res) => {
    try {
        const plannerUserId = req.user?.id;
        if (!plannerUserId) return res.status(401).json({ message: "Unauthorized" });

        const plannerProfile = await PlannerProfile.findOne({ userId: plannerUserId }).select("_id");
        if (!plannerProfile) return res.status(404).json({ message: "Planner profile not found" });

        const employees = await PlannerEmployee.find({ plannerProfileId: plannerProfile._id });
        return res.status(200).json({ success: true, employees });
    } catch (err) {
        console.error("Error listing employees:", err);
        return res.status(500).json({ success: false, message: "Failed to list employees" });
    }
};

export const getEmployeeById = async (req, res) => {
    try {
        const plannerUserId = req.user?.id;
        if (!plannerUserId) return res.status(401).json({ message: "Unauthorized" });

        const plannerProfile = await PlannerProfile.findOne({ userId: plannerUserId }).select("_id");
        if (!plannerProfile) return res.status(404).json({ message: "Planner profile not found" });

        const { id } = req.params; // This `id` is the PlannerEmployee._id

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid employee ID format" });
        }

        const plannerEmployee = await PlannerEmployee.findOne({ _id: id, plannerProfileId: plannerProfile._id })
            .populate("employeeId", "displayName email phone countryCode isActive")
            .lean();

        if (!plannerEmployee) {
            return res.status(404).json({ message: "Employee not found for this planner" });
        }

        const employeeData = {
            id: plannerEmployee.employeeId._id,
            displayName: plannerEmployee.employeeId.displayName,
            email: plannerEmployee.employeeId.email,
            phone: plannerEmployee.employeeId.phone,
            countryCode: plannerEmployee.employeeId.countryCode,
            isActive: plannerEmployee.employeeId.isActive,
            plannerEmployeeId: plannerEmployee._id,
        };

        return res.status(200).json({ success: true, employee: employeeData });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const updateEmployee = async (req, res) => {
    try {
        const plannerUserId = req.user?.id;
        if (!plannerUserId) return res.status(401).json({ message: "Unauthorized" });

        const plannerProfile = await PlannerProfile.findOne({ userId: plannerUserId }).select("_id");
        if (!plannerProfile) return res.status(404).json({ message: "Planner profile not found" });

        const { id } = req.params; // This `id` is the PlannerEmployee._id

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid employee ID format" });
        }

        const { displayName, email, phone, countryCode, isActive } = req.body;

        // Find the PlannerEmployee entry
        const plannerEmployee = await PlannerEmployee.findOne({ _id: id, plannerProfileId: plannerProfile._id });
        if (!plannerEmployee) {
            return res.status(404).json({ message: "Employee not found for this planner" });
        }

        // Prepare updates for the User model
        const userUpdates = {};
        if (displayName !== undefined) userUpdates.displayName = displayName;
        if (email !== undefined) userUpdates.email = email;
        if (phone !== undefined) userUpdates.phone = phone;
        if (countryCode !== undefined) userUpdates.countryCode = countryCode;
        if (isActive !== undefined) userUpdates.isActive = isActive;

        // Apply updates to the User document
        const updatedUser = await User.findByIdAndUpdate(plannerEmployee.employeeId._id, userUpdates, { new: true }).lean();

        if (!updatedUser) {
            return res.status(404).json({ message: "User associated with employee not found" });
        }

        return res.status(200).json({ message: "Employee updated successfully", employee: updatedUser });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

export const deleteEmployee = async (req, res) => {
    try {
        const plannerUserId = req.user?.id;
        if (!plannerUserId) return res.status(401).json({ message: "Unauthorized" });

        const plannerProfile = await PlannerProfile.findOne({ userId: plannerUserId }).select("_id");
        if (!plannerProfile) return res.status(404).json({ message: "Planner profile not found" });

        const { id } = req.params; // This `id` is the PlannerEmployee._id

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid employee ID format" });
        }

        // Find the PlannerEmployee entry
        const plannerEmployee = await PlannerEmployee.findOne({ _id: id, plannerProfileId: plannerProfile._id });
        if (!plannerEmployee) {
            return res.status(404).json({ message: "Employee not found for this planner" });
        }

        plannerEmployee.isActive = false;
        await plannerEmployee.save();

        return res.status(204).send();
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
