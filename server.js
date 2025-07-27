const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0'; // Hört auf allen Interfaces
const port = process.env.PORT || 3000;

// Prepare Next.js app
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  
  // Initialize Socket.IO
  const io = new Server(httpServer, {
    path: '/api/socket',
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    transports: ['polling'], // Force polling only
    allowEIO3: false,        // Disable Engine.IO v3 compatibility
    pingTimeout: 20000,      // Longer ping timeout
    pingInterval: 10000,     // Longer ping interval
    maxHttpBufferSize: 1e6,  // Limit buffer size
    allowRequest: (req, callback) => {
      // Log each connection attempt
      console.log('🔍 New connection attempt from:', req.socket.remoteAddress);
      callback(null, true);
    }
  });

  // Enhanced user and room state management
  const users = new Map(); // socketId -> UserState
  const rooms = new Map(); // roomId -> RoomState
  
  // User state structure
  const createUserState = (socketId, name, room) => ({
    id: socketId,
    name,
    room,
    joinedAt: new Date().toISOString(),
    mediaState: {
      video: false,
      audio: false,
      screenShare: false
    },
    connectionState: {
      connected: true,
      lastSeen: new Date().toISOString(),
      pingLatency: 0
    },
    permissions: {
      canSpeak: true,
      canVideo: true,
      canScreenShare: true,
      isModerator: false
    }
  });
  
  // Room state structure
  const createRoomState = (roomId, creatorId) => ({
    id: roomId,
    createdAt: new Date().toISOString(),
    createdBy: creatorId,
    users: new Set(),
    settings: {
      maxUsers: 10,
      requirePermission: false,
      allowChat: true,
      allowScreenShare: true
    },
    chatHistory: [],
    activeScreenShare: null // socketId of user currently sharing screen
  });

  // Helper functions for better code organization
  const handleUserLeaveRoom = async (socket, user) => {
    if (!user.room) return;
    
    console.log(`🚪 User ${user.name} leaving room: ${user.room}`);
    
    socket.leave(user.room);
    const roomState = rooms.get(user.room);
    
    if (roomState) {
      roomState.users.delete(socket.id);
      
      // Handle screen share cleanup
      if (roomState.activeScreenShare === socket.id) {
        roomState.activeScreenShare = null;
        socket.to(user.room).emit('screen-share-ended', { userId: socket.id });
      }
      
      // Notify others in room
      socket.to(user.room).emit('user-left', {
        id: socket.id,
        name: user.name,
        leftAt: new Date().toISOString()
      });
      
      // Clean up empty rooms
      if (roomState.users.size === 0) {
        rooms.delete(user.room);
        console.log(`🗑️ Deleted empty room: ${user.room}`);
      } else {
        broadcastRoomStats(user.room);
      }
    }
  };
  
  const broadcastRoomStats = (roomId) => {
    const roomState = rooms.get(roomId);
    if (!roomState) return;
    
    const stats = {
      roomId,
      userCount: roomState.users.size,
      activeScreenShare: roomState.activeScreenShare,
      hasChat: roomState.chatHistory.length > 0
    };
    
    io.to(roomId).emit('room-stats-updated', stats);
  };

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.id}`);
    console.log(`📊 Total connected users: ${io.sockets.sockets.size}`); // Use logical socket count
    console.log(`📊 Current rooms:`, Array.from(rooms.keys()));

    // User joins a room with full state management
    socket.on('join-room', async ({ room, name }) => {
      console.log(`🚪 ${name} (${socket.id}) joining room: ${room}`);
      
      try {
        // Handle previous room cleanup
        const existingUser = users.get(socket.id);
        if (existingUser && existingUser.room) {
          await handleUserLeaveRoom(socket, existingUser);
        }

        // Join new room
        socket.join(room);
        
        // Create or get room state
        if (!rooms.has(room)) {
          const roomState = createRoomState(room, socket.id);
          roomState.users.add(socket.id);
          rooms.set(room, roomState);
          console.log(`🏠 Created new room: ${room}`);
        } else {
          rooms.get(room).users.add(socket.id);
        }
        
        // Create user state
        const userState = createUserState(socket.id, name, room);
        
        // Check if user is room creator (first user gets moderator)
        const roomState = rooms.get(room);
        if (roomState.createdBy === socket.id) {
          userState.permissions.isModerator = true;
        }
        
        users.set(socket.id, userState);

        // Send complete room state to joining user
        const roomUsers = Array.from(roomState.users).map(socketId => {
          const user = users.get(socketId);
          return user ? {
            id: user.id,
            name: user.name,
            mediaState: user.mediaState,
            permissions: user.permissions,
            joinedAt: user.joinedAt
          } : null;
        }).filter(Boolean);
        
        console.log(`📋 Sending room state to ${name}:`, {
          roomUsers: roomUsers.length,
          roomSettings: roomState.settings
        });
        
        // Notify joining user
        socket.emit('joined-room', { 
          room, 
          users: roomUsers,
          roomState: {
            id: roomState.id,
            settings: roomState.settings,
            activeScreenShare: roomState.activeScreenShare
          },
          yourState: userState
        });
        
        // Send current room users for WebRTC connections
        socket.emit('room-users', roomUsers);
        
        // Notify others in room about new user
        socket.to(room).emit('user-joined', {
          id: userState.id,
          name: userState.name,
          mediaState: userState.mediaState,
          permissions: userState.permissions,
          joinedAt: userState.joinedAt
        });
        
        // Broadcast updated room stats
        broadcastRoomStats(room);
        
        console.log(`✅ ${name} successfully joined room: ${room}`);
        console.log(`📊 Room ${room} now has ${roomState.users.size} users`);
        
      } catch (error) {
        console.error('❌ Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    // Media state management
    socket.on('media-state-change', ({ type, enabled }) => {
      const user = users.get(socket.id);
      if (!user) return;
      
      console.log(`🎥 ${user.name} ${enabled ? 'enabled' : 'disabled'} ${type}`);
      
      // Update user state
      if (type === 'video') user.mediaState.video = enabled;
      if (type === 'audio') user.mediaState.audio = enabled;
      if (type === 'screenShare') {
        user.mediaState.screenShare = enabled;
        
        // Handle screen share exclusivity
        const roomState = rooms.get(user.room);
        if (enabled) {
          // Stop any existing screen share
          if (roomState.activeScreenShare && roomState.activeScreenShare !== socket.id) {
            const currentSharer = users.get(roomState.activeScreenShare);
            if (currentSharer) {
              currentSharer.mediaState.screenShare = false;
              io.to(currentSharer.id).emit('screen-share-stopped', { reason: 'Another user started sharing' });
            }
          }
          roomState.activeScreenShare = socket.id;
        } else {
          if (roomState.activeScreenShare === socket.id) {
            roomState.activeScreenShare = null;
          }
        }
      }
      
      // Broadcast state change to room
      socket.to(user.room).emit('user-media-state-changed', {
        userId: socket.id,
        userName: user.name,
        type,
        enabled,
        mediaState: user.mediaState
      });
      
      broadcastRoomStats(user.room);
    });

    // Chat message handling
    socket.on('chat-message', ({ message, type = 'text' }) => {
      const user = users.get(socket.id);
      if (!user || !user.room) return;
      
      const roomState = rooms.get(user.room);
      if (!roomState.settings.allowChat) {
        socket.emit('error', { message: 'Chat is disabled in this room' });
        return;
      }
      
      const chatMessage = {
        id: `msg_${Date.now()}_${socket.id}`,
        userId: socket.id,
        userName: user.name,
        message,
        type,
        timestamp: new Date().toISOString()
      };
      
      // Add to room chat history
      roomState.chatHistory.push(chatMessage);
      
      // Keep only last 100 messages
      if (roomState.chatHistory.length > 100) {
        roomState.chatHistory = roomState.chatHistory.slice(-100);
      }
      
      console.log(`💬 Chat message from ${user.name} in ${user.room}: ${message}`);
      
      // Broadcast to room
      io.to(user.room).emit('chat-message', chatMessage);
    });

    // Handle WebRTC signaling - corrected event names to match client
    socket.on('offer', ({ to, offer }) => {
      console.log(`📡 Relaying offer from ${socket.id} to ${to}`);
      socket.to(to).emit('offer', { from: socket.id, offer });
    });

    socket.on('answer', ({ to, answer }) => {
      console.log(`📡 Relaying answer from ${socket.id} to ${to}`);
      socket.to(to).emit('answer', { from: socket.id, answer });
    });

    socket.on('ice-candidate', ({ to, candidate }) => {
      console.log(`🧊 Relaying ICE candidate from ${socket.id} to ${to}`);
      socket.to(to).emit('ice-candidate', { from: socket.id, candidate });
    });

    // Handle disconnection with full cleanup
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.id}`);
      console.log(`📊 Total connected users after disconnect: ${io.sockets.sockets.size}`);
      
      const user = users.get(socket.id);
      if (user) {
        handleUserLeaveRoom(socket, user);
        users.delete(socket.id);
        
        console.log(`🧹 Cleaned up user state for ${user.name}`);
      }
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, '0.0.0.0', () => {
      console.log(`> Ready on http://0.0.0.0:${port}`);
    });
});
