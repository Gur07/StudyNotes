import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
    withCredentials: true, // sends cookies automatically
});

// Auth
export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login:    (data) => api.post('/auth/login', data),
    getMe:    ()     => api.get('/auth/getme'),
    logout:   ()     => api.get('/auth/logout'),
};

// Notes (ready for later)
export const notesAPI = {
    run:         (data) => api.post('/notes', data),
    runWithFile: (data) => api.post('/notes/upload', data),
    getJob:      (id)   => api.get(`/notes/${id}`),
    listJobs:    ()     => api.get('/notes'),
    update:      (id, data) => api.patch(`/notes/${id}`, data),
    download:    (id)   => api.get(`/notes/${id}/download`, { responseType: 'blob' }),
    deleteJob:   (id)   => api.delete(`/notes/${id}`),
};

export default api;