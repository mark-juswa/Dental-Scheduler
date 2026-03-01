import api from './api.js';

// ── Appointments ─────────────────────────────────────────────────────────────

export const appointmentsApi = {
  getAll: (params = {}) => api.get('/appointments', { params }).then(r => r.data.data),
  getOne: (id) => api.get(`/appointments/${id}`).then(r => r.data.data),
  create: (body) => api.post('/appointments', body).then(r => r.data.data),
  update: (id, body) => api.put(`/appointments/${id}`, body).then(r => r.data.data),
  delete: (id) => api.delete(`/appointments/${id}`).then(r => r.data.data),
};

// ── Clients ──────────────────────────────────────────────────────────────────

export const clientsApi = {
  getAll: () => api.get('/clients').then(r => r.data.data),
  getOne: (id) => api.get(`/clients/${id}`).then(r => r.data.data),
  create: (body) => api.post('/clients', body).then(r => r.data.data),
  update: (id, body) => api.put(`/clients/${id}`, body).then(r => r.data.data),
  delete: (id) => api.delete(`/clients/${id}`).then(r => r.data.data),
};

// ── Blocked Dates ─────────────────────────────────────────────────────────────

export const blockedDatesApi = {
  getAll: () => api.get('/blocked-dates').then(r => r.data.data),
  block: (date, reason = '') => api.post('/blocked-dates', { date, reason }).then(r => r.data.data),
  unblock: (id) => api.delete(`/blocked-dates/${id}`).then(r => r.data.data),
};

// ── Audit ─────────────────────────────────────────────────────────────────────

export const auditApi = {
  getAll: () => api.get('/audit').then(r => r.data.data),
  clear: () => api.delete('/audit').then(r => r.data.data),
};

// ── Settings ──────────────────────────────────────────────────────────────────

export const settingsApi = {
  get: () => api.get('/settings').then(r => r.data.data),
  save: (body) => api.put('/settings', body).then(r => r.data.data),
};