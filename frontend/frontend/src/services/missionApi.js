import apiClient from './apiClient';

const missionApi = {
  list(params = {}) {
    return apiClient.get('/missions', { params });
  },

  getById(id) {
    return apiClient.get(`/missions/${id}`);
  },

  create(data) {
    return apiClient.post('/missions', data);
  },

  update(id, data) {
    return apiClient.put(`/missions/${id}`, data);
  },

  changeStatus(id, status) {
    return apiClient.patch(`/missions/${id}/status`, { status });
  },
};

export default missionApi;
