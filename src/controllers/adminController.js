import Artist from "../models/Artist.js";
import PlannerProfile from "../models/PlannerProfile.js";
import Event from "../models/Event.js";
import TicketType from "../models/TicketType.js";
import Booking from "../models/Booking.js";
import WalletTransaction from "../models/WalletTransaction.js";
import Ticket from "../models/Ticket.js";
import MediaItem from "../models/MediaItem.js";
import WithdrawalRequest from "../models/WithdrawalRequest.js";

export const getAllArtists = async (req, res) => {
  try {
    const artists = await Artist.find()
      .populate("userId", "displayName email phone")
      .select("profileImage category location verificationStatus isVerified");

    return res.status(200).json(artists);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

export const getAllPlanners = async (req, res) => {
  try {
    const planners = await PlannerProfile.find()
      .populate("userId", "displayName email phone role")
      .lean();

    const formattedPlanners = planners.map((planner) => {
      return {
        _id: planner._id,
        userId: planner.userId,
        // Map logoUrl to profileImage as requested
        profileImage: planner.logoUrl || "",
        // Planner doesn't have location/category in model, return defaults/empty to match structu
        // Map verified to status fields
        verificationStatus: planner.verified ? "verified" : "pending",
        isVerified: planner.verified,
        organization: planner.organization // Include actual planner field too
      };
    });

    return res.status(200).json(formattedPlanners);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

export const getPlannerById = async (req, res) => {
  try {
    const { id } = req.params;
    const planner = await PlannerProfile.findById(id)
      .populate("userId", "displayName email phone role")
      .lean();

    if (!planner) {
      return res.status(404).json({ message: "Planner not found" });
    }

    // Get events for this planner
    const events = await Event.find({ plannerProfileId: id }).sort({ startAt: -1 }).lean();

    // Get ticket types for each event
    const eventsWithTickets = await Promise.all(
      events.map(async (event) => {
        const ticketTypes = await TicketType.find({ eventId: event._id }).lean();
        return {
          ...event,
          ticketTypes
        };
      })
    );

    const result = {
      ...planner,
      // Map same fields as getAllPlanners for consistency
      profileImage: planner.logoUrl || "",
      location: {
        city: "",
        state: "",
        country: ""
      },
      category: [],
      verificationStatus: planner.verified ? "verified" : "pending",
      isVerified: planner.verified,
      events: eventsWithTickets
    };

    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};



export const getArtistById = async (req, res) => {
  try {
    const { id } = req.params;
    const artist = await Artist.findById(id)
      .populate("userId", "displayName email phone")
      .populate("bookings");

    if (!artist) {
      return res.status(404).json({ message: "Artist not found" });
    }

    return res.status(200).json(artist);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

export const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find().sort({ createdAt: -1 }).lean();

    const formattedEvents = await Promise.all(
      events.map(async (event) => {
        // Get ticket stats
        const ticketTypes = await TicketType.find({ eventId: event._id }).lean();
        let capacity = 0;
        let ticketsSold = 0;
        let minPrice = Infinity;

        if (ticketTypes.length > 0) {
          ticketTypes.forEach((tt) => {
            capacity += tt.quantity || 0;
            ticketsSold += tt.sold || 0;
            if (tt.price < minPrice) minPrice = tt.price;
          });
        } else {
          minPrice = 0;
        }

        if (minPrice === Infinity) minPrice = 0;

        // Get artist stats
        const artistsBookedCount = await Booking.countDocuments({
          eventId: event._id,
          status: { $in: ["confirmed", "completed"] },
        });

        const status = event.published ? "active" : "draft";

        // Get Event Image
        const media = await MediaItem.findOne({ ownerId: event._id, ownerType: "event", type: "image" }).sort({ isCover: -1 });
        const imageUrl = media ? media.url : "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=200&fit=crop";

        return {
          id: event._id,
          name: event.title,
          venue: `${event.venue || ""} ${event.city ? ", " + event.city : ""}`.trim(),
          date: event.startAt,
          time: event.startAt, // Client can format time from Date
          capacity,
          ticketsSold,
          artistsBooked: artistsBookedCount,
          status,
          image: imageUrl,
          price: minPrice,
        };
      })
    );

    return res.status(200).json(formattedEvents);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id).lean();
    if (!event) return res.status(404).json({ message: "Event not found" });

    const ticketTypes = await TicketType.find({ eventId: id }).lean();

    // Get Event Banner
    const media = await MediaItem.findOne({ ownerId: id, ownerType: "event", type: "image" }).sort({ isCover: -1 });
    const banner = media ? media.url : "";

    return res.status(200).json({ ...event, ticketTypes, banner });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

export const getAllTransactions = async (req, res) => {
  try {
    const transactions = await WalletTransaction.find().sort({ createdAt: -1 });
    return res.status(200).json(transactions);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

export const getAllBookings = async (req, res) => {
  try {
    // 1. Fetch Artist Bookings
    const artistBookingsPromise = Booking.find()
      .populate("clientId", "displayName email")
      .populate({
        path: "artistId",
        select: "userId",
        populate: { path: "userId", select: "displayName" }
      })
      .populate("eventId", "title startAt")
      .populate("serviceId", "category")
      .lean();

    // 2. Fetch Event Tickets
    const ticketsPromise = Ticket.find()
      .populate("userId", "displayName email")
      .populate("eventId", "title startAt plannerProfileId")
      .populate("ticketTypeId", "title price")
      .populate("eventId.plannerProfileId", "userId")
      .populate("eventId.plannerProfileId.userId", "displayName")
      .lean();

    const [artistBookings, tickets] = await Promise.all([artistBookingsPromise, ticketsPromise]);

    // 3. Map Artist Bookings to Interface
    const mappedArtistBookings = artistBookings.map((b) => ({
      id: b._id,
      customerName: b.clientId?.displayName || "Unknown User",
      eventName: b.eventId?.title || "Private Booking",
      artistName: b.artistId?.userId?.displayName || "N/A",
      type: "Artist Booking",
      service: b.serviceId?.category || "N/A",
      quantity: "N/A",
      totalAmount: b.totalPrice || 0,
      advance: b.advanceAmount || 0,
      bookingDate: b.createdAt,
      bookingType: "artist",
    }));

    // 4. Map Tickets to Interface
    const mappedTickets = tickets.map((t) => ({
      id: t._id,
      customerName: t.buyerName || t.userId?.displayName || "Unknown Guest",
      eventName: t.eventId?.title || "Unknown Event",
      artistName: t.eventId?.plannerProfileId?.userId?.displayName || "N/A",
      type: "Event Ticket",
      service: t.ticketTypeId?.title || "Standard",
      quantity: t.persons || 1,
      totalAmount: (t.ticketTypeId?.price || 0) * (t.persons || 1),
      advance: (t.ticketTypeId?.price || 0) * (t.persons || 1),
      bookingDate: t.createdAt,
      bookingType: "ticket",
    }));

    // 5. Merge and Sort
    const allBookings = [...mappedArtistBookings, ...mappedTickets].sort((a, b) => {
      const dateA = new Date(a.bookingDate);
      const dateB = new Date(b.bookingDate);
      return dateB - dateA; // Descending
    });

    return res.status(200).json(allBookings);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

export const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    // Try finding in Booking (Artist Booking)
    const booking = await Booking.findById(id)
      .populate("clientId", "displayName email phone")
      .populate({
        path: "artistId",
        select: "userId profileImage",
        populate: { path: "userId", select: "displayName email phone" },
      })
      .populate("eventId", "title startAt output")
      .populate("serviceId", "category unit advance")
      .lean();

    if (booking) {
      return res.status(200).json({ ...booking, type: "artist_booking" });
    }

    // Try finding in Ticket (Event Ticket)
    const ticket = await Ticket.findById(id)
      .populate("userId", "displayName email phone")
      .populate({
        path: "eventId",
        select: "title startAt venue plannerProfileId",
        populate: {
          path: "plannerProfileId",
          select: "userId organization logoUrl",
          populate: {
            path: "userId",
            select: "displayName email phone"
          }
        }
      })
      .populate("ticketTypeId", "title price")
      .lean();

    if (ticket) {
      return res.status(200).json({ ...ticket, type: "event_ticket" });
    }

    return res.status(404).json({ message: "Booking not found" });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

export const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await WalletTransaction.findById(id);
    if (!transaction) return res.status(404).json({ message: "Transaction not found" });
    return res.status(200).json(transaction);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    // 1. Total Artists
    const totalArtists = await Artist.countDocuments();
    const pendingArtists = await Artist.countDocuments({ verificationStatus: "pending" });

    // 2. Active Events
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const totalEvents = await Event.countDocuments({ published: true });
    const upcomingEvents = await Event.countDocuments({ startAt: { $gte: now, $lte: nextWeek } });

    // 3. Total Bookings (Artist Bookings + Tickets Sold)
    const bookingsCount = await Booking.countDocuments();
    const ticketsCount = await Ticket.countDocuments();
    const totalBookings = bookingsCount + ticketsCount;

    // Monthly bookings
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyBookings = await Booking.countDocuments({ createdAt: { $gte: startOfMonth } });
    const monthlyTickets = await Ticket.countDocuments({ createdAt: { $gte: startOfMonth } });
    const totalMonthly = monthlyBookings + monthlyTickets;

    // 4. Revenue
    // Calculate from Bookings (paid)
    const paidBookings = await Booking.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } }
    ]);
    const bookingRevenue = paidBookings[0]?.total || 0;

    // Calculate from Tickets (TicketType sold * price is simpler, but Ticket count * Type Price is more accurate if tracked)
    // We'll use TicketType sold * price for aggregate revenue as it's faster
    const ticketRevenueAgg = await TicketType.aggregate([
      { $group: { _id: null, total: { $sum: { $multiply: ["$sold", "$price"] } } } }
    ]);
    const ticketRevenue = ticketRevenueAgg[0]?.total || 0;

    const totalRevenue = bookingRevenue + ticketRevenue;

    // Pending Revenue (Pending Bookings)
    const pendingBookings = await Booking.aggregate([
      { $match: { paymentStatus: "unpaid", status: { $ne: "cancelled" } } }, // Assuming unpaid & not cancelled = pending money
      { $group: { _id: null, total: { $sum: "$totalPrice" } } }
    ]);
    const pendingRevenue = pendingBookings[0]?.total || 0;

    const formatCurrency = (amount) => {
      if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
      if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
      return `₹${amount.toLocaleString("en-IN")}`;
    };

    const stats = [
      {
        title: "Total Artists",
        value: totalArtists.toLocaleString("en-IN"),
        subtitle: `${pendingArtists} pending verification`,
        icon: "Users",
        variant: "default",
      },
      {
        title: "Active Events",
        value: totalEvents.toLocaleString("en-IN"),
        subtitle: `${upcomingEvents} upcoming this week`,
        icon: "Calendar",
        variant: "primary",
      },
      {
        title: "Total Bookings",
        value: totalBookings.toLocaleString("en-IN"),
        subtitle: `${totalMonthly} this month`,
        icon: "Ticket",
        variant: "accent",
      },
      {
        title: "Revenue",
        value: formatCurrency(totalRevenue),
        subtitle: `${formatCurrency(pendingRevenue)} pending`,
        icon: "IndianRupee",
        variant: "success",
      },
    ];

    return res.status(200).json(stats);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

export const getRevenueChartData = async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1); // Start of the month

    // Helper to initialize map for storing results (MonthName -> Data)
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const resultMap = new Map();

    // Initialize last 6 months in map
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - 5 + i);
      const mName = monthNames[d.getMonth()];
      resultMap.set(mName, { month: mName, revenue: 0, bookings: 0, order: i });
    }

    // 1. Aggregate Bookings (Artist Bookings)
    const bookingStats = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
          paymentStatus: "paid"
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" }, // 1-12
          totalRevenue: { $sum: "$totalPrice" },
          count: { $sum: 1 }
        }
      }
    ]);

    // 2. Aggregate Tickets
    // Note: This relies on Ticket having reference to TicketType and calculating price * persons
    const ticketStats = await Ticket.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
          isValide: true
        }
      },
      {
        $lookup: {
          from: "tickettypes",
          localField: "ticketTypeId",
          foreignField: "_id",
          as: "typeInfo"
        }
      },
      { $unwind: "$typeInfo" },
      {
        $group: {
          _id: { $month: "$createdAt" },
          totalRevenue: { $sum: { $multiply: ["$persons", "$typeInfo.price"] } },
          count: { $sum: 1 } // Counting ticket orders (not just persons)
        }
      }
    ]);

    // Function to populate map
    const updateMap = (stats, isTicket = false) => {
      stats.forEach(stat => {
        const mIndex = stat._id - 1; // Mongo month is 1-based, array 0-based
        const mName = monthNames[mIndex];
        if (resultMap.has(mName)) { // Only update if within our target range (should be due to match, but safe check)
          const data = resultMap.get(mName);
          if (data) {
            data.revenue += stat.totalRevenue || 0;
            data.bookings += stat.count || 0;
          }
        }
      });
    };

    updateMap(bookingStats);
    updateMap(ticketStats);

    // Convert map to array and sort
    const result = Array.from(resultMap.values()).sort((a, b) => a.order - b.order).map(({ order, ...rest }) => rest);

    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

