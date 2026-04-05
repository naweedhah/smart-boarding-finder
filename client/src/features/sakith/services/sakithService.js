import apiRequest from "../../../lib/apiRequest";

export const createInquiry = (data) =>
  apiRequest.post("/inquiry", data);

export const getInquiries = () =>
  apiRequest.get("/inquiry");

export const acceptInquiry = (id) =>
  apiRequest.patch(`/inquiry/${id}/accept`);

export const updateInquiryStatus = (id, status) =>
  apiRequest.patch(`/inquiry/${id}`, { status });

export const createReport = (data) =>
  apiRequest.post("/report", data);

export const getReports = () =>
  apiRequest.get("/report");

export const getAdminOverview = () =>
  apiRequest.get("/report/admin/overview");

export const resolveReport = (id, data = {}) =>
  apiRequest.patch(`/report/${id}`, data);

export const setReportedUserState = (reportId, isActive, adminNotes) =>
  apiRequest.post("/report/user-state", { reportId, isActive, adminNotes });

export const warnUser = (reportId) =>
  apiRequest.post("/report/warn", { reportId });

export const getChatMessages = (chatId) =>
  apiRequest.get(`/sakith-chat/${chatId}`);

export const sendChatMessage = (data) =>
  apiRequest.post("/sakith-chat/send", data);
