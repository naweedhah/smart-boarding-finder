import detectScam from "../safety/scamDetector.js";
import prisma from "../../shared/lib/prisma.js";

export const createChat = async (req, res) => {
  const { inquiryId, studentId, ownerId } = req.body;

  if (!studentId || !ownerId) {
    return res.status(400).json({ message: "Student and owner ids are required" });
  }

  if (![studentId, ownerId].includes(req.userId) && req.userRole !== "admin") {
    return res.status(403).json({ message: "Not authorized to create this chat" });
  }

  try {
    const existingChat = await prisma.chat.findFirst({
      where: {
        userIDs: {
          hasEvery: [studentId, ownerId],
        },
      },
    });

    if (existingChat) {
      if (inquiryId) {
        await prisma.inquiry.update({
          where: { id: inquiryId },
          data: { chatId: existingChat.id, status: "accepted" },
        });
      }

      return res.status(200).json(existingChat);
    }

    const chat = await prisma.chat.create({
      data: {
        userIDs: [studentId, ownerId],
        seenBy: [req.userId],
      },
    });

    if (inquiryId) {
      await prisma.inquiry.update({
        where: { id: inquiryId },
        data: { chatId: chat.id, status: "accepted" },
      });
    }

    res.status(201).json(chat);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to create chat" });
  }
};

export const sendMessage = async (req, res) => {
  const { chatId, text } = req.body;
  const trimmedText = text?.trim();

  if (!chatId || !trimmedText) {
    return res.status(400).json({ message: "Chat id and message text are required" });
  }

  try {
    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userIDs: {
          hasSome: [req.userId],
        },
      },
    });

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const scamFlag = detectScam(trimmedText);

    const message = await prisma.message.create({
      data: {
        chatId,
        userId: req.userId,
        text: trimmedText,
        scamFlag,
      },
    });

    await prisma.chat.update({
      where: { id: chatId },
      data: {
        seenBy: [req.userId],
        lastMessage: trimmedText,
      },
    });

    res.status(201).json(message);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to send message" });
  }
};

export const getMessages = async (req, res) => {
  const { chatId } = req.params;

  try {
    const chat = await prisma.chat.findFirst({
      where: req.userRole === "admin"
        ? {
            id: chatId,
          }
        : {
            id: chatId,
            userIDs: {
              hasSome: [req.userId],
            },
          },
    });

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: {
        createdAt: "asc",
      },
    });

    res.status(200).json(messages);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to load messages" });
  }
};