export const getBookingStats = async (req, res) => {
  try {
    // 1. Ticket Bookings (Total valid tickets sold)
    // We count documents as "bookings" or sum persons? User said "ticket bookings". 
    // Usually means number of orders. I'll count Ticket documents.
    const ticketBookingsCount = await Ticket.countDocuments({ isValide: true });

    // 2. Artist Bookings (Total confirmed/completed bookings)
    const artistBookingsCount = await Booking.countDocuments({
      status: { $in: ["confirmed", "completed"] }
    });

    // 3. Total Revenue
    // Artist Bookings Revenue (Paid)
    const paidArtistBookings = await Booking.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } }
    ]);
    const artistRevenue = paidArtistBookings[0]?.total || 0;

    // Ticket Revenue
    // Need to join with TicketType to get price
    const ticketRevenueAgg = await Ticket.aggregate([
      { $match: { isValide: true } },
      {
        $lookup: {
          from: "tickettypes",
          localField: "ticketTypeId",
          foreignField: "_id",
          as: "typeInfo"
        }
      },
      { $unwind: "$typeInfo" },
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ["$persons", "$typeInfo.price"] } }
        }
      }
    ]);
    const ticketRevenue = ticketRevenueAgg[0]?.total || 0;
    const totalRevenue = artistRevenue + ticketRevenue;

    // 4. This Month Bookings (Combined count)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthArtistBookings = await Booking.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    const monthTicketBookings = await Ticket.countDocuments({
      createdAt: { $gte: startOfMonth }
    });
    const totalMonthBookings = monthArtistBookings + monthTicketBookings;

    const formatCurrency = (amount) => {
      // Basic formatting, client might handle locale better but API returns string as requested
      return `₹${amount.toLocaleString("en-IN")}`;
    };

    const stats = [
      {
        title: "Ticket Bookings",
        value: ticketBookingsCount,
        icon: "Ticket",
        subtitle: "Total Ticket Bookings",
        variant: "default"
      },
      {
        title: "Artist Bookings",
        value: artistBookingsCount,
        icon: "Mic2", // Using Mic2 as likely icon for Artist
        subtitle: "Total Artist Bookings",
        variant: "primary"
      },
      {
        title: "Total Revenue",
        value: formatCurrency(totalRevenue),
        icon: "IndianRupee",
        subtitle: "Total Revenue",
        variant: "success"
      },
      {
        title: "This Month Bookings",
        value: totalMonthBookings,
        subtitle: "Since start of month",
        icon: "Calendar",
        variant: "accent"
      }
    ];

    return res.status(200).json(stats);

  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};


