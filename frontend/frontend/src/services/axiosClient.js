import axios from "axios";

const axiosClient = axios.create({
  baseURL: "http://localhost:5000/api",

  headers: {
    "Content-Type": "application/json",
  },
});

axiosClient.interceptors.response.use(
  (response) => response,

  (error) => {
    console.log(error);

    return Promise.reject(error);
  },
);

export default axiosClient;
