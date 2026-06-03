import { io, Socket } from 'socket.io-client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from './auth-store';

let socket: Socket | null = null;

export function initSocket() {
  if (!socket && typeof window !== 'undefined') {
    socket = io('', {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
}

export function getSocket() {
  initSocket();
  const token = useAuthStore.getState().accessToken;
  if (socket) {
    socket.auth = token ? { token } : {};
    if (!socket.connected) socket.connect();
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

/**
 * React hook to access the socket connection.
 * Returns the socket instance and connection status.
 */
export function useSocket() {
  const token = useAuthStore((s) => s.accessToken);
  const [connected, setConnected] = useState(false);
  const sockRef = useRef<Socket | null>(null);

  useEffect(() => {
    initSocket();
    const s = socket;
    if (s) {
      sockRef.current = s;
      s.auth = token ? { token } : {};
      if (!s.connected) s.connect();

      const handleConnect = () => setConnected(true);
      const handleDisconnect = () => setConnected(false);

      s.on('connect', handleConnect);
      s.on('disconnect', handleDisconnect);

      if (s.connected) setConnected(true);

      return () => {
        s.off('connect', handleConnect);
        s.off('disconnect', handleDisconnect);
      };
    }
  }, [token]);

  const emit = useCallback((event: string, data?: any) => {
    sockRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    sockRef.current?.on(event, handler);
    return () => sockRef.current?.off(event, handler);
  }, []);

  return { socket, connected, emit, on };
}