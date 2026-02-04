import Commission from "../models/Commission.js";

export const getCommission = async (req, res) => {
  try {
    const commission = await Commission.findOne().sort({ createdAt: -1 });
    if (!commission) {
      return res.status(404).json({ success: false, message: "Commission settings not found" });
    }
    res.status(200).json({ success: true, commission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCommission = async (req, res) => {
  try {
    const { artistBookingCommission, ticketSellCommission } = req.body;
    
    const newCommission = new Commission({
      artistBookingCommission,
      ticketSellCommission,
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
    const { artistBookingCommission, ticketSellCommission } = req.body;

    const commission = await Commission.findByIdAndUpdate(
      id,
      { artistBookingCommission, ticketSellCommission },
      { new: true }
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
