import TicketType from "../models/TicketType.js";
import Event from "../models/Event.js";
import PlannerProfile from "../models/PlannerProfile.js";

async function getPlannerProfileIdForUser(userId) {
  const profile = await PlannerProfile.findOne({ userId }).select("_id");
  return profile?._id || null;
}

async function verifyEventOwnership(eventId, plannerProfileId) {
  const event = await Event.findOne({ _id: eventId, plannerProfileId });
  return !!event;
}

export const createTicketType = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const plannerProfileId = await getPlannerProfileIdForUser(userId);
    if (!plannerProfileId) return res.status(404).json({ message: "Planner profile not found" });

    const { eventId, title, price, quantity, salesStart, salesEnd } = req.body;
    if (!eventId || !title || price === undefined || quantity === undefined) {
      return res.status(400).json({ message: "eventId, title, price, and quantity are required" });
    }

    const isOwner = await verifyEventOwnership(eventId, plannerProfileId);
    if (!isOwner) return res.status(403).json({ message: "You don't own this event" });

    const ticket = await TicketType.create({
      eventId,
      title,
      price,
      quantity,
      salesStart,
      salesEnd,
      sold: 0,
    });

    return res.status(201).json({ message: "Ticket type created", ticket });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const listTicketTypes = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const plannerProfileId = await getPlannerProfileIdForUser(userId);
    if (!plannerProfileId) return res.status(404).json({ message: "Planner profile not found" });

    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ message: "eventId query parameter is required" });

    const isOwner = await verifyEventOwnership(eventId, plannerProfileId);
    if (!isOwner) return res.status(403).json({ message: "You don't own this event" });

    const tickets = await TicketType.find({ eventId }).sort({ createdAt: -1 });
    return res.status(200).json({ tickets });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getTicketTypeById = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const plannerProfileId = await getPlannerProfileIdForUser(userId);
    if (!plannerProfileId) return res.status(404).json({ message: "Planner profile not found" });

    const { id } = req.params;
    const ticket = await TicketType.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket type not found" });

    const isOwner = await verifyEventOwnership(ticket.eventId, plannerProfileId);
    if (!isOwner) return res.status(403).json({ message: "You don't own this ticket's event" });

    return res.status(200).json({ ticket });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const updateTicketType = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const plannerProfileId = await getPlannerProfileIdForUser(userId);
    if (!plannerProfileId) return res.status(404).json({ message: "Planner profile not found" });

    const { id } = req.params;
    const ticket = await TicketType.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket type not found" });

    const isOwner = await verifyEventOwnership(ticket.eventId, plannerProfileId);
    if (!isOwner) return res.status(403).json({ message: "You don't own this ticket's event" });

    const updates = { ...req.body };
    // Prevent updating sold count directly
    if (updates.sold !== undefined) delete updates.sold;

    const updatedTicket = await TicketType.findByIdAndUpdate(id, updates, { new: true });
    return res.status(200).json({ message: "Ticket type updated", ticket: updatedTicket });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const deleteTicketType = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const plannerProfileId = await getPlannerProfileIdForUser(userId);
    if (!plannerProfileId) return res.status(404).json({ message: "Planner profile not found" });

    const { id } = req.params;
    const ticket = await TicketType.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket type not found" });

    const isOwner = await verifyEventOwnership(ticket.eventId, plannerProfileId);
    if (!isOwner) return res.status(403).json({ message: "You don't own this ticket's event" });

    await TicketType.findByIdAndDelete(id);
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

