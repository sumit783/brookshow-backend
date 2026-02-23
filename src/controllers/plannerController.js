import PlannerProfile from "../models/PlannerProfile.js";
import WalletTransaction from "../models/WalletTransaction.js";
import User from "../models/User.js";
import PlannerEmployee from "../models/PlannerEmployee.js";
import Ticket from "../models/Ticket.js";
import Event from "../models/Event.js";
import TicketType from "../models/TicketType.js";
import WithdrawalRequest from "../models/WithdrawalRequest.js";
import Booking from "../models/Booking.js";
import Artist from "../models/Artist.js";
import Service from "../models/Service.js";
import BankDetail from "../models/BankDetail.js";
import CalendarBlock from "../models/CalendarBlock.js";
import mongoose from "mongoose";
import { createOrder, verifySignature } from "../utils/razorpay.js";
import Commission from "../models/Commission.js";

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
    const { organization } = req.body;
    if (organization !== undefined) updates.organization = organization;
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
          ownerType: "planner",
          status: "completed"
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

    // Check for pending withdrawals to calculate available balance
    const pendingWithdrawals = await WithdrawalRequest.find({ 
      userId, 
      status: "pending" 
    });
    
    const totalPendingAmount = pendingWithdrawals.reduce((sum, req) => sum + req.amount, 0);
    const availableBalance = planner.walletBalance - totalPendingAmount;

    if (availableBalance < amount) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient available balance. Your current balance is ${planner.walletBalance}, but you have ${totalPendingAmount} in pending withdrawals.` 
      });
    }

    // DO NOT Deduct balance here anymore. It will be deducted when admin approves.
    // planner.walletBalance -= amount;
    // await planner.save();

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
      message: "Withdrawal request created successfully. Amount will be debited after admin verification.",
      withdrawalRequest,
      balance: planner.walletBalance, // Still shows original balance
      availableBalance: availableBalance - amount
    });

  } catch (err) {
    console.error("requestWithdrawal error:", err);
    return res.status(500).json({ success: false, message: "Failed to process withdrawal request" });
  }
};

// Create Artist Booking (Planner)
export const createArtistBooking = async (req, res) => {
  try {
    const plannerUserId = req.user?.id || req.user?.userId;
    if (!plannerUserId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const plannerProfile = await PlannerProfile.findOne({ userId: plannerUserId });
    if (!plannerProfile) return res.status(404).json({ success: false, message: "Planner profile not found" });

    const { artistId, serviceId, eventId, eventName, startAt, endAt, advanceAmount, paidAmount } = req.body;

    // Validate required fields
    if (!artistId || !serviceId || !startAt || !endAt || !eventName) {
      return res.status(400).json({
        success: false,
        message: "Artist ID, Service ID, event name, start date, and end date are required"
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
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date format" });
    }

    if (startDate >= endDate) {
      return res.status(400).json({ success: false, message: "End date must be after start date" });
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

    // Calculate total price based on service pricing for planners
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
    const finalPaidAmount = paidAmount || advanceAmount || (totalPrice * 0.2); // Default to 20% if not provided

    // Create the booking with pending status
    const booking = new Booking({
      clientId: plannerUserId,
      artistId: artistId,
      serviceId: serviceId,
      eventId: eventId || null,
      eventName: eventName,
      source: "planner",
      startAt: startDate,
      endAt: endDate,
      totalPrice: totalPrice,
      advanceAmount: finalPaidAmount,
      paidAmount: finalPaidAmount,
      status: "pending",
      paymentStatus: "unpaid"
    });

    // Create Razorpay Order
    const razorpayOrder = await createOrder(finalPaidAmount, booking._id.toString());
    
    // Update booking with Razorpay Order ID
    booking.razorpayOrderId = razorpayOrder.id;
    await booking.save();

    return res.status(201).json({ 
      success: true, 
      booking,
      razorpayOrder: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency
      }
    });
  } catch (err) {
    console.error("Planner createArtistBooking error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Verify Artist Booking Payment (Planner)
export const verifyArtistBookingPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing Razorpay payment details" });
    }

    const isVerified = verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!isVerified) {
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    const booking = await Booking.findOne({ razorpayOrderId: razorpay_order_id });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.paymentStatus === "advance") {
      return res.status(200).json({ success: true, message: "Payment already verified", booking });
    }

    // Update booking status
    booking.status = "confirmed";
    booking.paymentStatus = "advance";
    booking.razorpayPaymentId = razorpay_payment_id;
    booking.razorpaySignature = razorpay_signature;
    await booking.save();

    const artist = await Artist.findById(booking.artistId);
    
    // Create a calendar block for the artist booking
    await CalendarBlock.create({
      artistId: artist._id,
      startDate: booking.startAt,
      endDate: booking.endAt,
      type: "onlineBooking",
      title: booking.eventName,
      linkedBookingId: booking._id,
      createdBy: booking.clientId,
    });

    // Handle Commission and Artist Wallet Update
    const commissionSettings = await Commission.findOne().sort({ createdAt: -1 });
    const commissionPercent = commissionSettings ? commissionSettings.artistBookingCommission : 0;
    
    const commissionValue = (booking.totalPrice * commissionPercent) / 100;
    const artistNetCredit = booking.paidAmount - commissionValue;

    // Update Artist Wallet
    artist.wallet = artist.wallet || { balance: 0, pendingAmount: 0, transactions: [] };
    artist.wallet.balance += artistNetCredit;
    await artist.save();

    // Create Wallet Transaction for Artist
    await WalletTransaction.create({
      ownerId: artist._id,
      ownerType: "artist",
      type: "credit",
      amount: artistNetCredit,
      source: "booking",
      referenceId: booking._id.toString(),
      description: `Advance payment for planner booking (Total: ${booking.totalPrice}, Paid: ${booking.paidAmount}, Commission: ${commissionValue})`,
      status: "completed"
    });

    return res.status(200).json({ 
      success: true, 
      message: "Payment verified and booking confirmed",
      booking,
      commissionDeducted: commissionValue,
      artistCredited: artistNetCredit
    });
  } catch (err) {
    console.error("Planner verifyArtistBookingPayment error:", err);
    return res.status(500).json({ success: false, message: err.message });
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

export const listMyWithdrawalRequests = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const requests = await WithdrawalRequest.find({ userId: userId, userType: "planner" })
      .populate("transactionId")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: requests.length, requests });
  } catch (err) {
    console.error("Error listing withdrawal requests:", err);
    return res.status(500).json({ success: false, message: "Failed to list withdrawal requests" });
  }
};

/**
 * Get Dashboard Revenue Data (Calculated from DB)
 */
export const getDashboardRevenue = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    // Calculate revenue from completed credit transactions in the last 7 months
    const sevenMonthsAgo = new Date();
    sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 6);
    sevenMonthsAgo.setDate(1);
    sevenMonthsAgo.setHours(0, 0, 0, 0);

    const revenueData = await WalletTransaction.aggregate([
      {
        $match: {
          ownerId: new mongoose.Types.ObjectId(userId),
          ownerType: "planner",
          type: "credit",
          status: "completed",
          createdAt: { $gte: sevenMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" }
          },
          revenue: { $sum: "$amount" },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize last 7 months with 0
    const formattedData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthIndex = d.getMonth();
      const year = d.getFullYear();
      
      const match = revenueData.find(item => item._id.month === (monthIndex + 1) && item._id.year === year);
      
      formattedData.push({
        name: months[monthIndex],
        revenue: match ? match.revenue : 0,
        bookings: match ? match.bookings : 0
      });
    }

    res.status(200).json({ success: true, data: formattedData });
  } catch (error) {
    console.error("Error fetching dashboard revenue:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Get Dashboard Ticket Distribution Data (Calculated from DB)
 */
export const getDashboardTicketDistribution = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const plannerProfile = await PlannerProfile.findOne({ userId });
    if (!plannerProfile) return res.status(404).json({ success: false, message: "Planner profile not found" });

    const events = await Event.find({ plannerProfileId: plannerProfile._id });
    const eventIds = events.map(e => e._id);

    const distribution = await TicketType.aggregate([
      { $match: { eventId: { $in: eventIds } } },
      {
        $group: {
          _id: "$title",
          value: { $sum: "$sold" }
        }
      }
    ]);

    const colors = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#6366F1'];
    const formattedData = distribution.map((item, index) => ({
      name: item._id,
      value: item.value,
      color: colors[index % colors.length]
    }));

    res.status(200).json({ success: true, data: formattedData });
  } catch (error) {
    console.error("Error fetching dashboard ticket distribution:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Get Dashboard Recent Events Data (Calculated from DB)
 */
export const getDashboardRecentEvents = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const plannerProfile = await PlannerProfile.findOne({ userId });
    if (!plannerProfile) return res.status(404).json({ success: false, message: "Planner profile not found" });

    const events = await Event.find({ plannerProfileId: plannerProfile._id })
      .sort({ createdAt: -1 })
      .limit(5);

    const formattedEvents = await Promise.all(events.map(async (event) => {
      const ticketTypes = await TicketType.find({ eventId: event._id });
      const totalSold = ticketTypes.reduce((sum, t) => sum + (t.sold || 0), 0);
      const totalQty = ticketTypes.reduce((sum, t) => sum + (t.quantity || 0), 0) || 1; // Avoid division by zero
      
      let status = "Upcoming";
      const now = new Date();
      if (event.endAt < now) {
        status = "Completed";
      } else if (event.startAt <= now && event.endAt >= now) {
        status = "Ongoing";
      } else if (totalSold > 0) {
        status = "Registration Open";
      }

      return {
        id: event._id,
        title: event.title,
        date: event.startAt ? event.startAt.toISOString().split('T')[0] : 'N/A',
        venue: event.venue || 'N/A',
        status: status,
        progress: Math.round((totalSold / totalQty) * 100)
      };
    }));

    res.status(200).json({ success: true, data: formattedEvents });
  } catch (error) {
    console.error("Error fetching dashboard recent events:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Get Dashboard Summary Metrics
 */
export const getDashboardMetrics = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const plannerProfile = await PlannerProfile.findOne({ userId });
    if (!plannerProfile) return res.status(404).json({ success: false, message: "Planner profile not found" });

    const now = new Date();

    // 1. Total Revenue
    const revenueResult = await WalletTransaction.aggregate([
      {
        $match: {
          ownerId: new mongoose.Types.ObjectId(userId),
          ownerType: "planner",
          type: "credit",
          status: "completed"
        }
      },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // 2. Tickets Sold & Entry Rate Data
    const events = await Event.find({ plannerProfileId: plannerProfile._id });
    const eventIds = events.map(e => e._id);

    const ticketStats = await TicketType.aggregate([
      { $match: { eventId: { $in: eventIds } } },
      { $group: { _id: null, totalSold: { $sum: "$sold" } } }
    ]);
    const totalTicketsSold = ticketStats[0]?.totalSold || 0;

    // 3. Active Events
    const activeEventsCount = await Event.countDocuments({
      plannerProfileId: plannerProfile._id,
      endAt: { $gt: now }
    });

    // 4. Entry Rate (Scanned Persons / Total Persons on Issued Tickets)
    const scanStats = await Ticket.aggregate([
      { $match: { eventId: { $in: eventIds } } },
      {
        $group: {
          _id: null,
          totalPersons: { $sum: "$persons" },
          totalScanned: { $sum: "$scannedPersons" }
        }
      }
    ]);
    const totalPersons = scanStats[0]?.totalPersons || 0;
    const totalScanned = scanStats[0]?.totalScanned || 0;
    const entryRate = totalPersons > 0 ? (totalScanned / totalPersons) * 100 : 0;

    // Format for Frontend
    const metrics = [
      { 
        label: 'Total Revenue', 
        value: `₹${totalRevenue.toLocaleString('en-IN')}`, 
        change: '', // Can be calculated by comparing last month if needed
        icon: 'DollarSign', 
        color: 'text-emerald-500', 
        bg: 'bg-emerald-500/10' 
      },
      { 
        label: 'Tickets Sold', 
        value: totalTicketsSold.toLocaleString('en-IN'), 
        change: '', 
        icon: 'Ticket', 
        color: 'text-violet-500', 
        bg: 'bg-violet-500/10' 
      },
      { 
        label: 'Active Events', 
        value: activeEventsCount.toString(), 
        change: '', 
        icon: 'Calendar', 
        color: 'text-blue-500', 
        bg: 'bg-blue-500/10' 
      },
      { 
        label: 'Entry Rate', 
        value: `${entryRate.toFixed(1)}%`, 
        change: '', 
        icon: 'Zap', 
        color: 'text-amber-500', 
        bg: 'bg-amber-500/10' 
      },
    ];

    res.status(200).json({ success: true, data: metrics });
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get Artist Price (Planner)
export const getArtistPrice = async (req, res) => {
  try {
    const { artistId } = req.params;
    const { serviceId, startDate, endDate } = req.query;

    if (!artistId || !serviceId || !startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: "artistId, serviceId, startDate, and endDate are required" 
      });
    }

    if (!mongoose.Types.ObjectId.isValid(artistId) || !mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ success: false, message: "Invalid artist or service ID format" });
    }

    const artist = await Artist.findById(artistId);
    if (!artist) {
      return res.status(404).json({ success: false, message: "Artist not found" });
    }

    const service = await Service.findOne({ _id: serviceId, artistId: artistId });
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found for this artist" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date format" });
    }

    if (end <= start) {
      return res.status(400).json({ success: false, message: "endDate must be after startDate" });
    }

    // Check availability
    const conflictingBookings = await Booking.find({
      artistId: artistId,
      status: { $in: ["pending", "confirmed"] },
      $or: [
        { startAt: { $lt: end }, endAt: { $gt: start } }
      ]
    });

    const conflictingBlocks = await CalendarBlock.find({
      artistId: artistId,
      $or: [
        { startDate: { $lt: end }, endDate: { $gt: start } }
      ]
    });

    const isAvailable = conflictingBookings.length === 0 && conflictingBlocks.length === 0;

    // Use planner-specific pricing
    const basePrice = service.price_for_planner || 0;
    if (basePrice <= 0) {
      return res.status(400).json({ success: false, message: "Planner price is not set for this service" });
    }

    let price = basePrice;
    let calculatedAdvance = (service.advance || 0); // Assuming fixed or unit-based advance for now
    const diffMs = end - start;

    if (service.unit === "hour") {
      const hours = Math.ceil(diffMs / (1000 * 60 * 60));
      price = basePrice * hours;
      calculatedAdvance = (service.advance || 0) * hours;
    } else if (service.unit === "day") {
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      price = basePrice * days;
      calculatedAdvance = (service.advance || 0) * days;
    } else if (service.unit === "event") {
      price = basePrice;
      calculatedAdvance = service.advance || 0;
    }

    return res.status(200).json({
      success: true,
      available: isAvailable,
      price: Math.round(price * 100) / 100,
      unit: service.unit,
      basePrice: basePrice,
      advance: Math.round(calculatedAdvance * 100) / 100,
      duration: {
        start: start.toISOString(),
        end: end.toISOString(),
        milliseconds: diffMs
      }
    });
  } catch (err) {
    console.error("Planner getArtistPrice error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get Booked Artists
export const getBookedArtists = async (req, res) => {
  try {
    const plannerUserId = req.user?.id || req.user?.userId;
    if (!plannerUserId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const bookings = await Booking.find({ clientId: plannerUserId })
      .select("status paymentStatus totalPrice startAt endAt eventName bookingId createdAt")
      .populate({
        path: "artistId",
        select: "userId category location profileImage",
        populate: {
          path: "userId",
          select: "displayName"
        }
      })
      .populate("serviceId", "category unit")
      .populate("eventId", "title")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: bookings.length, bookings });
  } catch (err) {
    console.error("Planner getBookedArtists error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get Booking Details
export const getBookingDetails = async (req, res) => {
  try {
    const plannerUserId = req.user?.id || req.user?.userId;
    if (!plannerUserId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID format" });
    }

    const booking = await Booking.findOne({ _id: id, clientId: plannerUserId })
      .populate({
        path: "artistId",
        select: "userId bio category location profileImage",
        populate: {
          path: "userId",
          select: "displayName email phone countryCode"
        }
      })
      .populate("serviceId", "category unit price_for_planner")
      .populate("eventId", "title startAt endAt venue address city state");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    return res.status(200).json({ success: true, booking });
  } catch (err) {
    console.error("Planner getBookingDetails error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
