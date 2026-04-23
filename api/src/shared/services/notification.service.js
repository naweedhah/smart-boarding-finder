import prisma from "../lib/prisma.js";
import { emitNotificationRead, emitNotificationToUser } from "../lib/socket.js";
import { sendNotificationEmail } from "./email.service.js";

const DEFAULT_NOTIFICATION_PREFERENCES = {
  emailEnabled: true,
  inAppEnabled: true,
  pushEnabled: true,
  smsEnabled: false,
  bookingUpdates: true,
  watchlistAlerts: true,
  searchAlerts: true,
  priceAlerts: true,
  demandAlerts: true,
  inquiryAlerts: true,
  roommateAlerts: true,
  safetyAlerts: true,
  moderationAlerts: true,
  accountSecurityAlerts: true,
};

const PREFERENCE_KEY_BY_TYPE = {
  bookingRequested: "bookingUpdates",
  bookingApproved: "bookingUpdates",
  bookingRejected: "bookingUpdates",
  paymentSubmitted: "bookingUpdates",
  paymentVerified: "bookingUpdates",
  boardingAvailable: "watchlistAlerts",
  watchlistMatch: "watchlistAlerts",
  searchMatch: "searchAlerts",
  demandSpike: "demandAlerts",
  priceDrop: "priceAlerts",
  inquiryReply: "inquiryAlerts",
  roommateMatchFound: "roommateAlerts",
  suspiciousChatActivity: "safetyAlerts",
  safetyAlert: "safetyAlerts",
  reportSubmitted: "moderationAlerts",
  complaintSubmitted: "moderationAlerts",
  smartReminder: "bookingUpdates",
  lowAvailability: "watchlistAlerts",
};

const normalizeChannel = (channel, preferences) => {
  if (channel === "email" && !preferences.emailEnabled) return null;
  if (channel === "sms" && !preferences.smsEnabled) return null;
  if (channel === "push" && !preferences.pushEnabled) return null;
  if (channel === "inApp" && !preferences.inAppEnabled) return null;
  return channel;
};

export const getOrCreateNotificationPreference = async (userId) => {
  return prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId, ...DEFAULT_NOTIFICATION_PREFERENCES },
    update: {},
  });
};

export { canSendEmail } from "./email.service.js";

export const createNotification = async ({
  userId,
  type,
  title,
  message,
  channel = "inApp",
  metadata = {},
  bypassPreference = false,
}) => {
  if (!userId || !type || !title || !message) {
    return null;
  }

  const [preferences, user] = await Promise.all([
    getOrCreateNotificationPreference(userId),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        username: true,
      },
    }),
  ]);

  const preferenceKey = PREFERENCE_KEY_BY_TYPE[type];

  if (!bypassPreference && preferenceKey && preferences[preferenceKey] === false) {
    return null;
  }

  const finalChannel = normalizeChannel(channel, preferences);
  let notification = null;

  if (finalChannel === "inApp") {
    notification = await prisma.notification.create({
      data: {
        userId,
        type,
        channel: finalChannel,
        title,
        message,
        metadata,
        sentAt: new Date(),
      },
    });

    emitNotificationToUser(userId, notification);
  }

  if (preferences.emailEnabled && user?.email) {
    try {
      await sendNotificationEmail({
        to: user.email,
        recipientName: user.fullName || user.username,
        title,
        message,
        metadata,
      });
    } catch (error) {
      console.log("Email notification failed:", error.message);
    }
  }

  return notification;
};

export const createNotificationsForUsers = async (entries) => {
  const created = [];

  for (const entry of entries) {
    const notification = await createNotification(entry);
    if (notification) {
      created.push(notification);
    }
  }

  return created;
};

