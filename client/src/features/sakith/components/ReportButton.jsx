import "../styles/sakith.css";

import { createReport } from "../services/sakithService";

export default function ReportButton({ chatId }) {
  const handleReport = async () => {
    await createReport({
      targetId: chatId,
      reason: "suspicious message"
    });

    alert("Reported successfully");
  };

  return (
    <button className="btn btn-danger mt-1" onClick={handleReport}>
      Report
    </button>
  );
}