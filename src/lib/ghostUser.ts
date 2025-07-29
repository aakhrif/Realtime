// GhostUser: Service-User für Socket-Initialisierung und Room-Presence
import { io, Socket } from 'socket.io-client';

class GhostUser {
  private static instance: Socket | null = null;
  private static rooms: string[] = [];

  static connectToRooms(roomList: string[]) {
    if (this.instance && this.instance.connected) return;
    this.rooms = roomList;
    this.instance = io({
      path: '/api/socket',
      transports: ['polling'],
      timeout: 20000,
      forceNew: true,
      upgrade: false
    });
    this.instance.on('connect', () => {
      console.log('👻 GhostUser connected:', this.instance?.id);
      // Trete allen Rooms bei
      for (const room of roomList) {
        this.instance?.emit('join-room', { room, name: 'GhostUser', mediaEnabled: false });
      }
    });
    this.instance.on('disconnect', (reason) => {
      console.log('👻 GhostUser disconnected:', reason);
    });
  }

  static disconnect() {
    if (this.instance) {
      this.instance.disconnect();
      this.instance = null;
    }
  }
}

export default GhostUser;