export const markNotificationAsReadForUser = async (userId, notificationId) => {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  });

  if (!notification) {
    return null;
  }

  const updated = await prisma.notification.update({
    where: {
      id: notificationId,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  emitNotificationRead(userId, notificationId);
  return updated;
};

const postMatchesWatchlist = (post, watchlist) => {
  if (!watchlist.isActive) return false;
  if (watchlist.postId) return false;
  if (watchlist.city && watchlist.city !== post.city) return false;
  if (watchlist.area && watchlist.area !== post.area) return false;
  if (watchlist.boardingType && watchlist.boardingType !== post.boardingType) return false;
  if (
    watchlist.preferredTenantGender &&
    watchlist.preferredTenantGender !== "any" &&
    watchlist.preferredTenantGender !== post.preferredTenantGender
  ) {
    return false;
  }
  if (watchlist.minBudget != null && post.rent < watchlist.minBudget) return false;
  if (watchlist.maxBudget != null && post.rent > watchlist.maxBudget) return false;
  if (watchlist.minCapacity != null && post.capacity < watchlist.minCapacity) return false;
  if (watchlist.wifiRequired && !post.postDetail?.wifi) return false;
  if (watchlist.mealsRequired && !post.postDetail?.mealsProvided) return false;
  if (watchlist.attachedBathroomNeeded && !post.postDetail?.attachedBathroom) return false;
  return true;
};

export const notifyWatchlistAndSearchMatches = async (post) => {
  const watchlists = await prisma.watchlist.findMany({
    where: {
      isActive: true,
      userId: {
        not: post.ownerId,
      },
    },
  });

  const matchingWatchlists = watchlists.filter((watchlist) =>
    postMatchesWatchlist(post, watchlist),
  );

  const uniqueUsers = new Map();

  for (const watchlist of matchingWatchlists) {
    const type = watchlist.postId ? "watchlistMatch" : "searchMatch";
    const title = watchlist.postId
      ? "A saved boarding has an update"
      : `New boarding available in ${post.area || post.city}`;
    const message = watchlist.postId
      ? `${post.title} now has a change worth checking.`
      : `A new listing matches your alert in ${post.area || post.city} within your tracked preferences.`;

    uniqueUsers.set(`${watchlist.userId}:${type}`, {
      userId: watchlist.userId,
      type,
      title,
      message,
      metadata: {
        postId: post.id,
        watchlistId: watchlist.id,
        city: post.city,
        area: post.area,
      },
    });
  }

  return createNotificationsForUsers([...uniqueUsers.values()]);
};

export const notifyDemandSpike = async (post) => {
  const watchlists = await prisma.watchlist.findMany({
    where: {
      isActive: true,
      city: post.city,
      ...(post.area ? { area: post.area } : {}),
      userId: {
        not: post.ownerId,
      },
    },
  });

  const activeInterestCount = watchlists.length;

  if (activeInterestCount < 3) {
    return [];
  }

  const uniqueUserIds = [...new Set(watchlists.map((watchlist) => watchlist.userId))];

  return createNotificationsForUsers(
    uniqueUserIds.map((userId) => ({
      userId,
      type: "demandSpike",
      title: `Demand is rising in ${post.area || post.city}`,
      message: `Interest is increasing in ${post.area || post.city}. Rooms may fill fast, so it is worth checking new listings now.`,
      metadata: {
        city: post.city,
        area: post.area,
        postId: post.id,
        demandSignals: activeInterestCount,
      },
    })),
  );
};

export const notifyPriceDrop = async ({ post, previousRent }) => {
  if (previousRent == null || post.rent >= previousRent) {
    return [];
  }

  const [savedPosts, watchlists] = await Promise.all([
    prisma.savedPost.findMany({
      where: { postId: post.id },
      select: { userId: true },
    }),
    prisma.watchlist.findMany({
      where: {
        isActive: true,
        userId: {
          not: post.ownerId,
        },
      },
    }),
  ]);

  const matchingWatchlists = watchlists.filter((watchlist) =>
    postMatchesWatchlist(post, watchlist),
  );

  const userIds = new Set([
    ...savedPosts.map((item) => item.userId),
    ...matchingWatchlists.map((item) => item.userId),
  ]);

  return createNotificationsForUsers(
    [...userIds].map((userId) => ({
      userId,
      type: "priceDrop",
      title: "Price dropped on a tracked listing",
      message: `${post.title} dropped from LKR ${previousRent} to LKR ${post.rent}.`,
      metadata: {
        postId: post.id,
        previousRent,
        currentRent: post.rent,
      },
    })),
  );
};

export const notifyLowAvailability = async ({ post, remainingSlots }) => {
  if (remainingSlots > 1) {
    return [];
  }

  const savedPosts = await prisma.savedPost.findMany({
    where: { postId: post.id },
    select: { userId: true },
  });

  const userIds = [...new Set(savedPosts.map((item) => item.userId).filter((id) => id !== post.ownerId))];

  if (userIds.length === 0) {
    return [];
  }

  return createNotificationsForUsers(
    userIds.map((userId) => ({
      userId,
      type: "lowAvailability",
      title: remainingSlots === 1 ? "Only 1 room left" : "Tracked listing is now full",
      message:
        remainingSlots === 1
          ? `${post.title} only has one remaining slot.`
          : `${post.title} is now out of available slots.`,
      metadata: {
        postId: post.id,
        remainingSlots,
      },
    })),
  );
};

export const notifyRoommateMatches = async ({ userId, matches }) => {
  const strongMatches = matches.filter((match) => match.score >= 70).slice(0, 3);

  if (strongMatches.length === 0) {
    return [];
  }

  const baseNotification = {
    userId,
    type: "roommateMatchFound",
    title: "High compatibility roommate matches found",
    message: `You now have ${strongMatches.length} strong roommate match${strongMatches.length > 1 ? "es" : ""} ready to review.`,
    metadata: {
      matches: strongMatches.map((match) => ({
        userId: match.user.id,
        score: match.score,
      })),
    },
  };

  const reciprocalNotifications = strongMatches.map((match) => ({
    userId: match.user.id,
    type: "roommateMatchFound",
    title: "A compatible roommate just appeared",
    message: "A new high compatibility roommate match is now available in your finder.",
    metadata: {
      matchedUserId: userId,
      score: match.score,
    },
  }));

  return createNotificationsForUsers([baseNotification, ...reciprocalNotifications]);
};

export const notifySuspiciousChatActivity = async ({
  receiverId,
  senderId,
  chatId,
  messageId,
  scamFlag,
  text,
}) => {
  if (!receiverId || !["warning", "danger"].includes(scamFlag)) {
    return null;
  }

  const title =
    scamFlag === "danger"
      ? "Suspicious activity detected in chat"
      : "Potentially risky message detected";
  const message =
    scamFlag === "danger"
      ? "A message in your conversation was flagged as high risk. Avoid sending money before verifying the listing and owner."
      : "A message in your conversation may be risky. Take a moment to double-check the details.";

  const notifications = [
    {
      userId: receiverId,
      type: "suspiciousChatActivity",
      title,
      message,
      metadata: {
        senderId,
        chatId,
        messageId,
        scamFlag,
        preview: text.slice(0, 120),
      },
    },
  ];

  return createNotificationsForUsers(notifications);
};

export const maybeCreateSmartReminder = async ({
  userId,
  title,
  message,
  metadata = {},
  recentHours = 24,
}) => {
  const threshold = new Date(Date.now() - recentHours * 60 * 60 * 1000);

  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      type: "smartReminder",
      title,
      createdAt: {
        gte: threshold,
      },
    },
  });

  if (existing) {
    return existing;
  }

  return createNotification({
    userId,
    type: "smartReminder",
    title,
    message,
    metadata,
  });
};
