import axios from "axios";

const API = "http://localhost:5000/api";

export const createInquiry = (data) =>
  axios.post(`${API}/inquiry`, data);

export const acceptInquiry = (id) =>
  axios.patch(`${API}/inquiry/${id}/accept`);

export const createReport = (data) =>
  axios.post(`${API}/report`, data);

export const getReports = () =>
  axios.get(`${API}/report`);

export const resolveReport = (id) =>
  axios.patch(`${API}/report/${id}`);

export const warnUser = (userId) =>
  axios.post(`${API}/report/warn`, { userId });