export const getBookingTrends = async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const resultMap = new Map();

    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - 5 + i);
      const mName = monthNames[d.getMonth()];
      resultMap.set(mName, { month: mName, tickets: 0, artists: 0, order: i });
    }

    // 1. Aggregate Artist Bookings
    const bookingStats = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 }
        }
      }
    ]);

    // 2. Aggregate Tickets
    // Note: Counting ticket orders (Ticket documents), matching the 'tickets' label in request
    // If user meant 'quantity' of tickets, we'd sum 'persons'. Assuming document count for consistency with logic.
    // Re-reading user request: "tickets: 320" implies quantity likely, but could be orders.
    // In previous tasks I used document count for "Bookings" mixing both.
    // Let's stick to document count for now unless requested, or maybe sum persons?
    // "tickets: 320" vs "artists: 45". 
    // Usually 'tickets' implies volume. I will sum 'persons' for tickets to make the number higher/more realistic for "tickets sold".
    const ticketStats = await Ticket.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
          isValide: true
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: "$persons" } // Summing persons to reflect tickets sold
        }
      }
    ]);

    bookingStats.forEach(stat => {
      const mIndex = stat._id - 1;
      const mName = monthNames[mIndex];
      if (resultMap.has(mName)) {
        resultMap.get(mName).artists += stat.count || 0;
      }
    });

    ticketStats.forEach(stat => {
      const mIndex = stat._id - 1;
      const mName = monthNames[mIndex];
      if (resultMap.has(mName)) {
        resultMap.get(mName).tickets += stat.count || 0;
      }
    });

    const result = Array.from(resultMap.values()).sort((a, b) => a.order - b.order).map(({ order, ...rest }) => rest);

    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

