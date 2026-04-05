import "../styles/sakith.css";
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "timeago.js";
import apiRequest from "../../../lib/apiRequest";
import { AuthContext } from "../../../context/AuthContext";
import {
  acceptInquiry,
  getAdminOverview,
  getReports,
  resolveReport,
  setReportedUserState,
  updateInquiryStatus,
  warnUser
} from "../services/sakithService";

export default function AdminDashboard() {
  const { updateUser, currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [overview, setOverview] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [busyReportId, setBusyReportId] = useState("");
  const [busyInquiryId, setBusyInquiryId] = useState("");
  const [noteDrafts, setNoteDrafts] = useState({});
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [reportsRes, overviewRes] = await Promise.all([
        getReports(),
        getAdminOverview(),
      ]);
      setReports(reportsRes.data);
      setOverview(overviewRes.data);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Failed to load reports.",
      );
    }
  };

  const handleResolve = async (reportId, status = "resolved") => {
    try {
      setBusyReportId(reportId);
      setErrorMessage("");
      const res = await resolveReport(reportId, {
        status,
        adminNotes: noteDrafts[reportId],
      });
      setStatusMessage(res.data.message || "Report updated.");
      await load();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Failed to update report.",
      );
    } finally {
      setBusyReportId("");
    }
  };

  const handleWarn = async (reportId) => {
    try {
      setBusyReportId(reportId);
      setErrorMessage("");
      const res = await warnUser(reportId);
      setStatusMessage(res.data.message || "Warning sent.");
      await load();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Failed to warn user.",
      );
    } finally {
      setBusyReportId("");
    }
  };

  const handleUserState = async (reportId, isActive) => {
    try {
      setBusyReportId(reportId);
      setErrorMessage("");
      const res = await setReportedUserState(
        reportId,
        isActive,
        noteDrafts[reportId],
      );
      setStatusMessage(res.data.message || "User account updated.");
      await load();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Failed to update user account state.",
      );
    } finally {
      setBusyReportId("");
    }
  };

  const handleAcceptInquiry = async (inquiryId) => {
    try {
      setBusyInquiryId(inquiryId);
      setErrorMessage("");
      const res = await acceptInquiry(inquiryId);
      setStatusMessage(res.data.message || "Inquiry accepted.");
      await load();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Failed to accept inquiry.",
      );
    } finally {
      setBusyInquiryId("");
    }
  };

  const handleInquiryStatus = async (inquiryId, status) => {
    try {
      setBusyInquiryId(inquiryId);
      setErrorMessage("");
      const res = await updateInquiryStatus(inquiryId, status);
      setStatusMessage(res.data.message || "Inquiry updated.");
      await load();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Failed to update inquiry.",
      );
    } finally {
      setBusyInquiryId("");
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await apiRequest.post("/auth/logout");
      updateUser(null);
      navigate("/");
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Failed to logout.",
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="sakith-page">
      <div className="card">
        <div className="header-row">
          <div>
            <h2>Admin Moderation Dashboard</h2>
            <p className="text-muted">
              Signed in as {currentUser?.fullName || currentUser?.username || "Admin"}.
            </p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
        <p className="text-muted">
          Review reports, warn reported users, and close or dismiss cases.
        </p>
        {statusMessage && <p className="success-text mt-2">{statusMessage}</p>}
        {errorMessage && <p className="error-text mt-2">{errorMessage}</p>}
      </div>

      {overview?.summary && (
        <div className="admin-summary-grid">
          <div className="admin-summary-card">
            <span>Open Reports</span>
            <strong>{overview.summary.openReports}</strong>
            <small>{overview.summary.totalReports} total reports</small>
          </div>
          <div className="admin-summary-card">
            <span>Under Review</span>
            <strong>{overview.summary.underReviewReports}</strong>
            <small>{overview.summary.resolvedReports} resolved</small>
          </div>
          <div className="admin-summary-card">
            <span>Pending Inquiries</span>
            <strong>{overview.summary.pendingInquiries}</strong>
            <small>{overview.summary.totalInquiries} total inquiries</small>
          </div>
          <div className="admin-summary-card danger">
            <span>Suspicious Messages</span>
            <strong>{overview.summary.totalFlaggedMessages}</strong>
            <small>{overview.summary.dangerMessages} danger level</small>
          </div>
        </div>
      )}

      <div className="card">
        <div className="header-row">
          <div>
            <h3>Recent Inquiries</h3>
            <p className="text-muted">
              Latest student-owner inquiry activity across the platform.
            </p>
          </div>
        </div>

        {overview?.recentInquiries?.length ? (
          <div className="stack">
            {overview.recentInquiries.map((inquiry) => (
              <div key={inquiry.id} className="inquiry-item">
                <div>
                  <strong>{inquiry.post?.title || "Listing inquiry"}</strong>
                  <p className="text-muted">
                    Status: {inquiry.status} • Type: {inquiry.type}
                  </p>
                  <p className="text-muted">
                    Student: {inquiry.student?.fullName || inquiry.student?.username || "Unknown"}
                  </p>
                  <p className="text-muted">
                    Owner: {inquiry.owner?.fullName || inquiry.owner?.username || "Unknown"}
                  </p>
                  {inquiry.chat?.id && (
                    <p className="text-muted">Chat opened: {inquiry.chat.id}</p>
                  )}
                </div>
                <div className="action-row">
                  {inquiry.chat?.id && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => navigate(`/sakith/chat/${inquiry.chat.id}`)}
                    >
                      Open Chat
                    </button>
                  )}
                  {inquiry.status === "pending" && (
                    <>
                      <button
                        className="btn btn-teal"
                        onClick={() => handleAcceptInquiry(inquiry.id)}
                        disabled={busyInquiryId === inquiry.id}
                      >
                        {busyInquiryId === inquiry.id ? "Updating..." : "Accept"}
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleInquiryStatus(inquiry.id, "rejected")}
                        disabled={busyInquiryId === inquiry.id}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {inquiry.status === "accepted" && !inquiry.chat?.id && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleAcceptInquiry(inquiry.id)}
                      disabled={busyInquiryId === inquiry.id}
                    >
                      {busyInquiryId === inquiry.id ? "Updating..." : "Reopen Chat"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted">No inquiries available.</p>
        )}
      </div>

      <div className="card">
        <div className="header-row">
          <div>
            <h3>Suspicious Messages</h3>
            <p className="text-muted">
              Messages flagged by the safety detector for warning or scam language.
            </p>
          </div>
        </div>

        {overview?.suspiciousMessages?.length ? (
          <div className="stack">
            {overview.suspiciousMessages.map((message) => (
              <div key={message.id} className="inquiry-item">
                <div>
                  <strong>{message.sender?.fullName || message.sender?.username || "Unknown sender"}</strong>
                  <p className={`text-muted ${message.scamFlag === "danger" ? "warning" : "warning-soft"}`}>
                    Risk: {message.scamFlag}
                  </p>
                  <p className="text-muted">{message.text}</p>
                  {message.chat?.inquiry?.post?.title && (
                    <p className="text-muted">
                      Related listing: {message.chat.inquiry.post.title}
                    </p>
                  )}
                  <p className="text-muted">Chat ID: {message.chatId}</p>
                </div>
                <div className="action-row">
                  <button
                    className="btn btn-secondary"
                    onClick={() => navigate(`/sakith/chat/${message.chatId}`)}
                  >
                    Review Chat
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted">No suspicious messages found.</p>
        )}
      </div>

      <div className="card">
        <div className="header-row">
          <div>
            <h3>Reports</h3>
            <p className="text-muted">
              Submitted moderation reports with proof, status, and admin actions.
            </p>
          </div>
        </div>
        {reports.length === 0 ? (
          <p className="text-muted">No reports available.</p>
        ) : (
          <div className="stack">
            {reports.map((report) => (
              <div key={report.id} className="inquiry-item">
                <div>
                  <strong>Case: {report.reason}</strong>
                  <p className="text-muted">
                    Status: {report.status} • Target: {report.targetType}
                  </p>
                  {report.targetUser && (
                    <p className="text-muted">
                      Reviewed user: {report.targetUser.fullName || report.targetUser.username} • Account: {report.targetUser.isActive ? "active" : "suspended"}
                    </p>
                  )}
                  {report.adminNotes && (
                    <p className="text-muted">Admin notes: {report.adminNotes}</p>
                  )}
                  <p className="text-muted">
                    Reporter: {report.reporter?.fullName || report.reporter?.username || "Unknown"}
                  </p>
                  {report.post?.title && (
                    <p className="text-muted">Listing: {report.post.title}</p>
                  )}
                  <div className="report-evidence-card">
                    <div className="report-evidence-header">
                      <strong>Report evidence</strong>
                      <span className="text-muted">
                        Submitted {format(report.createdAt)}
                      </span>
                    </div>
                    <div className="report-evidence-grid">
                      <div className="report-evidence-block">
                        <span className="report-evidence-label">Reason</span>
                        <p>{report.reason || "No reason provided."}</p>
                      </div>
                      <div className="report-evidence-block">
                        <span className="report-evidence-label">Reporter statement</span>
                        <p>{report.description || "No additional description was submitted."}</p>
                      </div>
                    </div>
                    <div className="report-evidence-block">
                      <span className="report-evidence-label">Proof image</span>
                      {report.proofImage ? (
                        <a
                          href={report.proofImage}
                          target="_blank"
                          rel="noreferrer"
                          className="report-proof-link"
                        >
                          <img
                            src={report.proofImage}
                            alt={`Proof for report: ${report.reason}`}
                            className="report-proof-image"
                          />
                          <span>Open full proof</span>
                        </a>
                      ) : (
                        <p>No proof image was submitted for this report.</p>
                      )}
                    </div>
                  </div>
                  {report.reputation && (
                    <p className="text-muted">
                      Target history: {report.reputation.openCount} open, {report.reputation.resolvedCount} resolved, {report.reputation.dismissedCount} dismissed
                    </p>
                  )}
                  <div className="admin-note-block">
                    <label htmlFor={`report-note-${report.id}`} className="text-muted">
                      Admin notes
                    </label>
                    <textarea
                      id={`report-note-${report.id}`}
                      className="admin-note-input"
                      rows="3"
                      value={noteDrafts[report.id] ?? report.adminNotes ?? ""}
                      onChange={(e) =>
                        setNoteDrafts((prev) => ({
                          ...prev,
                          [report.id]: e.target.value,
                        }))
                      }
                      placeholder="Add investigation notes or explain the moderation decision..."
                    />
                  </div>
                </div>

                <div className="action-row">
                  <button
                    className="btn btn-teal"
                    onClick={() => handleWarn(report.id)}
                    disabled={busyReportId === report.id}
                  >
                    {busyReportId === report.id ? "Updating..." : "Warn User"}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleResolve(report.id, "underReview")}
                    disabled={busyReportId === report.id}
                  >
                    Under Review
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleResolve(report.id, "resolved")}
                    disabled={busyReportId === report.id}
                  >
                    Resolve
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleResolve(report.id, "dismissed")}
                    disabled={busyReportId === report.id}
                  >
                    Dismiss
                  </button>
                  {report.targetUserId && (
                    <button
                      className={`btn ${report.targetUser?.isActive ? "btn-danger" : "btn-secondary"}`}
                      onClick={() => handleUserState(report.id, !report.targetUser?.isActive)}
                      disabled={busyReportId === report.id}
                    >
                      {busyReportId === report.id
                        ? "Updating..."
                        : report.targetUser?.isActive
                          ? "Suspend User"
                          : "Restore User"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
