'use client';

import { io, Socket } from 'socket.io-client';

class SocketManager {
  private static instance: Socket | null = null;
  private static isConnecting: boolean = false;
  private static connectionPromise: Promise<Socket> | null = null;

  static getSocket(): Promise<Socket> {
    // If we already have a connected socket, return it
    if (this.instance && this.instance.connected) {
      return Promise.resolve(this.instance);
    }

    // If we're already connecting, return the existing promise
    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    // Create new connection
    this.isConnecting = true;
    this.connectionPromise = new Promise((resolve, reject) => {
      console.log('🔌 SocketManager: Creating new socket connection...');
      
      const socket = io({
        path: '/api/socket',
        transports: ['polling'],
        timeout: 20000,
        forceNew: false, // Reuse connection if possible
        upgrade: false
      });

      socket.on('connect', () => {
        console.log('✅ SocketManager: Socket connected:', socket.id);
        this.instance = socket;
        this.isConnecting = false;
        resolve(socket);
      });

      socket.on('disconnect', (reason) => {
        console.log('❌ SocketManager: Socket disconnected:', reason);
        // Don't reset instance immediately, might reconnect
      });

      socket.on('connect_error', (error) => {
        console.error('❌ SocketManager: Connection error:', error);
        this.isConnecting = false;
        this.connectionPromise = null;
        reject(error);
      });

      // Timeout fallback
      setTimeout(() => {
        if (!socket.connected) {
          console.error('❌ SocketManager: Connection timeout');
          this.isConnecting = false;
          this.connectionPromise = null;
          reject(new Error('Socket connection timeout'));
        }
      }, 25000);
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