export const verifyArtist = async (req, res) => {
  try {
    const { id } = req.params;
    const artist = await Artist.findByIdAndUpdate(
      id,
      { isVerified: true },
      { new: true }
    );
    if (!artist) return res.status(404).json({ message: "Artist not found" });
    return res.status(200).json({ message: "Artist verified", artist });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

export const rejectArtist = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: "Rejection message is required" });
    const artist = await Artist.findByIdAndUpdate(
      id,
      { isVerified: false, verificationNote: message || "" },
      { new: true }
    );
    if (!artist) return res.status(404).json({ message: "Artist not found" });
    return res.status(200).json({ message: "Artist rejected", artist });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

export const verifyPlanner = async (req, res) => {
  try {
    const { id } = req.params;
    const planner = await PlannerProfile.findByIdAndUpdate(
      id,
      { verified: true },
      { new: true }
    );
    if (!planner) return res.status(404).json({ message: "Planner profile not found" });
    return res.status(200).json({ message: "Planner verified", planner });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

export const rejectPlanner = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: "Rejection message is required" });
    const planner = await PlannerProfile.findByIdAndUpdate(
      id,
      { verified: false, verificationNote: message },
      { new: true }
    );
    if (!planner) return res.status(404).json({ message: "Planner profile not found" });
    return res.status(200).json({ message: "Planner rejected", planner });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

