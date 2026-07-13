import axios from "axios";

// -------------------------
// BASE URL (PRODUCTION SAFE)
// -------------------------
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://cricsense-ytl3.onrender.com";

// Create axios instance
const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 600000, // 10 min for video processing
});

// -------------------------
// AUTH TOKEN INTERCEPTOR
// -------------------------
API.interceptors.request.use((cfg) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("cs_token");
    if (token) {
      cfg.headers.Authorization = `Bearer ${token}`;
    }
  }
  return cfg;
});

// -------------------------
// AUTH
// -------------------------
export const register = (data) =>
  API.post("/api/auth/register", data);

export const login = (data) =>
  API.post("/api/auth/login", data);

// -------------------------
// USER
// -------------------------
export const getMe = () =>
  API.get("/api/user/me");

export const getStats = () =>
  API.get("/api/user/stats");

// -------------------------
// ANALYSIS (FIXED ENDPOINT)
// -------------------------
// IMPORTANT: backend is /api/analyze (NOT /api/analysis/upload)
export const uploadVideo = (formData) =>
  API.post("/api/analyze", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    timeout: 600000,
  });

// -------------------------
// HISTORY / DETAILS
// -------------------------
export const getHistory = () =>
  API.get("/api/analysis/history");

export const getAnalysis = (id) =>
  API.get(`/api/analysis/${id}`);

export const deleteAnalysis = (id) =>
  API.delete(`/api/analysis/${id});

// -------------------------
// EXPORT
// -------------------------
export default API;