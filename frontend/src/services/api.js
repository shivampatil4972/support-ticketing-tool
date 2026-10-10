import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 10000,
});

// ==============================
// Attach JWT Token
// ==============================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ==============================
// Handle API Responses
// ==============================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 401 from the login form is just a wrong password, not an expired session
    const isLoginAttempt = error.config?.url?.includes("/auth/login");

    if (error.response?.status === 401 && !isLoginAttempt) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);

export default api;