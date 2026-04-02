const axios = require("axios");

let inquiries = [];

exports.createInquiry = (req, res) => {
  const { postId, ownerId, type } = req.body;

  const inquiry = {
    id: Date.now().toString(),
    studentId: req.user?.id || "student1",
    ownerId,
    postId,
    type,
    status: "pending",
    chatId: null
  };

  inquiries.push(inquiry);

  res.json(inquiry);
};


exports.createInquiry = (req, res) => {
  const { postId, ownerId, type } = req.body;

  const inquiry = {
    id: Date.now().toString(),
    studentId: req.user?.id || "student1",
    ownerId,
    postId,
    type,
    status: "pending",
    chatId: null
  };

  inquiries.push(inquiry);

  res.json(inquiry);
};


exports.acceptInquiry = async (req, res) => {
  const { id } = req.params;

  const inquiry = {
    id,
    studentId: "student1",
    ownerId: "owner1"
  };

  const chatRes = await axios.post("http://localhost:5000/api/sakith-chat/create", {
    inquiryId: id,
    studentId: inquiry.studentId,
    ownerId: inquiry.ownerId
  });

  res.json({
    message: "Inquiry approved and chat created",
    chat: chatRes.data
  });
};