export const getAllWithdrawalRequests = async (req, res) => {
  try {
    const requests = await WithdrawalRequest.find()
      .populate("userId", "displayName")
      .sort({ createdAt: -1 });
    return res.status(200).json(requests);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

export const getWithdrawalRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await WithdrawalRequest.findById(id)
      .populate("userId", "displayName email phone role")
      .populate("transactionId");

    if (!request) {
      return res.status(404).json({ message: "Withdrawal request not found" });
    }

    return res.status(200).json(request);
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};

export const updateWithdrawalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (!["processed", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Use 'processed' or 'rejected'." });
    }

    if (status === "rejected" && !adminNotes) {
      return res.status(400).json({ message: "Admin note is compulsory when rejecting a request." });
    }

    const request = await WithdrawalRequest.findById(id);

    if (!request) {
      return res.status(404).json({ message: "Withdrawal request not found" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ message: `Request is already ${request.status}.` });
    }

    request.status = status;
    if (adminNotes) {
      request.adminNotes = adminNotes;
    }

    await request.save();

    // Update Wallet Transaction
    if (request.transactionId) {
      const transactionStatus = status === "processed" ? "completed" : "failed";
      await WalletTransaction.findByIdAndUpdate(request.transactionId, { status: transactionStatus });
    }

    // Refund if rejected
    if (status === "rejected") {
      if (request.userType === "planner") {
        await PlannerProfile.findOneAndUpdate(
          { userId: request.userId },
          { $inc: { walletBalance: request.amount } }
        );
      } else if (request.userType === "artist") {
        // Checking Artist model structure from previous views
        await Artist.findOneAndUpdate(
          { userId: request.userId },
          { $inc: { "wallet.balance": request.amount } }
        );
      }
    }

    return res.status(200).json({ message: `Withdrawal request ${status} successfully`, request });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
};
