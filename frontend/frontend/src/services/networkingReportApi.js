import apiClient from './apiClient';

const NETWORKING_REPORT_PATH = '/reports/networking';

const networkingReportApi = {
  getNetworkingSummary(params) {
    return apiClient.get(`${NETWORKING_REPORT_PATH}/summary`, { params });
  },

  getNetworkingEvents(params) {
    return apiClient.get(`${NETWORKING_REPORT_PATH}/events`, { params });
  },

  exportNetworkingSummary(params) {
    return apiClient.get(`${NETWORKING_REPORT_PATH}/export`, {
      params,
      responseType: 'blob',
    });
  },

  exportNetworkingEvents(params) {
    return apiClient.get(`${NETWORKING_REPORT_PATH}/events/export`, {
      params,
      responseType: 'blob',
    });
  },

  getNetworkingEventParticipants(eventId) {
    return apiClient.get(
      `${NETWORKING_REPORT_PATH}/events/${eventId}/participants`,
    );
  },

  exportNetworkingEventParticipants(eventId, params) {
    return apiClient.get(
      `${NETWORKING_REPORT_PATH}/events/${eventId}/participants/export`,
      { params, responseType: 'blob' },
    );
  },

  getNetworkingParticipantDetail(eventId, participantId) {
    return apiClient.get(
      `${NETWORKING_REPORT_PATH}/events/${eventId}/participants/${participantId}`,
    );
  },
};

export default networkingReportApi;
