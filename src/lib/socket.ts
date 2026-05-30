import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const socket = io(URL, {
  autoConnect: false,
  auth: (cb) => {
    cb({ token: localStorage.getItem('access_token') });
  }
});
