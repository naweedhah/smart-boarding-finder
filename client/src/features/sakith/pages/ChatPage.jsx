import { useState } from "react";
import ScamWarning from "../components/ScamWarning";
import ReportButton from "../components/ReportButton";
import "../styles/sakith.css";

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const sendMessage = () => {
    if (!text.trim()) return;

    const msg = {
      id: Date.now(),
      text,
      chatId: "chat1"
    };

    setMessages([...messages, msg]);
    setText("");
  };

  return (
    <div className="card">
      <h2>Chat</h2>

      {/* Chat Messages */}
      <div style={{ minHeight: "250px" }}>
        {messages.map((msg) => (
          <div key={msg.id} className="message">
            <p>{msg.text}</p>

            <ScamWarning text={msg.text} />
            <ReportButton chatId={msg.chatId} />
          </div>
        ))}
      </div>

      {/* Input Section */}
      <div className="flex mt-2">
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
        />

        <button className="btn btn-primary ml-2" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}