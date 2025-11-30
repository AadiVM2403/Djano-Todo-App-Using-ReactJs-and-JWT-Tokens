import axios from "axios";

const api = axios.create({
  baseURL: "/api", 
});


api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const refreshToken = sessionStorage.getItem("refreshToken");


    if (error.response?.status === 401 && refreshToken && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await axios.post("/api/token/refresh/", { refresh: refreshToken });
        const newAccess = res.data.access;
        sessionStorage.setItem("accessToken", newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error("Session expired. Please log in again.");
        sessionStorage.clear();
        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
