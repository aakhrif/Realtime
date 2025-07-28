'use client';

import { io, Socket } from 'socket.io-client';

class SocketManager {
  private static instance: Socket | null = null;
  private static isConnecting: boolean = false;
  private static connectionPromise: Promise<Socket> | null = null;

  static getSocket(): Promise<Socket> {
    console.log('🔍 SocketManager.getSocket() called! Current state:', {
      hasInstance: !!this.instance,
      isConnected: this.instance?.connected,
      isConnecting: this.isConnecting,
      hasPromise: !!this.connectionPromise
    });

    // If we already have a connected socket, return it
    if (this.instance && this.instance.connected) {
      console.log('✅ Returning existing connected socket:', this.instance.id);
      return Promise.resolve(this.instance);
    }

    // If we're already connecting, return the existing promise
    if (this.isConnecting && this.connectionPromise) {
      console.log('⏳ Already connecting, returning existing promise');
      return this.connectionPromise;
    }

    // Create new connection - SET FLAGS IMMEDIATELY to prevent race conditions
    console.log('🆕 Creating NEW socket connection...');
    this.isConnecting = true;
    
    this.connectionPromise = new Promise((resolve, reject) => {
      let attempt = 0;
      const maxDelay = 10000;
      const baseDelay = 800;
      let cancelled = false;

      const tryConnect = () => {
        attempt++;
        const delay = Math.min(baseDelay * attempt, maxDelay);
        console.log(`🔌 SocketManager: Attempt ${attempt} to connect...`);

        const socket = io({
          path: '/api/socket',
          transports: ['polling'],
          timeout: 20000,
          forceNew: false,
          upgrade: false
        });

        let timeoutId: NodeJS.Timeout | null = setTimeout(() => {
          if (!socket.connected) {
            console.error('❌ SocketManager: Connection timeout');
            socket.close();
            if (!cancelled) retryOrReject(new Error('Socket connection timeout'));
          }
        }, 25000);

        socket.on('connect', () => {
          if (timeoutId) clearTimeout(timeoutId);
          console.log('✅ SocketManager: Socket connected:', socket.id);
          this.instance = socket;
          this.isConnecting = false;
          cancelled = true;
          resolve(socket);
        });

        socket.on('disconnect', (reason) => {
          console.log('❌ SocketManager: Socket disconnected:', reason);
        });

        socket.on('connect_error', (error) => {
          if (timeoutId) clearTimeout(timeoutId);
          console.error('❌ SocketManager: Connection error:', error);
          socket.close();
          if (!cancelled) retryOrReject(error);
        });

        function retryOrReject(error: Error) {
          if (attempt < 10) {
            setTimeout(() => {
              if (!cancelled) tryConnect();
            }, delay);
          } else {
            cancelled = true;
            // Reset flags
            (SocketManager as any).isConnecting = false;
            (SocketManager as any).connectionPromise = null;
            reject(error);
          }
        }
      };

      tryConnect();
    });

    return this.connectionPromise;
  }

  static disconnect(): void {
    if (this.instance) {
      console.log('🔌 SocketManager: Disconnecting socket');
      this.instance.disconnect();
      this.instance = null;
    }
    this.isConnecting = false;
    this.connectionPromise = null;
  }

  static isConnected(): boolean {
    return this.instance?.connected || false;
  }

  static getSocketId(): string | null {
    return this.instance?.id || null;
  }
}

export default SocketManager;
