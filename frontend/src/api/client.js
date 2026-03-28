import axios from 'axios'

// Uses VITE_API_URL in production (set in Vercel dashboard)
// Falls back to localhost for local development
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
})

// Attach JWT token to every request automatically
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto logout if token expired (401 response)
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const getTasks     = ()         => api.get('/tasks/')
export const createTask   = (data)     => api.post('/tasks/', data)
export const updateTask   = (id, data) => api.put(`/tasks/${id}/`, data)
export const deleteTask   = (id)       => api.delete(`/tasks/${id}/`)
export const toggleDone   = (id)       => api.patch(`/tasks/${id}/done/`)
export const setActive    = (id)       => api.patch(`/tasks/${id}/active/`)
export const askAI        = (msg)      => api.post('/ai/chat/', { message: msg })
export const generatePlan = (data)     => api.post('/ai/plan/', data)

export default api