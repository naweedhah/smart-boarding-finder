import prisma from "../../shared/lib/prisma.js";
import {
  getUserReportSummary,
  resolveReportedUserId,
} from "../safety/reputation.service.js";
import { createNotification } from "../../shared/services/notification.service.js";

const requireAdmin = (req, res) => {
  if (req.userRole !== "admin") {
    res.status(403).json({ message: "Admin access required" });
    return false;
  }

  return true;
};

const reportInclude = {
  reporter: {
    select: {
      id: true,
      username: true,
      fullName: true,
      avatar: true,
    },
  },
  post: {
    select: {
      id: true,
      title: true,
      address: true,
    },
  },
};

const getTargetUserProfile = async (targetUserId) => {
  if (!targetUserId) return null;

  return prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      username: true,
      fullName: true,
      avatar: true,
      role: true,
      isActive: true,
      isVerified: true,
    },
  });
};

const validTargetTypes = new Set(["user", "boarding", "bookingRequest", "message"]);
const isProduction = process.env.NODE_ENV === "production";

const inquiryInclude = {
  post: {
    select: {
      id: true,
      title: true,
      city: true,
      area: true,
    },
  },
  student: {
    select: {
      id: true,
      username: true,
      fullName: true,
      avatar: true,
    },
  },
  owner: {
    select: {
      id: true,
      username: true,
      fullName: true,
      avatar: true,
    },
  },
  chat: {
    select: {
      id: true,
      lastMessage: true,
      createdAt: true,
    },
  },
};

export const createReport = async (req, res) => {
  const {
    targetId,
    targetType = "message",
    reason,
    description,
    postId,
    proofImage,
  } = req.body;

  if (!targetId || !reason?.trim()) {
    return res.status(400).json({ message: "Target and reason are required" });
  }

  if (!validTargetTypes.has(targetType)) {
    return res.status(400).json({ message: "Invalid report target type" });
  }

  try {
    const existingOpenReport = await prisma.report.findFirst({
      where: {
        reporterId: req.userId,
        targetId,
        targetType,
        status: {
          in: ["open", "underReview"],
        },
      },
      include: reportInclude,
    });

    if (existingOpenReport) {
      return res.status(200).json({
        message: "You already reported this item",
        report: existingOpenReport,
      });
    }

    const report = await prisma.report.create({
      data: {
        reporterId: req.userId,
        targetId,
        targetType,
        reason: reason.trim(),
        description: description?.trim() || null,
        proofImage: proofImage?.trim() || null,
        ...(postId ? { postId } : {}),
      },
      include: reportInclude,
    });

    res.status(201).json({
      message: "Report submitted successfully",
      report,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to create report" });
  }
};

export const createDevSeedReport = async (req, res) => {
  if (isProduction) {
    return res.status(403).json({ message: "Dev seed helpers are disabled in production" });
  }

  try {
    const [targetUser, samplePost] = await Promise.all([
      prisma.user.findFirst({
        where: {
          id: {
            not: req.userId,
          },
        },
        select: {
          id: true,
          username: true,
          fullName: true,
        },
      }),
      prisma.post.findFirst({
        select: {
          id: true,
          title: true,
        },
      }),
    ]);

    const seededTarget = targetUser || {
      id: req.userId,
      username: "current-user",
      fullName: "Current User",
    };

    const report = await prisma.report.create({
      data: {
        reporterId: req.userId,
        targetId: seededTarget.id,
        targetType: "user",
        reason: `Seeded moderation test for ${seededTarget.fullName || seededTarget.username}`,
        description:
          "This is a development-only report created to test the admin moderation dashboard.",
        ...(samplePost ? { postId: samplePost.id } : {}),
      },
      include: reportInclude,
    });

    res.status(201).json({
      message: "Seed report created successfully",
      report,
      note: "This helper is for local development only.",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to create seed report" });
  }
};

export const getReports = async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      where: req.userRole === "admin" ? {} : { reporterId: req.userId },
      include: reportInclude,
      orderBy: {
        createdAt: "desc",
      },
    });

    const reportsWithContext = await Promise.all(
      reports.map(async (report) => {
        const targetUserId = await resolveReportedUserId(report);
        const [reputation, targetUser] = await Promise.all([
          targetUserId ? getUserReportSummary(targetUserId) : Promise.resolve(null),
          getTargetUserProfile(targetUserId),
        ]);

        return {
          ...report,
          targetUserId,
          targetUser,
          reputation,
        };
      }),
    );

    res.status(200).json(reportsWithContext);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to load reports" });
  }
};

