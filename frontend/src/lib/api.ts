import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('vide_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('vide_token');
      localStorage.removeItem('vide_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const AuthAPI = {
  register: (email: string, password: string, name: string) =>
    api.post('/auth/register', { email, password, name }),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  getMe: () => api.get('/me'),
};

export const ProjectsAPI = {
  list: () => api.get('/projects/'),
  create: (title: string, durationSec?: number) =>
    api.post('/projects/', { title, duration_sec: durationSec || 60 }),
  get: (id: string) => api.get(`/projects/${id}`),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  updateDAG: (id: string, dagOps: string) =>
    api.put(`/projects/${id}/dag`, { dag_ops: dagOps }),
  listClips: (id: string) => api.get(`/projects/${id}/clips`),
  createClip: (id: string, clip: Record<string, unknown>) =>
    api.post(`/projects/${id}/clips`, clip),
  deleteClip: (id: string, clipId: string) =>
    api.delete(`/projects/${id}/clips/${clipId}`),
};

export const UploadAPI = {
  getPresignedURL: (filename: string, mimeType: string) =>
    api.post('/upload/presigned-url', { filename, mimeType }),
};

export const JobsAPI = {
  submit: (projectId: string, type: string, dagJSON?: string) =>
    api.post('/jobs/', { project_id: projectId, type, dag_json: dagJSON }),
  getStatus: (jobId: string) => api.get(`/jobs/${jobId}`),
  getWebSocketURL: (jobId: string) =>
    `${API_BASE.replace('/api/v1', '').replace('http', 'ws')}/ws/jobs/${jobId}`,
};

export const NLAPI = {
  parse: (command: string, videoContext?: string, timelineJSON?: string) =>
    api.post('/nlp/parse', { command, video_context: videoContext, timeline_json: timelineJSON }),
};

export default api;
