import axiosClient from "./axiosClient";

const courseApi = {
  getAll() {
    return axiosClient.get("/courses");
  },

  getById(id) {
    return axiosClient.get(`/courses/${id}`);
  },

  create(data) {
    return axiosClient.post("/courses", data);
  },

  update(id, data) {
    return axiosClient.put(`/courses/${id}`, data);
  },

  remove(id) {
    return axiosClient.delete(`/courses/${id}`);
  },
};

export default courseApi;
