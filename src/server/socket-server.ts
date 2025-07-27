/**
 * Standalone Socket.IO Server
 * Läuft parallel zu Next.js auf separatem Port
 */
import { createServer } from 'http';
import { Server as ServerIO } from 'socket.io';

const httpServer = createServer();
const io = new ServerIO(httpServer, {
  path: '/socket.io/', // Standard Socket.IO Pfad
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

export interface UserInfo {
  id: string;
  name: string;
  room: string;
}

const users = new Map<string, UserInfo>();
const rooms = new Map<string, Set<string>>();

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  socket.on('join-room', ({ room, name }: { room: string; name: string }) => {
    console.log(`${name} (${socket.id}) joining room: ${room}`);
    
    // Store user info
    users.set(socket.id, { id: socket.id, name, room });
    
    // Join Socket.IO room
    socket.join(room);
    
    // Update room tracking
    if (!rooms.has(room)) {
      rooms.set(room, new Set());
    }
    rooms.get(room)!.add(socket.id);
    
    const roomUsers = Array.from(rooms.get(room) || [])
      .map(id => users.get(id))
      .filter(Boolean);
    
    console.log(`✅ User ${name} joined room ${room}. Total users in room: ${roomUsers.length}`);
    
    // Send existing users to new user
    const existingUsers = roomUsers.filter(user => user!.id !== socket.id);
    console.log(`📋 Sending ${existingUsers.length} existing users to new user:`, existingUsers);
    socket.emit('room-users', existingUsers);
    
    // Notify others about new user
    socket.to(room).emit('user-joined', { id: socket.id, name });
  });

  // WebRTC Signaling
  socket.on('offer', ({ to, offer }) => {
    console.log(`📤 Relaying offer from ${socket.id} to ${to}`);
    socket.to(to).emit('offer', { from: socket.id, offer });
  });

  socket.on('answer', ({ to, answer }) => {
    console.log(`📤 Relaying answer from ${socket.id} to ${to}`);
    socket.to(to).emit('answer', { from: socket.id, answer });
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    console.log(`🧊 Relaying ICE candidate from ${socket.id} to ${to}`);
    socket.to(to).emit('ice-candidate', { from: socket.id, candidate });
  });

  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    
    const user = users.get(socket.id);
    if (user) {
      const { room, name } = user;
      
      // Remove from room tracking
      rooms.get(room)?.delete(socket.id);
      if (rooms.get(room)?.size === 0) {
        rooms.delete(room);
      }
      
      // Remove user info
      users.delete(socket.id);
      
      // Notify others
      socket.to(room).emit('user-left', { id: socket.id, name });
      
      const remainingUsers = Array.from(rooms.get(room) || []).length;
      console.log(`👋 User ${name} left room ${room}. Remaining users: ${remainingUsers}`);
    }
  });
});

const PORT = process.env.SOCKET_PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Socket.IO Server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/socket.io/`);
});

export default io;
