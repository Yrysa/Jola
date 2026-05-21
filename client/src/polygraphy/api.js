import API from '../services/api';


export const PolyApi = {
  async listServices() {
    const { data } = await API.get('/services');
    return data?.data?.services || [];
  },

  async getService(key) {
    const safeKey = encodeURIComponent(key);
    const { data } = await API.get(`/services/${safeKey}`);
    return data?.data?.service;
  },

  async getLimits() {
    const { data } = await API.get('/services/limits');
    return data?.data;
  },

  async uploadFiles(key, files) {
    const safeKey = encodeURIComponent(key);
    const form = new FormData();
    for (const f of files) form.append('files', f);

    const { data } = await API.post(`/services/${safeKey}/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return data?.data?.files || [];
  },

  async deleteUpload(id) {
    await API.delete(`/services/uploads/${id}`);
    return true;
  },

  async calc(key, { fileIds, options }) {
    const safeKey = encodeURIComponent(key);
    const { data } = await API.post(`/services/${safeKey}/calc`, { fileIds, options });
    return data?.data;
  },
};
