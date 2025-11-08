import Booking from "../models/Booking.js";
import CalendarBlock from "../models/CalendarBlock.js";

export const createOfflineBooking = async (req, res) => {
  try {
    const { artistProfileId, serviceId, startAt, endAt, totalPrice, notes } = req.body;

    const newBooking = new Booking({
      artistProfileId,
      serviceId,
      startAt,
      endAt,
      totalPrice,
      notes,
      source: "offline",
      status: "confirmed", 
      paymentStatus: "unpaid", 
    });

    const savedBooking = await newBooking.save();

    // Create a calendar block for the offline booking
    const newCalendarBlock = new CalendarBlock({
      artistProfileId: savedBooking.artistProfileId,
      startDate: savedBooking.startAt,
      endDate: savedBooking.endAt,
      type: "offlineBooking",
      title: `Offline Booking for ${savedBooking._id}`,
      linkedBookingId: savedBooking._id,
      createdBy: req.user.userId, // Assuming user ID is available from verifyToken middleware
    });
    await newCalendarBlock.save();

    res.status(201).json({ success: true, message: "Offline booking created successfully", booking: savedBooking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({}).populate("artistProfileId clientId serviceId eventId");
    res.status(200).json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
