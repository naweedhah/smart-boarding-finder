import "../styles/sakith.css";

export default function ScamWarning({ text }) {
  if (!text) return null;

  const msg = text.toLowerCase();

  if (msg.includes("send money") || msg.includes("advance payment")) {
    return <p className="warning">⚠️ Scam Warning</p>;
  }

  return null;
}