export const getAdminOverview = async (req, res) => {
  if (!requireAdmin(req, res)) {
    return;
  }

  try {
    const [
      totalReports,
      openReports,
      underReviewReports,
      resolvedReports,
      totalInquiries,
      pendingInquiries,
      acceptedInquiries,
      totalFlaggedMessages,
      dangerMessages,
      recentInquiries,
      flaggedMessages,
    ] = await Promise.all([
      prisma.report.count(),
      prisma.report.count({ where: { status: "open" } }),
      prisma.report.count({ where: { status: "underReview" } }),
      prisma.report.count({ where: { status: "resolved" } }),
      prisma.inquiry.count(),
      prisma.inquiry.count({ where: { status: "pending" } }),
      prisma.inquiry.count({ where: { status: "accepted" } }),
      prisma.message.count({ where: { scamFlag: { not: "safe" } } }),
      prisma.message.count({ where: { scamFlag: "danger" } }),
      prisma.inquiry.findMany({
        include: inquiryInclude,
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.message.findMany({
        where: { scamFlag: { not: "safe" } },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

    const userIds = [...new Set(flaggedMessages.map((message) => message.userId))];
    const chatIds = [...new Set(flaggedMessages.map((message) => message.chatId))];

    const [users, chats] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          username: true,
          fullName: true,
          avatar: true,
        },
      }),
      prisma.chat.findMany({
        where: { id: { in: chatIds } },
        include: {
          inquiry: {
            select: {
              id: true,
              post: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const userMap = new Map(users.map((user) => [user.id, user]));
    const chatMap = new Map(chats.map((chat) => [chat.id, chat]));

    const suspiciousMessages = flaggedMessages.map((message) => {
      const sender = userMap.get(message.userId) || null;
      const chat = chatMap.get(message.chatId) || null;

      return {
        ...message,
        sender,
        chat: chat
          ? {
              id: chat.id,
              userIDs: chat.userIDs,
              lastMessage: chat.lastMessage,
              inquiry: chat.inquiry,
            }
          : null,
      };
    });

    res.status(200).json({
      summary: {
        totalReports,
        openReports,
        underReviewReports,
        resolvedReports,
        totalInquiries,
        pendingInquiries,
        acceptedInquiries,
        totalFlaggedMessages,
        dangerMessages,
      },
      recentInquiries,
      suspiciousMessages,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to load admin overview" });
  }
};

export const warnUser = async (req, res) => {
  const { reportId } = req.body;

  if (!requireAdmin(req, res)) {
    return;
  }

  if (!reportId) {
    return res.status(400).json({ message: "Report id is required" });
  }

  try {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: reportInclude,
    });

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    const targetUserId = await resolveReportedUserId(report);

    if (!targetUserId) {
      return res.status(400).json({ message: "Could not determine which user to warn" });
    }

    await createNotification({
      userId: targetUserId,
      type: "safetyAlert",
      title: "Account warning issued",
      message: `An admin reviewed a report and issued a warning related to: ${report.reason}.`,
      metadata: {
        reportId,
        targetType: report.targetType,
        targetId: report.targetId,
      },
    });

    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: "underReview",
        adminNotes: "Warning sent to the reported user.",
      },
      include: reportInclude,
    });

    res.status(200).json({
      message: "Warning issued successfully",
      report: updatedReport,
      targetUserId,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to warn user" });
  }
};

export const resolveReport = async (req, res) => {
  const { id } = req.params;
  const { status = "resolved", adminNotes } = req.body;

  if (!requireAdmin(req, res)) {
    return;
  }

  if (!["resolved", "dismissed", "underReview"].includes(status)) {
    return res.status(400).json({ message: "Invalid report status" });
  }

  try {
    const report = await prisma.report.findUnique({
      where: { id },
      include: reportInclude,
    });

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    const updatedReport = await prisma.report.update({
      where: { id },
      data: {
        status,
        adminNotes: adminNotes?.trim() || report.adminNotes,
        ...(status === "resolved" || status === "dismissed"
          ? { resolvedAt: new Date() }
          : {}),
      },
      include: reportInclude,
    });

    res.status(200).json({
      message: "Report updated successfully",
      report: updatedReport,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to resolve report" });
  }
};

export const setReportedUserActiveState = async (req, res) => {
  const { reportId, isActive, adminNotes } = req.body;

  if (!requireAdmin(req, res)) {
    return;
  }

  if (!reportId || typeof isActive !== "boolean") {
    return res.status(400).json({ message: "Report id and active state are required" });
  }

  try {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: reportInclude,
    });

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    const targetUserId = await resolveReportedUserId(report);

    if (!targetUserId) {
      return res.status(400).json({ message: "Could not determine which user to update" });
    }

    const [updatedUser, updatedReport] = await Promise.all([
      prisma.user.update({
        where: { id: targetUserId },
        data: { isActive },
        select: {
          id: true,
          username: true,
          fullName: true,
          avatar: true,
          role: true,
          isActive: true,
          isVerified: true,
        },
      }),
      prisma.report.update({
        where: { id: reportId },
        data: {
          status: isActive ? "underReview" : "resolved",
          adminNotes:
            adminNotes?.trim() ||
            (isActive
              ? "User account restored by admin review."
              : "User account suspended by admin review."),
          ...(isActive ? {} : { resolvedAt: new Date() }),
        },
        include: reportInclude,
      }),
    ]);

    await createNotification({
      userId: targetUserId,
      type: "safetyAlert",
      title: isActive ? "Account access restored" : "Account suspended",
      message: isActive
        ? "An admin reviewed your case and restored account access."
        : `An admin reviewed a report and suspended your account related to: ${report.reason}.`,
      metadata: {
        reportId,
        targetType: report.targetType,
        targetId: report.targetId,
        isActive,
      },
      bypassPreference: true,
    });

    res.status(200).json({
      message: isActive ? "User account restored" : "User account suspended",
      report: updatedReport,
      targetUser: updatedUser,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to update user account state" });
  }
};
