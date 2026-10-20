
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach the current access token to API requests.
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("accessToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || "";

    // Don't redirect when login itself rejects credentials.
    const isAuthRequest =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register");

    if (status === 401 && !isAuthRequest) {
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("user");

      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  }
);


export default api;
