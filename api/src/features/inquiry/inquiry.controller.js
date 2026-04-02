exports.createInquiry = async (req, res) => {
  try {
    const { listingId, type } = req.body;

    const inquiry = {
      studentId: req.user.id,
      listingId,
      type,
      status: "pending"
    };

    res.json(inquiry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};