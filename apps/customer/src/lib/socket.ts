import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(url?: string): Socket {
  if (!socket) {
    const serverUrl =
      url || (import.meta as any).env?.VITE_API_URL || 'http://localhost:5001';
    socket = io(serverUrl, { transports: ['websocket'] });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
