import Commission from "../models/Commission.js";

export const getCommission = async (req, res) => {
  try {
    let commission = await Commission.findOne().sort({ createdAt: -1 });
    if (!commission) {
      commission = await Commission.create({
        artistBookingCommission: 10,
        ticketSellCommission: 5,
        offlineTicketCommission: 5,
      });
    }
    res.status(200).json({ success: true, commission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCommission = async (req, res) => {
  try {
    const { artistBookingCommission, ticketSellCommission, offlineTicketCommission } = req.body;
    
    const newCommission = new Commission({
      artistBookingCommission: Number(artistBookingCommission) || 0,
      ticketSellCommission: Number(ticketSellCommission) || 0,
      offlineTicketCommission: Number(offlineTicketCommission) || 0,
    });

    await newCommission.save();
    res.status(201).json({ success: true, commission: newCommission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCommission = async (req, res) => {
  try {
    const { id } = req.params;
    const { artistBookingCommission, ticketSellCommission, offlineTicketCommission } = req.body;

    const updateData = {};
    if (artistBookingCommission !== undefined) updateData.artistBookingCommission = Number(artistBookingCommission);
    if (ticketSellCommission !== undefined) updateData.ticketSellCommission = Number(ticketSellCommission);
    if (offlineTicketCommission !== undefined) updateData.offlineTicketCommission = Number(offlineTicketCommission);

    const commission = await Commission.findByIdAndUpdate(
      id,
      updateData,
      { new: true, upsert: true }
    );

    if (!commission) {
      return res.status(404).json({ success: false, message: "Commission not found" });
    }

    res.status(200).json({ success: true, commission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCommission = async (req, res) => {
  try {
    const { id } = req.params;
    const commission = await Commission.findByIdAndDelete(id);

    if (!commission) {
      return res.status(404).json({ success: false, message: "Commission not found" });
    }

    res.status(200).json({ success: true, message: "Commission deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
