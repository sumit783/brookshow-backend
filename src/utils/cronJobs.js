import Event from "../models/Event.js";
import Ticket from "../models/Ticket.js";

/**
 * Checks for events that have passed their end date and:
 * 1. Unpublishes them.
 * 2. Invalidates all associated tickets.
 */
export const expirePastEvents = async () => {
  try {
    const now = new Date();

    // 1. Find and update events
    const expiredEvents = await Event.find({
      endAt: { $lt: now },
      published: true,
    });

    if (expiredEvents.length > 0) {
      console.log(`🕒 Found ${expiredEvents.length} expired events. Expiring now...`);

      for (const event of expiredEvents) {
        // Unpublish the event
        event.published = false;
        await event.save();

        // 2. Invalidate all tickets for this event
        const result = await Ticket.updateMany(
          { eventId: event._id, isValide: true },
          { isValide: false }
        );

        console.log(`✅ Event "${event.title}" expired. ${result.modifiedCount} tickets invalidated.`);
      }
    }
  } catch (error) {
    console.error("❌ Error in expirePastEvents job:", error.message);
  }
};

/**
 * Initializes the background jobs.
 */
export const initCronJobs = () => {
  console.log("⏲Initializing background jobs...");
  
  // Run once on startup
  expirePastEvents();

  // Run every hour (3600000 ms)
  setInterval(expirePastEvents, 3600000);
};
