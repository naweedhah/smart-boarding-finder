let reports = [];

// CREATE REPORT
export const createReport = (req, res) => {
  const { targetId, reason } = req.body;

  const report = {
    id: Date.now().toString(),
    targetId,
    reason,
    status: "pending"
  };

  reports.push(report);

  res.json(report);
};

// WARN USER
export const warnUser = (req, res) => {
  const { userId } = req.body;

  console.log(`⚠️ Warning sent to user: ${userId}`);

  res.json({
    message: `Warning issued to user ${userId}`
  });
};

// RESOLVE REPORT
export const resolveReport = (req, res) => {
  const { id } = req.params;

  const report = reports.find(r => r.id === id);

  if (!report) {
    return res.status(404).json({ message: "Not found" });
  }

  report.status = "resolved";

  if (report.reason.toLowerCase().includes("scam")) {
    console.log("⚠️ Scam detected → warning user");
    console.log(`⚠️ Warning sent to owner: ${report.targetId}`);
  }

  res.json({
    message: "Report resolved and action taken",
    report
  });
};