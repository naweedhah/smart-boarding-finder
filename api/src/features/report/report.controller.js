exports.createReport = async (req, res) => {
  try {
    const report = {
      reporter: req.user.id,
      targetId: req.body.targetId,
      reason: req.body.reason,
      status: "pending"
    };

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.reviewReport = async (req, res) => {
  res.json({ message: "Report reviewed" });
};