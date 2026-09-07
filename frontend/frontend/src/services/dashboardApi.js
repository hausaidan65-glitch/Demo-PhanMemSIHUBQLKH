import apiClient from "./apiClient";

export const getDashboard = () => apiClient.get("/dashboard");
