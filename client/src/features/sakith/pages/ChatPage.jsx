import { useContext, useEffect, useState } from "react";
import { format } from "timeago.js";
import { useParams } from "react-router-dom";
import ScamWarning from "../components/ScamWarning";
import ReportButton from "../components/ReportButton";
import {
  getChatMessages,
  sendChatMessage,
} from "../services/sakithService";
import "../styles/sakith.css";
import { AuthContext } from "../../../context/AuthContext";

export default function ChatPage() {
  const { chatId } = useParams();
  const { currentUser } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isAdminViewer = currentUser?.role === "admin";

  useEffect(() => {
    const loadMessages = async () => {
      try {
        setIsLoading(true);
        const res = await getChatMessages(chatId);
        setMessages(res.data);
      } catch (error) {
        setErrorMessage(
          error.response?.data?.message || "Failed to load messages.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (chatId) {
      loadMessages();
    }
  }, [chatId]);

  const handleSendMessage = async () => {
    if (!text.trim()) return;

    try {
      setIsSending(true);
      setErrorMessage("");
      const res = await sendChatMessage({
        chatId,
        text,
      });
      setMessages((prev) => [...prev, res.data]);
      setText("");
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Failed to send message.",
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="sakith-page">
      <div className="card">
        <h2>Secure Chat</h2>
        <p className="text-muted">
          Messages are stored in your main chat system and flagged when they look risky.
        </p>
        {errorMessage && <p className="error-text mt-2">{errorMessage}</p>}
      </div>

      <div className="card">
        <div className="chat-shell">
          <div className="chat-messages">
            {isLoading ? (
              <p className="text-muted">Loading conversation...</p>
            ) : messages.length === 0 ? (
              <p className="text-muted">No messages yet. Send the first one below.</p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="message">
                  <p>{msg.text}</p>
                  <span className="text-muted">{format(msg.createdAt)}</span>
                  <ScamWarning text={msg.text} scamFlag={msg.scamFlag} />
                  {!isAdminViewer && <ReportButton messageId={msg.id} />}
                </div>
              ))
            )}
          </div>

          {isAdminViewer ? (
            <p className="text-muted">
              Admin review mode: you can inspect this conversation, but only the student and owner can send messages.
            </p>
          ) : (
            <div className="flex mt-2 chat-input-row">
              <input
                className="input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message..."
              />

              <button
                className="btn btn-primary ml-2"
                onClick={handleSendMessage}
                disabled={isSending}
              >
                {isSending ? "Sending..." : "Send"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
