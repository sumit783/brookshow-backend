import PlannerProfile from "../models/PlannerProfile.js";
import WalletTransaction from "../models/WalletTransaction.js";
import User from "../models/User.js";
import PlannerEmployee from "../models/PlannerEmployee.js";
import Ticket from "../models/Ticket.js";
import WithdrawalRequest from "../models/WithdrawalRequest.js";
import Booking from "../models/Booking.js";
import Artist from "../models/Artist.js";
import Service from "../models/Service.js";
import BankDetail from "../models/BankDetail.js";
import mongoose from "mongoose";

export const createPlannerProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { organization } = req.body;
    if (!organization) return res.status(400).json({ message: "organization is required" });

    const existing = await PlannerProfile.findOne({ userId });
    if (existing) return res.status(409).json({ message: "Planner profile already exists for user" });

    const payload = {
      userId,
      organization,
    };
    if (req.file) {
      payload.logoUrl = "/uploads/" + req.file.filename;
    }

    const profile = await PlannerProfile.create(payload);

    return res.status(201).json({ message: "Planner profile created", profile });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getPlannerProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const profile = await PlannerProfile.findOne({ userId }).lean();
    if (!profile) return res.status(404).json({ message: "Planner profile not found" });

    // Fetch booked artists with event details
    const bookings = await Booking.find({ clientId: userId })
      .populate({
        path: "artistId",
        select: "userId bio category location profileImage",
        populate: {
          path: "userId",
          select: "displayName email phone"
        }
      })
      .populate("eventId", "title startAt endAt venue address city state")
      .populate("serviceId", "category unit price_for_planner")
      .sort({ createdAt: -1 })
      .lean();

    profile.bookedArtists = bookings;

    return res.status(200).json(profile);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const updatePlannerProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const updates = {};
    const { organization, verified } = req.body;
    if (organization !== undefined) updates.organization = organization;
    if (verified !== undefined) updates.verified = verified;
    if (req.file) updates.logoUrl = "/uploads/" + req.file.filename;

    const profile = await PlannerProfile.findOneAndUpdate({ userId }, updates, { new: true });
    if (!profile) return res.status(404).json({ message: "Planner profile not found" });
    return res.status(200).json({ message: "Planner profile updated", profile });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const deletePlannerProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const profile = await PlannerProfile.findOne({ userId });
    if (!profile) return res.status(404).json({ message: "Planner profile not found" });
    await PlannerProfile.deleteOne({ userId });
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getPlannerWallet = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const plannerProfile = await PlannerProfile.findOne({ userId }).select("walletBalance");
    if (!plannerProfile) return res.status(404).json({ message: "Planner profile not found" });

    // Calculate total income and total expense
    const stats = await WalletTransaction.aggregate([
      {
        $match: {
          ownerId: plannerProfile._id,
          ownerType: "planner"
        }
      },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" }
        }
      }
    ]);

    let totalIncome = 0;
    let totalExpense = 0;

    stats.forEach(stat => {
      if (stat._id === "credit") {
        totalIncome = stat.total;
      } else if (stat._id === "debit") {
        totalExpense = stat.total;
      }
    });

    return res.status(200).json({
      success: true,
      walletBalance: plannerProfile.walletBalance,
      totalIncome,
      totalExpense
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const listPlannerTransactions = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const plannerProfile = await PlannerProfile.findOne({ userId }).select("_id");
    if (!plannerProfile) return res.status(404).json({ message: "Planner profile not found" });

    const transactions = await WalletTransaction.find({ ownerId: plannerProfile._id, ownerType: "planner" })
      .sort({ createdAt: -1 }); // Latest transactions first

    return res.status(200).json({ success: true, transactions });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createEmployee = async (req, res) => {
  try {
    const plannerUserId = req.user?.id;
    if (!plannerUserId) return res.status(401).json({ message: "Unauthorized" });

    const plannerProfile = await PlannerProfile.findOne({ userId: plannerUserId }).select("_id");
    if (!plannerProfile) return res.status(404).json({ message: "Planner profile not found" });

    const { displayName, email, phone, countryCode, isActive } = req.body;
    if (!displayName || !email || !phone || !isActive) {
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
        isActive: isActive || true, // Default active
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
    console.log("planner user id", plannerUserId)
    const plannerProfile = await PlannerProfile.findOne({ userId: plannerUserId }).select("_id");
    if (!plannerProfile) return res.status(404).json({ message: "Planner profile not found" });
    console.log("planner profile", plannerProfile)
    const employees = await PlannerEmployee.find({ plannerProfileId: plannerProfile._id })
    console.log("employees", employees)
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
    const updates = {};

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

    // No direct updates to PlannerEmployee model in this scenario, but could be extended

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

    // Find and delete the PlannerEmployee entry
    const plannerEmployee = await PlannerEmployee.findOne({ _id: id, plannerProfileId: plannerProfile._id });
    plannerEmployee.isActive = false;
    await plannerEmployee.save();
    if (!plannerEmployee) {
      return res.status(404).json({ message: "Employee not found for this planner" });
    }

    // Also delete the associated User document
    // await User.findByIdAndDelete(plannerEmployee.employeeId);

    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Helper to get planner ID for a user (either direct planner or employee)
const getPlannerIdForUser = async (userId) => {
  // Check if user is a planner
  const plannerProfile = await PlannerProfile.findOne({ userId }).select("_id");
  if (plannerProfile) return plannerProfile._id;

  // Check if user is an employee
  const employee = await PlannerEmployee.findOne({ employeeId: userId, isActive: true }).select("plannerProfileId");
  if (employee) return employee.plannerProfileId;

  return null;
};

export const verifyTicket = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const plannerProfileId = await getPlannerIdForUser(userId);
    if (!plannerProfileId) {
      return res.status(403).json({ message: "Unauthorized: Not a planner or active employee" });
    }

    const { ticketId, count = 1 } = req.body;

    if (!ticketId) {
      return res.status(400).json({ success: false, message: "Ticket ID is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return res.status(400).json({ success: false, message: "Invalid ticket ID format" });
    }

    const ticket = await Ticket.findById(ticketId).populate('ticketTypeId', 'title').populate({
      path: 'eventId',
      select: 'plannerProfileId'
    });

    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    // Authorization check
    if (!ticket.eventId || ticket.eventId.plannerProfileId.toString() !== plannerProfileId.toString()) {
      return res.status(403).json({ success: false, message: "You are not authorized to verify this ticket" });
    }

    if (!ticket.isValide) {
      return res.status(400).json({ success: false, message: "Ticket is invalid" });
    }

    const requestedCount = Number(count);
    if (requestedCount <= 0) {
      return res.status(400).json({ success: false, message: "Count must be positive" });
    }

    // Check if ticket is fully used
    if (ticket.scanned || ticket.scannedPersons >= ticket.persons) {
      return res.status(400).json({
        success: false,
        message: "Ticket already fully used",
        ticket: {
          buyerName: ticket.buyerName,
          scannedPersons: ticket.scannedPersons,
          totalPersons: ticket.persons
        }
      });
    }

    // Check if adding count exceeds limits
    if (ticket.scannedPersons + requestedCount > ticket.persons) {
      const remaining = ticket.persons - ticket.scannedPersons;
      return res.status(400).json({
        success: false,
        message: `Cannot admit ${requestedCount} people. Only ${remaining} entries remaining.`,
        remaining
      });
    }

    // Update ticket
    ticket.scannedPersons += requestedCount;
    ticket.scannedAt = new Date();

    if (ticket.scannedPersons >= ticket.persons) {
      ticket.scanned = true;
    }

    await ticket.save();

    return res.status(200).json({
      success: true,
      message: "Entry verified",
      entriesGranted: requestedCount,
      totalScanned: ticket.scannedPersons,
      remainingEntries: ticket.persons - ticket.scannedPersons,
      ticket: {
        id: ticket._id,
        buyerName: ticket.buyerName,
        type: ticket.ticketTypeId?.title || "Standard",
        isFullyUsed: ticket.scanned
      }
    });

  } catch (err) {
    console.error("verifyTicket Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getTicketDataById = async (req, res) => {
  try {
    const userId = req.user?.id;
    console.log(`[DEBUG] getTicketDataById - UserID: ${userId}`);

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Determine planner context (Direct Owner or Employee)
    const plannerProfileId = await getPlannerIdForUser(userId);

    if (!plannerProfileId) {
      console.warn(`[DEBUG] User is NOT a Planner or Employee. UserID: ${userId}`);
      return res.status(403).json({ message: "Access denied. Not a planner or employee." });
    }
    console.log(`[DEBUG] Acting on behalf of Planner Profile: ${plannerProfileId}`);

    const { id } = req.params;
    console.log(`[DEBUG] Requested Ticket ID: ${id}`);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.warn(`[DEBUG] Invalid Ticket ID format: ${id}`);
      return res.status(400).json({ success: false, message: "Invalid ticket ID format" });
    }

    // Find ticket and populate event
    const ticket = await Ticket.findById(id).select("-qrDataUrl -scanned")
      .populate("eventId", "title startAt plannerProfileId")
      .populate("ticketTypeId", "title price");

    if (!ticket) {
      console.warn(`[DEBUG] Ticket NOT FOUND for ID: ${id}`);
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }
    console.log(`[DEBUG] Ticket Found: ${ticket._id}, Event: ${ticket.eventId?._id}, Planner: ${ticket.eventId?.plannerProfileId}`);

    // Security check: Ensure event belongs to this planner context
    if (!ticket.eventId || ticket.eventId.plannerProfileId.toString() !== plannerProfileId.toString()) {
      console.warn(`[DEBUG] ACCESS DENIED. Ticket Event Planner: ${ticket.eventId?.plannerProfileId}, User Linked Planner: ${plannerProfileId}`);
      return res.status(403).json({ success: false, message: "You are not authorized to view this ticket" });
    }

    console.log(`[DEBUG] Access Granted. Returning Ticket.`);
    return res.status(200).json({ success: true, ticket });

  } catch (err) {
    console.error(`[DEBUG] Error in getTicketDataById: ${err.message}`, err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const requestWithdrawal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    // Check if bank details are available
    const bankDetailExists = await BankDetail.findOne({ userId });
    if (!bankDetailExists) {
      return res.status(400).json({ success: false, message: "Bank details is not avilable" });
    }

    const planner = await PlannerProfile.findOne({ userId });
    if (!planner) {
      return res.status(404).json({ success: false, message: "Planner profile not found" });
    }

    if (planner.walletBalance < amount) {
      return res.status(400).json({ success: false, message: "Insufficient balance" });
    }

    // Deduct balance
    planner.walletBalance -= amount;
    await planner.save();

    // Create Transaction
    const transaction = await WalletTransaction.create({
      ownerId: planner._id,
      ownerType: "planner",
      type: "debit",
      amount,
      source: "withdraw",
      description: "Withdrawal Request",
      status: "pending"
    });

    // Create Withdrawal Request
    const withdrawalRequest = await WithdrawalRequest.create({
      userId: userId,
      userType: "planner",
      amount,
      bankDetails: {
        accountHolder: bankDetailExists.accountHolderName,
        accountNumber: bankDetailExists.accountNumber,
        bankName: bankDetailExists.bankName,
        ifscCode: bankDetailExists.ifscCode,
        upiId: bankDetailExists.upiId
      },
      transactionId: transaction._id
    });

    return res.status(201).json({
      success: true,
      message: "Withdrawal request created successfully",
      withdrawalRequest,
      newBalance: planner.walletBalance
    });

  } catch (err) {
    console.error("requestWithdrawal error:", err);
    return res.status(500).json({ success: false, message: "Failed to process withdrawal request" });
  }
};

// Create Artist Booking (Planner)
export const createArtistBooking = async (req, res) => {
  try {
    const plannerUserId = req.user?.id;
    if (!plannerUserId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const plannerProfile = await PlannerProfile.findOne({ userId: plannerUserId });
    if (!plannerProfile) return res.status(404).json({ success: false, message: "Planner profile not found" });

    const { artistId, serviceId, eventId, startAt, endAt } = req.body;

    // Validate required fields
    if (!artistId || !serviceId || !startAt || !endAt) {
      return res.status(400).json({
        success: false,
        message: "Artist ID, Service ID, start date, and end date are required"
      });
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(artistId) || !mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ success: false, message: "Invalid artist or service ID format" });
    }

    if (eventId && !mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ success: false, message: "Invalid event ID format" });
    }

    // Validate dates
    // Fix URL-encoded dates if coming from query params
    const fixedStartAt = typeof startAt === 'string' ? startAt.replace(/ /g, '+') : startAt;
    const fixedEndAt = typeof endAt === 'string' ? endAt.replace(/ /g, '+') : endAt;

    const startDate = new Date(fixedStartAt);
    const endDate = new Date(fixedEndAt);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date format" });
    }

    if (startDate >= endDate) {
      return res.status(400).json({ success: false, message: "End date must be after start date" });
    }

    if (startDate < new Date()) {
      return res.status(400).json({ success: false, message: "Start date cannot be in the past" });
    }

    // Check if artist exists
    const artist = await Artist.findById(artistId);
    if (!artist) {
      return res.status(404).json({ success: false, message: "Artist not found" });
    }

    // Check if service exists and belongs to the artist
    const service = await Service.findOne({ _id: serviceId, artistId: artistId });
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found for this artist" });
    }

    // Check artist availability for the requested dates
    const conflictingBooking = await Booking.findOne({
      artistId: artistId,
      status: { $in: ["pending", "confirmed"] },
      $or: [
        { startAt: { $lte: startDate }, endAt: { $gte: startDate } },
        { startAt: { $lte: endDate }, endAt: { $gte: endDate } },
        { startAt: { $gte: startDate }, endAt: { $lte: endDate } }
      ]
    });

    if (conflictingBooking) {
      return res.status(409).json({
        success: false,
        message: "Artist is not available for the selected dates",
        conflictingBooking: {
          startAt: conflictingBooking.startAt,
          endAt: conflictingBooking.endAt
        }
      });
    }

    // Calculate total price based on service pricing for planners
    const pricePerUnit = service.price_for_planner || 0;

    // Calculate duration based on service unit
    let units = 1;
    const timeDiff = endDate - startDate;

    if (service.unit === "hour") {
      units = Math.ceil(timeDiff / (1000 * 60 * 60)); // Convert to hours
    } else if (service.unit === "day") {
      units = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)); // Convert to days
    } else if (service.unit === "event") {
      units = 1; // Flat rate per event
    }

    const totalPrice = pricePerUnit * units;

    // Check if planner has sufficient wallet balance
    // if (plannerProfile.walletBalance < totalPrice) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Insufficient wallet balance",
    //     required: totalPrice,
    //     available: plannerProfile.walletBalance
    //   });
    // }

    // Create the booking
    const booking = await Booking.create({
      clientId: plannerUserId,
      artistId: artistId,
      serviceId: serviceId,
      eventId: eventId || null,
      source: "planner",
      startAt: startDate,
      endAt: endDate,
      totalPrice: totalPrice,
      status: "confirmed", // Auto-confirm since payment is from wallet
      paymentStatus: "paid" // Mark as paid since we're deducting from wallet
    });

    // Deduct from planner wallet
    plannerProfile.walletBalance -= totalPrice;
    await plannerProfile.save();

    // Create wallet transaction for planner
    await WalletTransaction.create({
      ownerId: plannerProfile._id,
      ownerType: "planner",
      type: "debit",
      amount: totalPrice,
      source: "booking",
      description: `Artist booking - ${service.category}`,
      status: "completed",
      relatedId: booking._id
    });

    // Add booking to artist's bookings array
    artist.bookings.push(booking._id);
    await artist.save();

    // Populate booking details for response
    const populatedBooking = await Booking.findById(booking._id)
      .populate("artistId", "userId bio category location")
      .populate("serviceId", "category unit price_for_planner")
      .populate("eventId", "title startAt endAt");

    return res.status(201).json({
      success: true,
      message: "Artist booking created successfully",
      booking: populatedBooking,
      remainingBalance: plannerProfile.walletBalance
    });

  } catch (err) {
    console.error("Error creating artist booking:", err);
    return res.status(500).json({ success: false, message: "Failed to create artist booking" });
  }
};

