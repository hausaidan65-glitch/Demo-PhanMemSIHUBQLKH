import apiClient from './apiClient';

const progressAttachmentApi = {
  download(attachmentId) {
    return apiClient.get(`/progress-attachments/${attachmentId}/file`, {
      responseType: 'blob',
    });
  },
};

export default progressAttachmentApi;
