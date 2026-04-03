import { useState } from "react";
import { createInquiry, acceptInquiry } from "../services/sakithService";
import "../styles/sakith.css";

export default function InquiryBox() {
  const [inquiryId, setInquiryId] = useState("");

  const handleCreate = async () => {
    const res = await createInquiry({
      postId: "post1",
      ownerId: "owner1",
      type: "view"
    });

    setInquiryId(res.data.id);
  };

  const handleAccept = async () => {
    await acceptInquiry(inquiryId);
    alert("Inquiry Accepted → Chat Enabled");
  };

  return (
    <div className="card">
      <h2>Inquiry System</h2>

      <button className="btn btn-primary mt-2" onClick={handleCreate}>
        Create Inquiry
      </button>

      <button className="btn btn-teal mt-2" onClick={handleAccept}>
        Accept Inquiry
      </button>
    </div>
  );
}