import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!socket) {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    const token = localStorage.getItem('token');

    socket = io(socketUrl, {
      auth: {
        token: token || '',
      },
      autoConnect: true,
    });
  } else {
    // Update the token in case it changed (e.g. after login)
    const token = localStorage.getItem('token');
    if (socket.auth) {
      (socket.auth as any).token = token || '';
    }
  }

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
