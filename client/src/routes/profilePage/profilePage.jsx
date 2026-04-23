import Chat from "../../components/chat/Chat";
import List from "../../components/list/List";
import "./profilePage.scss";
import apiRequest from "../../lib/apiRequest";
import { Await, Link, Navigate, useLoaderData, useNavigate, useSearchParams } from "react-router-dom";
import { Suspense, useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useNotificationStore } from "../../lib/notificationStore";

const getDashboardPath = (role) => {
  if (role === "admin") return "/sakith/admin";
  if (role === "boardingOwner") return "/boardings";
  return "/profile";
};

function StudentDashboard({
  currentUser,
  postData,
  chats,
  initialSearchAlerts,
  initialPreferences,
  onLogout,
  unreadCount,
  notifications,
  initialChatId,
}) {
  const [chatCollapsed, setChatCollapsed] = useState(!initialChatId);
  const [searchAlerts, setSearchAlerts] = useState(initialSearchAlerts || []);
  const [savedPosts, setSavedPosts] = useState(postData.savedPosts || []);
  const [preferenceMessage, setPreferenceMessage] = useState("");
  const [preferenceError, setPreferenceError] = useState("");
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const pendingRequests = 0;
  const confirmedBookings = 0;
  const roommateMatches = 0;
  const watchlistItems = savedPosts.slice(0, 2);
  const preferences = useNotificationStore((state) => state.preferences);
  const updatePreferences = useNotificationStore((state) => state.updatePreferences);

  useEffect(() => {
    if (initialPreferences && !preferences) {
      useNotificationStore.setState({ preferences: initialPreferences });
    }
  }, [initialPreferences, preferences]);

  useEffect(() => {
    setSavedPosts(postData.savedPosts || []);
  }, [postData.savedPosts]);

  const fallbackNotifications = [
    unreadCount > 0
      ? {
          id: "messages",
          title: `${unreadCount} unseen alert${unreadCount > 1 ? "s" : ""}`,
          body: "Open the notification bell to review your latest updates.",
        }
      : {
          id: "clear",
          title: "No unseen alerts",
          body: "Your notification feed is up to date right now.",
        },
    {
      id: "booking",
      title: "Booking updates",
      body: "Approvals, rejections, and payment reminders will appear here.",
    },
    {
      id: "watchlist",
      title: "Watchlist alerts",
      body: "We will surface newly available boardings that match your filters.",
    },
  ];

  useEffect(() => {
    document.body.classList.toggle("dashboard-chat-collapsed", chatCollapsed);

    return () => {
      document.body.classList.remove("dashboard-chat-collapsed");
    };
  }, [chatCollapsed]);

  const handlePreferenceChange = async (event) => {
    const { name, checked } = event.target;

    try {
      setIsSavingPreferences(true);
      setPreferenceError("");
      await updatePreferences({
        [name]: checked,
      });
      setPreferenceMessage("Notification preferences updated.");
    } catch (err) {
      console.log(err);
      setPreferenceError(
        err.response?.data?.message || "Failed to update preferences.",
      );
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const handleDeleteAlert = async (alertId) => {
    try {
      setPreferenceError("");
      await apiRequest.delete(`/users/watchlists/searches/${alertId}`);
      setSearchAlerts((prev) => prev.filter((item) => item.id !== alertId));
      setPreferenceMessage("Saved search alert removed.");
    } catch (err) {
      console.log(err);
      setPreferenceError(
        err.response?.data?.message || "Failed to remove saved alert.",
      );
    }
  };

  const handleSendTestEmail = async () => {
    try {
      setIsSendingTestEmail(true);
      setPreferenceError("");
      const res = await apiRequest.post("/users/notifications/test-email");
      setPreferenceMessage(res.data.message || "Test email sent.");
    } catch (err) {
      console.log(err);
      const backendMessage =
        typeof err.response?.data === "string"
          ? err.response.data
          : err.response?.data?.message;
      setPreferenceError(
        backendMessage || "Failed to send test email.",
      );
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleRemoveSavedPost = (postId) => {
    setSavedPosts((prev) => prev.filter((item) => item.id !== postId));
    setPreferenceMessage("Saved boarding removed from your list.");
    setPreferenceError("");
  };

  const handleSavedPostFeedback = ({ type, message }) => {
    if (type === "error") {
      setPreferenceError(message);
      return;
    }

    setPreferenceMessage(message);
    setPreferenceError("");
  };

  return (
    <div className="profilePage">
      <div className="details">
        <div className="wrapper">
          <section className="heroCard">
            <div className="heroCopy">
              <p className="eyebrow">Student Dashboard</p>
              <h1>Welcome back, {currentUser.fullName || currentUser.username}</h1>
              <p className="heroText">
                Track your saved boardings, booking activity, messages, alerts,
                and roommate preferences from one place.
              </p>
              <div className="heroActions">
                <Link to="/list">
                  <button>Find Boardings</button>
                </Link>
                <Link to="/profile/update">
                  <button className="secondary">Update Profile</button>
                </Link>
              </div>
            </div>
            <div className="profileCard">
              <img src={currentUser.avatar || "/noavatar.jpg"} alt="" />
              <div className="profileMeta">
                <h2>{currentUser.username}</h2>
                <span>{currentUser.email}</span>
                <span>{currentUser.phone || "Add your phone number"}</span>
              </div>
              <div className="profileTags">
                <span>{currentUser.role || "student"}</span>
                <span>{currentUser.gender || "Gender not set"}</span>
                <span>{currentUser.isVerified ? "Verified" : "Verification pending"}</span>
              </div>
              <button className="logoutButton" onClick={onLogout}>
                Logout
              </button>
            </div>
          </section>

          <section className="statsGrid">
            <article className="statCard">
              <h2>{savedPosts.length}</h2>
              <p>Saved Boardings</p>
            </article>
            <article className="statCard">
              <h2>{pendingRequests}</h2>
              <p>Pending Requests</p>
            </article>
            <article className="statCard">
              <h2>{confirmedBookings}</h2>
              <p>Confirmed Bookings</p>
            </article>
            <article className="statCard">
              <h2>{roommateMatches}</h2>
              <p>Roommate Matches</p>
            </article>
          </section>

          <section className="dashboardGrid">
            <article className="panel bookingsPanel">
              <div className="panelHeading">
                <div>
                  <p className="eyebrow">Requests</p>
                  <h3>Booking Requests</h3>
                </div>
                <Link to="/list">Browse</Link>
              </div>
              <div className="statusGrid">
                <div>
                  <strong>{pendingRequests}</strong>
                  <span>Pending</span>
                </div>
                <div>
                  <strong>0</strong>
                  <span>Approved</span>
                </div>
                <div>
                  <strong>0</strong>
                  <span>Payment Due</span>
                </div>
              </div>
              <p className="emptyText">
                Once you request a boarding, the owner’s decision and payment
                step will show up here.
              </p>
            </article>

            <article className="panel" id="notifications">
              <div className="panelHeading">
                <div>
                  <p className="eyebrow">Alerts</p>
                  <h3>Notifications</h3>
                </div>
              </div>
              <div className="stackList">
                {(notifications.length > 0 ? notifications : fallbackNotifications).map((item) => (
                  <div className={`infoRow ${item.isRead ? "read" : "unread"}`} key={item.id || item.title}>
                    <strong>{item.title}</strong>
                    <span>{item.message || item.body}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel">
              <div className="panelHeading">
                <div>
                  <p className="eyebrow">Watchlist</p>
                  <h3>Tracked Boardings</h3>
                </div>
              </div>
              {watchlistItems.length > 0 ? (
                <div className="stackList">
                  {watchlistItems.map((item) => (
                    <div className="infoRow" key={item.id}>
                      <strong>{item.title}</strong>
                      <span>
                        {item.city}
                        {item.area ? `, ${item.area}` : ""} • LKR {item.rent}/month
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="emptyText">
                  Save boardings or filter-based watchlists to receive
                  availability alerts here.
                </p>
              )}
            </article>

            <article className="panel roommatePanel">
              <div className="panelHeading">
                <div>
                  <p className="eyebrow">Matching</p>
                  <h3>Roommate Finder</h3>
                </div>
                <Link to="/roommates">Open Finder</Link>
              </div>
              <p className="emptyText">
                Add your lifestyle and budget preferences to unlock same-gender
                roommate suggestions and compatibility scores.
              </p>
            </article>

            <article className="panel smartAlertsPanel">
              <div className="panelHeading">
                <div>
                  <p className="eyebrow">Intelligence</p>
                  <h3>Smart Alerts</h3>
                </div>
                <Link to="/watchlist">Open Watchlist</Link>
              </div>

              {(preferenceMessage || preferenceError) && (
                <div className="dashboardFeedback">
                  {preferenceMessage && (
                    <p className="dashboardSuccess">{preferenceMessage}</p>
                  )}
                  {preferenceError && (
                    <p className="dashboardError">{preferenceError}</p>
                  )}
                </div>
              )}

              <div className="preferenceSummaryGrid">
                {[
                  ["bookingUpdates", "Booking updates"],
                  ["searchAlerts", "Search alerts"],
                  ["priceAlerts", "Price drops"],
                  ["roommateAlerts", "Roommate matches"],
                ].map(([key, label]) => (
                  <label className="preferenceToggle" key={key}>
                    <div>
                      <strong>{label}</strong>
                      <span>
                        {preferences?.[key] ? "Live right now" : "Currently paused"}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      name={key}
                      checked={Boolean(preferences?.[key])}
                      onChange={handlePreferenceChange}
                      disabled={isSavingPreferences}
                    />
                  </label>
                ))}
              </div>

              <div className="savedAlertSummary">
                <div className="savedAlertSummaryHeader">
                  <strong>Saved Search Alerts</strong>
                  <span>{searchAlerts.length} active</span>
                </div>
                {searchAlerts.length > 0 ? (
                  <div className="stackList compactList">
                    {searchAlerts.slice(0, 3).map((alert) => (
                      <div className="infoRow alertSummaryRow" key={alert.id}>
                        <div>
                          <strong>{alert.area || alert.city}</strong>
                          <span>
                            {alert.city}
                            {alert.maxBudget
                              ? ` • Up to LKR ${alert.maxBudget}`
                              : ""}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="inlineAction"
                          onClick={() => handleDeleteAlert(alert.id)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="emptyText">
                    Create saved searches from the watchlist page to get live alerts
                    for new matching boardings, price drops, and demand spikes.
                  </p>
                )}
              </div>

              <div className="testEmailRow">
                <div>
                  <strong>SMTP Test</strong>
                  <span>
                    Send a test notification email to your account to verify the
                    email channel is working.
                  </span>
                </div>
                <button
                  type="button"
                  className="inlineAction primaryAction"
                  onClick={handleSendTestEmail}
                  disabled={isSendingTestEmail}
                >
                  {isSendingTestEmail ? "Sending..." : "Send Test Email"}
                </button>
              </div>
            </article>
          </section>

          <section className="savedSection">
            <div className="sectionHeading">
              <div>
                <p className="eyebrow">Shortlist</p>
                <h3>Saved Boardings</h3>
              </div>
              <Link to="/list">Explore More</Link>
            </div>
            {savedPosts.length > 0 ? (
              <List
                posts={savedPosts}
                onRemoveSaved={handleRemoveSavedPost}
                onReportSuccess={handleSavedPostFeedback}
                reportEnabled
              />
            ) : (
              <div className="emptyPanel">
                <p>
                  You have not saved any boardings yet. Start browsing and save
                  the ones you want to revisit.
                </p>
                <Link to="/list">
                  <button>Browse Boardings</button>
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
      <div className={`chatContainer ${chatCollapsed ? "collapsed" : ""}`}>
        <div className="wrapper">
          <section className="messageShell">
            <div className="sectionHeading">
              <div>
                <p className="eyebrow">Conversations</p>
                <h3>Messages</h3>
              </div>
              <div className="messageActions">
                <span className="messagePill">{chats.length} chats</span>
                <button
                  type="button"
                  className="collapseButton"
                  onClick={() => setChatCollapsed((prev) => !prev)}
                >
                  {chatCollapsed ? "Expand" : "Collapse"}
                </button>
              </div>
            </div>
            {chatCollapsed ? (
              <div className="collapsedState">
                <strong>Chat panel hidden</strong>
                <p>
                  Reopen messages whenever you want to reply to owners or
                  roommate matches.
                </p>
              </div>
            ) : (
              <Chat chats={chats} initialChatId={initialChatId} />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function ProfilePage() {
  const data = useLoaderData();
  const { updateUser, currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const number = useNotificationStore((state) => state.number);
  const notifications = useNotificationStore((state) => state.notifications);
  const fetchNotifications = useNotificationStore((state) => state.fetch);
  const initialChatId = searchParams.get("chat");

  useEffect(() => {
    fetchNotifications().catch((err) => {
      console.log(err);
    });
  }, [fetchNotifications]);

  if (currentUser?.role && currentUser.role !== "student") {
    return <Navigate to={getDashboardPath(currentUser.role)} replace />;
  }

  const handleLogout = async () => {
    try {
      await apiRequest.post("/auth/logout");
      updateUser(null);
      navigate("/");
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <Suspense fallback={<p>Loading dashboard...</p>}>
      <Await
        resolve={Promise.all([
          data.postResponse,
          data.chatResponse,
          data.searchAlertResponse,
          data.preferenceResponse,
        ])}
        errorElement={<p>Error loading dashboard!</p>}
      >
        {([
          postResponse,
          chatResponse,
          searchAlertResponse,
          preferenceResponse,
        ]) => (
          <StudentDashboard
            currentUser={currentUser}
            postData={postResponse.data}
            chats={chatResponse.data}
            initialSearchAlerts={searchAlertResponse.data}
            initialPreferences={preferenceResponse.data}
            unreadCount={number}
            notifications={notifications}
            initialChatId={initialChatId}
            onLogout={handleLogout}
          />
        )}
      </Await>
    </Suspense>
  );
}

export default ProfilePage;
