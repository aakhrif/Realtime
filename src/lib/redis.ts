// Redis Client für Production Session Management
import { createClient, RedisClientType } from 'redis';

interface WebRTCIceCandidate {
  candidate: string;
  sdpMLineIndex: number | null;
  sdpMid: string | null;
}

// Redis Client konfigurieren
const redisClient: RedisClientType = createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379',
  socket: {
    keepAlive: true,
    reconnectStrategy: (retries: number) => Math.min(retries * 50, 500)
  }
});

// Error Handling
redisClient.on('error', (err: Error) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redisClient.on('ready', () => {
  console.log('✅ Redis ready for operations');
});

// Verbindung herstellen
if (process.env.NODE_ENV === 'production') {
  redisClient.connect().catch(console.error);
}

// Room Management Funktionen
export class RoomManager {
  
  // User zu Room hinzufügen
  static async addUserToRoom(roomId: string, userId: string, socketId: string) {
    if (process.env.NODE_ENV !== 'production') return;
    
    await redisClient.multi()
      .sAdd(`room:${roomId}:users`, userId)
      .hSet(`user:${userId}`, {
        socketId,
        roomId,
        joinedAt: Date.now().toString()
      })
      .expire(`user:${userId}`, 3600) // 1 Stunde TTL
      .exec();
  }

  // User aus Room entfernen
  static async removeUserFromRoom(roomId: string, userId: string) {
    if (process.env.NODE_ENV !== 'production') return;
    
    await redisClient.multi()
      .sRem(`room:${roomId}:users`, userId)
      .del(`user:${userId}`)
      .exec();
  }

  // Alle User in Room abrufen
  static async getRoomUsers(roomId: string): Promise<string[]> {
    if (process.env.NODE_ENV !== 'production') return [];
    
    const users = await redisClient.sMembers(`room:${roomId}:users`);
    return users || [];
  }

  // Room User Count
  static async getRoomUserCount(roomId: string): Promise<number> {
    if (process.env.NODE_ENV !== 'production') return 0;
    
    const count = await redisClient.sCard(`room:${roomId}:users`);
    return count || 0;
  }

  // User Info abrufen
  static async getUserInfo(userId: string) {
    if (process.env.NODE_ENV !== 'production') return null;
    
    return await redisClient.hGetAll(`user:${userId}`);
  }
}

// WebRTC Signaling Cache
export class SignalingCache {
  
  // ICE Candidates zwischenspeichern
  static async storeIceCandidate(fromId: string, toId: string, candidate: WebRTCIceCandidate) {
    if (process.env.NODE_ENV !== 'production') return;
    
    await redisClient.lPush(
      `ice:${fromId}:${toId}`, 
      JSON.stringify(candidate)
    );
    await redisClient.expire(`ice:${fromId}:${toId}`, 300); // 5 Min TTL
  }

  // Gespeicherte ICE Candidates abrufen
  static async getIceCandidates(fromId: string, toId: string): Promise<WebRTCIceCandidate[]> {
    if (process.env.NODE_ENV !== 'production') return [];
    
    const candidates = await redisClient.lRange(`ice:${fromId}:${toId}`, 0, -1);
    await redisClient.del(`ice:${fromId}:${toId}`); // Nach Abruf löschen
    
    return candidates.map((c: string) => JSON.parse(c) as WebRTCIceCandidate);
  }
}

// Connection Stats für Monitoring
export class ConnectionStats {
  
  static async incrementConnection(roomId: string) {
    if (process.env.NODE_ENV !== 'production') return;
    
    await redisClient.multi()
      .incr(`stats:connections:total`)
      .incr(`stats:room:${roomId}:connections`)
      .exec();
  }

  static async getGlobalStats() {
    if (process.env.NODE_ENV !== 'production') return { totalConnections: 0 };
    
    const totalConnections = await redisClient.get('stats:connections:total');
    return {
      totalConnections: parseInt(totalConnections || '0', 10)
    };
  }
}

export default redisClient;
