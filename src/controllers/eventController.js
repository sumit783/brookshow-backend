import Event from "../models/Event.js";
import PlannerProfile from "../models/PlannerProfile.js";
import MediaItem from "../models/MediaItem.js";
import TicketType from "../models/TicketType.js";

async function getPlannerProfileIdForUser(userId) {
  const profile = await PlannerProfile.findOne({ userId }).select("_id");
  return profile?._id || null;
}

export const createEvent = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const plannerProfileId = await getPlannerProfileIdForUser(userId);
    if (!plannerProfileId) return res.status(404).json({ message: "Planner profile not found" });

    const { title, description, venue, address, city, state, lat, lng, startAt, endAt, published } = req.body;
    if (!title) return res.status(400).json({ message: "title is required" });

    const event = await Event.create({
      plannerProfileId,
      title,
      description,
      venue,
      address,
      city,
      state,
      lat,
      lng,
      startAt,
      endAt,
      published: Boolean(published)
    });

    let bannerUrl = "";
    if (req.file) {
      const media = await MediaItem.create({
        ownerType: "event",
        ownerId: event._id,
        type: "image",
        url: "/uploads/" + req.file.filename,
        isCover: true,
      });
      bannerUrl = media.url;
    }

    return res.status(201).json({ message: "Event created", event, bannerUrl });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const listEvents = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const plannerProfileId = await getPlannerProfileIdForUser(userId);
    if (!plannerProfileId) return res.status(404).json({ message: "Planner profile not found" });

    const events = await Event.find({ plannerProfileId }).sort({ createdAt: -1 }).lean();
    const ids = events.map(e => e._id);
    const covers = await MediaItem.find({ ownerType: "event", ownerId: { $in: ids }, isCover: true }).lean();
    const idToBanner = new Map(covers.map(c => [String(c.ownerId), c.url]));

    const ticketTypes = await TicketType.find({ eventId: { $in: ids } }).lean();
    const eventIdToTickets = {};
    ticketTypes.forEach(ticket => {
      const eId = String(ticket.eventId);
      if (!eventIdToTickets[eId]) {
        eventIdToTickets[eId] = [];
      }
      eventIdToTickets[eId].push({
        id: ticket._id,
        eventId: ticket.eventId,
        title: ticket.title,
        price: ticket.price,
        quantity: ticket.quantity,
        sold: ticket.sold,
      });
    });

    const withBanners = events.map(e => ({
      ...e,
      bannerUrl: idToBanner.get(String(e._id)) || "",
      ticketData: eventIdToTickets[String(e._id)] || []
    }));
    return res.status(200).json({ events: withBanners });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getEventById = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const plannerProfileId = await getPlannerProfileIdForUser(userId);
    if (!plannerProfileId) return res.status(404).json({ message: "Planner profile not found" });

    const { id } = req.params;
    const event = await Event.findOne({ _id: id, plannerProfileId }).lean();
    if (!event) return res.status(404).json({ message: "Event not found" });
    const cover = await MediaItem.findOne({ ownerType: "event", ownerId: event._id, isCover: true }).lean();

    const ticketTypes = await TicketType.find({ eventId: event._id }).lean();
    const ticketData = ticketTypes.map(ticket => ({
      id: ticket._id,
      eventId: ticket.eventId,
      title: ticket.title,
      price: ticket.price,
      quantity: ticket.quantity,
      sold: ticket.sold,
    }));

    return res.status(200).json({ event: { ...event, bannerUrl: cover?.url || "", ticketData } });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
export const getEventAndId = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const plannerProfileId = await getPlannerProfileIdForUser(userId);
    if (!plannerProfileId) return res.status(404).json({ message: "Planner profile not found" });
    const events = await Event.find({ plannerProfileId }).select("_id title").lean();
    if (!events) return res.status(404).json({ message: "Events not found" });
    return res.status(200).json({ events: events.map(e => ({ id: e._id, title: e.title })) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const plannerProfileId = await getPlannerProfileIdForUser(userId);
    if (!plannerProfileId) return res.status(404).json({ message: "Planner profile not found" });

    const { id } = req.params;
    const updates = { ...req.body };
    const event = await Event.findOneAndUpdate(
      { _id: id, plannerProfileId },
      updates,
      { new: true }
    );
    if (!event) return res.status(404).json({ message: "Event not found" });

    let bannerUrl = "";
    if (req.file) {
      await MediaItem.updateMany({ ownerType: "event", ownerId: event._id, isCover: true }, { $set: { isCover: false } });
      const media = await MediaItem.create({
        ownerType: "event",
        ownerId: event._id,
        type: "image",
        url: "/uploads/" + req.file.filename,
        isCover: true,
      });
      bannerUrl = media.url;
    } else {
      const cover = await MediaItem.findOne({ ownerType: "event", ownerId: event._id, isCover: true }).lean();
      bannerUrl = cover?.url || "";
    }

    return res.status(200).json({ message: "Event updated", event, bannerUrl });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const plannerProfileId = await getPlannerProfileIdForUser(userId);
    if (!plannerProfileId) return res.status(404).json({ message: "Planner profile not found" });

    const { id } = req.params;
    const deleted = await Event.findOneAndDelete({ _id: id, plannerProfileId });
    if (!deleted) return res.status(404).json({ message: "Event not found" });
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
