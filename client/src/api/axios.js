import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const getApiBaseUrl = () => {
  let envUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  envUrl = envUrl.trim().replace(/\/+$/, '')
  if (!envUrl.endsWith('/api')) {
    envUrl = `${envUrl}/api`
  }
  return envUrl
}

const API = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
})

API.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default API
