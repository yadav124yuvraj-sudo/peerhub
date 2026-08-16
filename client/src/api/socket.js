import { io } from 'socket.io-client'

const getSocketUrl = () => {
  let envUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'
  envUrl = envUrl.trim().replace(/\/+$/, '')
  if (envUrl.endsWith('/api')) {
    envUrl = envUrl.slice(0, -4)
  }
  return envUrl
}

const socket = io(getSocketUrl(), {
  autoConnect: true,
})

export default socket