// Check Artist Availability with Pricing
export const checkArtistAvailabilityWithPricing = async (req, res) => {
  try {
    const { artistId, serviceId, startAt, endAt } = req.query;

    // Validate required fields
    if (!artistId || !serviceId || !startAt || !endAt) {
      return res.status(400).json({
        success: false,
        message: "Artist ID, Service ID, start date, and end date are required"
      });
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(artistId) || !mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ success: false, message: "Invalid artist or service ID format" });
    }

    // Validate dates
    // Fix URL-encoded dates: query params decode '+' as space, so we need to restore it
    const fixedStartAt = startAt.replace(/ /g, '+');
    const fixedEndAt = endAt.replace(/ /g, '+');

    const startDate = new Date(fixedStartAt);
    const endDate = new Date(fixedEndAt);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date format" });
    }

    if (startDate >= endDate) {
      return res.status(400).json({ success: false, message: "End date must be after start date" });
    }

    // Check if artist exists
    const artist = await Artist.findById(artistId).select("userId category location");
    if (!artist) {
      return res.status(404).json({ success: false, message: "Artist not found" });
    }

    // Check if service exists and belongs to the artist
    const service = await Service.findOne({ _id: serviceId, artistId: artistId });
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found for this artist" });
    }

    // Check for conflicting bookings
    const conflictingBooking = await Booking.findOne({
      artistId: artistId,
      status: { $in: ["pending", "confirmed"] },
      $or: [
        { startAt: { $lte: startDate }, endAt: { $gte: startDate } },
        { startAt: { $lte: endDate }, endAt: { $gte: endDate } },
        { startAt: { $gte: startDate }, endAt: { $lte: endDate } }
      ]
    }).select("startAt endAt");

    const isAvailable = !conflictingBooking;

    // Calculate pricing
    const pricePerUnit = service.price_for_planner || 0;
    let units = 1;
    const timeDiff = endDate - startDate;

    if (service.unit === "hour") {
      units = Math.ceil(timeDiff / (1000 * 60 * 60));
    } else if (service.unit === "day") {
      units = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    } else if (service.unit === "event") {
      units = 1;
    }

    const totalPrice = pricePerUnit * units;

    return res.status(200).json({
      success: true,
      available: isAvailable,
      artist: {
        id: artist._id,
        category: artist.category,
        location: artist.location
      },
      service: {
        id: service._id,
        category: service.category,
        unit: service.unit,
        pricePerUnit: pricePerUnit
      },
      pricing: {
        pricePerUnit: pricePerUnit,
        units: units,
        totalPrice: totalPrice,
        currency: "INR"
      },
      requestedDates: {
        startAt: startDate,
        endAt: endDate
      },
      conflictingBooking: conflictingBooking ? {
        startAt: conflictingBooking.startAt,
        endAt: conflictingBooking.endAt
      } : null
    });

  } catch (err) {
    console.error("Error checking artist availability:", err);
    return res.status(500).json({ success: false, message: "Failed to check artist availability" });
  }
};

// Get Planner Events (Title and ID)
export const getPlannerEvents = async (req, res) => {
  try {
    const plannerUserId = req.user?.id;
    if (!plannerUserId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const plannerProfile = await PlannerProfile.findOne({ userId: plannerUserId }).select("_id");
    if (!plannerProfile) return res.status(404).json({ success: false, message: "Planner profile not found" });

    // Import Event model if not already imported
    const Event = (await import("../models/Event.js")).default;

    // Get all events for this planner
    const events = await Event.find({ plannerProfileId: plannerProfile._id })
      .select("title _id startAt endAt published")
      .sort({ startAt: -1 }); // Sort by start date, newest first

    return res.status(200).json({
      success: true,
      count: events.length,
      events: events.map(event => ({
        id: event._id,
        title: event.title,
        startAt: event.startAt,
        endAt: event.endAt,
        published: event.published
      }))
    });

  } catch (err) {
    console.error("Error fetching planner events:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch events" });
  }
};
