import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000/api'
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const getTasks    = () => api.get('/tasks')
export const createTask  = (data) => api.post('/tasks', data)
export const updateTask  = (id, data) => api.put(`/tasks/${id}`, data)
export const deleteTask  = (id) => api.delete(`/tasks/${id}`)
export const toggleDone  = (id) => api.patch(`/tasks/${id}/done`)
export const setActive   = (id) => api.patch(`/tasks/${id}/active`)
export const askAI       = (msg) => api.post('/ai/chat', { message: msg })
export const generatePlan = (data) => api.post('/ai/plan', data)

export default api

