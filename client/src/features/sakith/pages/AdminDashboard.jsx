import "../styles/sakith.css";
import { useEffect, useState } from "react";
import {
  getReports,
  resolveReport,
  warnUser
} from "../services/sakithService";

export default function AdminDashboard() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const res = await getReports();
    setReports(res.data);
  };

  return (
    <div className="card">
      <h2>Admin Dashboard</h2>

      {reports.map((r) => (
        <div key={r.id} className="card mt-2">
          <p><b>Reason:</b> {r.reason}</p>

          <button
            className="btn btn-primary mt-1"
            onClick={() => resolveReport(r.id)}
          >
            Resolve
          </button>

          <button
            className="btn btn-danger mt-1"
            onClick={() => warnUser(r.targetId)}
          >
            Warn User
          </button>
        </div>
      ))}
    </div>
  );
}