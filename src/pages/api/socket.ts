import { NextApiRequest, NextApiResponse } from 'next';
import { Server as ServerIO } from 'socket.io';
import { RoomManager, ConnectionStats } from '../../lib/redis';

export interface UserInfo {
  id: string;
  name: string;
  room: string;
}

const users = new Map<string, UserInfo>();
const rooms = new Map<string, Set<string>>();

const ioHandler = (req: NextApiRequest, res: NextApiResponse) => {
  console.log(`🔵 Socket.IO API called: ${req.method} ${req.url}`);
  
  // @ts-expect-error - NextJS Pages API socket server access
  if (!res.socket.server.io) {
    console.log('🔧 Initializing Socket.IO server...');
    
    // @ts-expect-error - NextJS Pages API socket server access  
    const io = new ServerIO(res.socket.server, {
      path: '/socket.io', // Standard Socket.IO Pfad statt /api/socket
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
      console.log(`✅ User connected: ${socket.id}`);

      // User joins a room
      socket.on('join-room', async ({ room, name }: { room: string; name: string }) => {
        console.log(`🚪 ${name} (${socket.id}) joining room: ${room}`);
        
        try {
          // Leave previous room if any
          const user = users.get(socket.id);
          if (user && user.room) {
            socket.leave(user.room);
            const roomUsers = rooms.get(user.room);
            if (roomUsers) {
              roomUsers.delete(socket.id);
              // Notify others in previous room
              socket.to(user.room).emit('user-left', {
                id: socket.id,
                name: user.name
              });
            }
            // Redis cleanup for production
            await RoomManager.removeUserFromRoom(user.room, socket.id).catch(console.error);
          }

          // Join new room
          await socket.join(room);
          const userInfo: UserInfo = { id: socket.id, name, room };
          users.set(socket.id, userInfo);
          
          // Track in local memory (always works)
          if (!rooms.has(room)) {
            rooms.set(room, new Set());
          }
          rooms.get(room)?.add(socket.id);
          
          // Redis: User registrieren für Production (non-blocking)
          RoomManager.addUserToRoom(room, socket.id, name).catch(err => 
            console.warn('Redis addUser failed (non-critical):', err.message)
          );
          ConnectionStats.incrementConnection(room).catch(err => 
            console.warn('Redis stats failed (non-critical):', err.message)
          );

          // Get ALL users in room from Socket.IO rooms (most reliable)
          const socketioRoom = io.sockets.adapter.rooms.get(room);
          const allSocketIds = Array.from(socketioRoom || []);
          
          console.log(`🔍 Room ${room} analysis:`, {
            socketioRoom: allSocketIds.length,
            localMap: rooms.get(room)?.size || 0,
            allSockets: allSocketIds
          });

          // Build current users list from Socket.IO room data
          const currentUsers: { id: string; name: string }[] = [];
          for (const socketId of allSocketIds) {
            if (socketId !== socket.id) {
              const userInfo = users.get(socketId);
              if (userInfo) {
                currentUsers.push({ id: userInfo.id, name: userInfo.name });
              } else {
                // Fallback: Use socketId as name if user info missing
                currentUsers.push({ id: socketId, name: `User-${socketId.slice(0, 6)}` });
              }
            }
          }

          // Send current room users to the new user
          socket.emit('room-users', currentUsers);

          // Notify ALL others in the room about the new user (including this socket)
          io.to(room).emit('user-joined', {
            id: socket.id,
            name
          });
          
          console.log(`✅ User ${name} joined room ${room}. Total: ${allSocketIds.length}, Existing: ${currentUsers.length}`);
          console.log(`📋 Sending ${currentUsers.length} existing users:`, currentUsers);

        } catch (error) {
          console.error('❌ Error in join-room:', error);
          socket.emit('error', { message: 'Failed to join room' });
        }
      });

      // WebRTC Signaling
      socket.on('offer', ({ to, offer }: { to: string; offer: RTCSessionDescriptionInit }) => {
        console.log(`Offer from ${socket.id} to ${to}`);
        socket.to(to).emit('offer', {
          from: socket.id,
          offer
        });
      });

      socket.on('answer', ({ to, answer }: { to: string; answer: RTCSessionDescriptionInit }) => {
        console.log(`Answer from ${socket.id} to ${to}`);
        socket.to(to).emit('answer', {
          from: socket.id,
          answer
        });
      });

      socket.on('ice-candidate', ({ to, candidate }: { to: string; candidate: RTCIceCandidate }) => {
        socket.to(to).emit('ice-candidate', {
          from: socket.id,
          candidate
        });
      });

      // Chat messages
      socket.on('chat-message', ({ message }: { message: string }) => {
        const user = users.get(socket.id);
        if (user) {
          io.to(user.room).emit('chat-message', {
            id: socket.id,
            name: user.name,
            message,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Handle disconnect
      socket.on('disconnect', async () => {
        console.log(`❌ User disconnected: ${socket.id}`);
        
        const user = users.get(socket.id);
        if (user) {
          try {
            // Redis cleanup for production (non-blocking)
            RoomManager.removeUserFromRoom(user.room, socket.id).catch(err => 
              console.warn('Redis removeUser failed (non-critical):', err.message)
            );
            
            // Notify others in the room that user left
            socket.to(user.room).emit('user-left', {
              id: socket.id,
              name: user.name
            });

            // Clean up local tracking
            const roomUsers = rooms.get(user.room);
            if (roomUsers) {
              roomUsers.delete(socket.id);
              if (roomUsers.size === 0) {
                rooms.delete(user.room);
                console.log(`🗑️ Room ${user.room} deleted (empty)`);
              } else {
                console.log(`👋 User ${user.name} left room ${user.room}. Remaining users: ${roomUsers.size}`);
              }
            }
            
            // Remove user from global tracking
            users.delete(socket.id);
            
            // Double-check with Socket.IO rooms
            const socketioRoom = io.sockets.adapter.rooms.get(user.room);
            const remainingCount = socketioRoom?.size || 0;
            console.log(`🔍 Room ${user.room} after disconnect: Local=${roomUsers?.size || 0}, SocketIO=${remainingCount}`);
            
          } catch (error) {
            console.error('❌ Error in disconnect handler:', error);
          }
        }
      });
    });

    // @ts-expect-error - NextJS Pages API socket server access
    res.socket.server.io = io;
  }

  res.end();
};

export default ioHandler;
