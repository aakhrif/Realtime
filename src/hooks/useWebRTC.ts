import { useEffect, useRef, useState, useCallback } from 'react';
import SimplePeer from 'simple-peer';
import { Socket } from 'socket.io-client';

export interface PeerConnection {
  id: string;
  name: string;
  peer: SimplePeer.Instance;
  stream?: MediaStream;
}

export const useWebRTC = (
  roomId: string, 
  userName: string, 
  socket: Socket | null, 
  initialStream?: MediaStream | null,
  enableMedia: boolean = true // New: Allow disabling media
) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(initialStream || null);
  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(initialStream || null);
  const socketRef = useRef<Socket | null>(socket);

  // Update socket reference when socket changes
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // Get user media
  const getUserMedia = useCallback(async (video = true, audio = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: 640, height: 480 } : false,
        audio
      });
      
      setLocalStream(stream);
      localStreamRef.current = stream;
      setError(null);
      return stream;
    } catch (err) {
      console.error('Error accessing media devices:', err);
      setError('Failed to access camera/microphone. Please check permissions.');
      throw err;
    }
  }, []);

  // Stop screen share
  const stopScreenShare = useCallback(async () => {
    try {
      await getUserMedia(isVideoEnabled, isAudioEnabled);
      setIsScreenSharing(false);
    } catch (err) {
      console.error('Error stopping screen share:', err);
    }
  }, [getUserMedia, isVideoEnabled, isAudioEnabled]);

  // Get screen share
  const getScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      // Update local stream
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          localStreamRef.current.removeTrack(videoTrack);
        }
        localStreamRef.current.addTrack(stream.getVideoTracks()[0]);
      }

      setLocalStream(localStreamRef.current);
      setIsScreenSharing(true);

      // Handle screen share end
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      return stream;
    } catch (err) {
      console.error('Error accessing screen share:', err);
      setError('Failed to share screen.');
      throw err;
    }
  }, [stopScreenShare]);

  // Create peer connection
  const createPeer = useCallback((userId: string, userName: string, initiator: boolean): SimplePeer.Instance => {
    // Prevent duplicate peer creation
    if (peersRef.current.has(userId)) {
      console.log(`⚠️ Peer for ${userName} (${userId}) already exists, skipping creation.`);
      return peersRef.current.get(userId)!.peer;
    }
    console.log(`🔗 Creating ${initiator ? 'initiating' : 'receiving'} peer connection for ${userName} (${userId})`);
    const peer = new SimplePeer({
      initiator,
      trickle: false,
      stream: localStreamRef.current || undefined,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    const socket = socketRef.current;
    if (!socket) {
      console.error('❌ Socket not available for peer connection');
      return peer;
    }

    peer.on('signal', (signal: SimplePeer.SignalData) => {
      console.log(`📤 Sending ${signal.type} signal to ${userName} (${userId})`);
      if (signal.type === 'offer') {
        socket.emit('offer', { to: userId, offer: signal });
      } else if (signal.type === 'answer') {
        socket.emit('answer', { to: userId, answer: signal });
      } else if ('candidate' in signal) {
        socket.emit('ice-candidate', { to: userId, candidate: signal });
      }
    });

    peer.on('stream', (remoteStream: MediaStream) => {
      console.log(`📺 Received stream from ${userName} (${userId})`);
      const peerConnection: PeerConnection = {
        id: userId,
        name: userName,
        peer,
        stream: remoteStream
      };
      peersRef.current.set(userId, peerConnection);
      setPeers(new Map(peersRef.current));
    });

    peer.on('connect', () => {
      console.log(`✅ Peer connection established with ${userName} (${userId})`);
    });

    peer.on('error', (err: Error) => {
      console.error(`❌ Peer connection error with ${userName}:`, err);
      if (
        err.message?.includes('User-Initiated Abort') ||
        err.message?.includes('reason=Close called')
      ) {
        return;
      }
      setError(`Connection failed with user ${userName}: ${err.message}`);
    });

    peer.on('close', () => {
      console.log(`🔌 Peer connection closed with ${userName} (${userId})`);
      peersRef.current.delete(userId);
      setPeers(new Map(peersRef.current));
    });

    // Store peer connection temporarily (will be updated when stream is received)
    const tempPeerConnection: PeerConnection = {
      id: userId,
      name: userName,
      peer,
      stream: undefined
    };
    peersRef.current.set(userId, tempPeerConnection);
    setPeers(new Map(peersRef.current));

    return peer;
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, []);


  // Prevent duplicate join-room emits
  const joinedRoomRef = useRef(false);

  // Track event handler call counts for debugging
  const eventCallCountsRef = useRef<{ [key: string]: number }>({});

  // Initialize WebRTC when room and user are ready
  useEffect(() => {
    if (!socket || !roomId || !userName) {
      console.log('⏳ useWebRTC: Waiting for socket, roomId, or userName...', { 
        hasSocket: !!socket, 
        roomId, 
        userName 
      });
      return;
    }

    console.log(`🚪 Setting up WebRTC for room: ${roomId}, user: ${userName}`);

    let mounted = true;
    // Capture peers ref at effect start for cleanup
    const peersRefForCleanup = peersRef.current;

    const initializeWebRTC = async () => {
      if (!mounted) return;
      if (joinedRoomRef.current) {
        console.log('🛑 Already joined room, skipping join-room emit');
        return;
      }
      try {
        // Use initial stream if provided, otherwise get user media (if enabled)
        let stream: MediaStream | null = null;
        if (initialStream) {
          stream = initialStream;
          setLocalStream(stream);
          localStreamRef.current = stream;
          setError(null);
        } else if (enableMedia) {
          // Only try to get media if enabled
          stream = await getUserMedia();
        } else {
          // Join without media - just audio/video call participation without own stream
          console.log('🔇 Joining room without media access');
          setLocalStream(null);
          localStreamRef.current = null;
          setError(null);
        }
        
        if (mounted && socket.connected) {
          console.log(`🚪 Joining room ${roomId} as ${userName}${enableMedia ? ' (with media)' : ' (media-free)'}`);
          socket.emit('join-room', { room: roomId, name: userName, mediaEnabled: enableMedia });
          joinedRoomRef.current = true;
        }
      } catch (err) {
        console.error('Failed to initialize WebRTC:', err);
        if (enableMedia) {
          setError('Failed to initialize video/audio. Please check permissions.');
        } else {
          // If media was disabled, this shouldn't be an error
          setError(null);
        }
      }
    };

    // Socket event handlers for WebRTC signaling

    const handleUserJoined = ({ id, name }: { id: string; name: string }) => {
      eventCallCountsRef.current['user-joined'] = (eventCallCountsRef.current['user-joined'] || 0) + 1;
      console.log(`👥 User ${name} (${id}) joined room [call #${eventCallCountsRef.current['user-joined']}]`);
      if (!mounted) return;
      if (id === socket.id) return; // Don't create peer for self
      if (peersRef.current.has(id)) {
        console.warn(`⚠️ Peer for ${name} (${id}) already exists on user-joined, skipping.`);
        return;
      }
      console.log(`🤝 Creating initiating peer connection to ${name}`);
      createPeer(id, name, true);
      logPeerStates('user-joined');
    };


    const handleUserLeft = ({ id, name }: { id: string; name?: string }) => {
      eventCallCountsRef.current['user-left'] = (eventCallCountsRef.current['user-left'] || 0) + 1;
      console.log(`👋 User ${name || id} left room [call #${eventCallCountsRef.current['user-left']}]`);
      if (!mounted) return;
      const peerConnection = peersRef.current.get(id);
      if (peerConnection) {
        console.log(`🔌 Destroying peer connection with ${name || id}`);
        peerConnection.peer.destroy();
        peersRef.current.delete(id);
        setPeers(new Map(peersRef.current));
      } else {
        console.warn(`⚠️ Tried to destroy peer for ${name || id}, but no peer existed.`);
      }
      logPeerStates('user-left');
    };


    const handleRoomUsers = (users: { id: string; name: string }[]) => {
      eventCallCountsRef.current['room-users'] = (eventCallCountsRef.current['room-users'] || 0) + 1;
      console.log(`📋 Current room users [call #${eventCallCountsRef.current['room-users']}]:`, users);
      if (!mounted) return;
      users.forEach((user) => {
        // Only create peer as receiver (initiator: false) for existing users
        if (user.id !== socket.id && !peersRef.current.has(user.id)) {
          console.log(`🤝 Creating receiving peer connection to ${user.name}`);
          createPeer(user.id, user.name, false);
        }
      });
    };


    const handleOffer = ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      eventCallCountsRef.current['offer'] = (eventCallCountsRef.current['offer'] || 0) + 1;
      console.log(`📡 Received offer from ${from} [call #${eventCallCountsRef.current['offer']}]`);
      if (!mounted) return;
      if (peersRef.current.has(from)) {
        console.warn(`⚠️ Peer for ${from} already exists on offer, skipping peer creation.`);
      }
      const peerConnection = peersRef.current.get(from);
      if (peerConnection) {
        // Check signaling state before accepting offer
        const pc = peerConnection.peer as any;
        const state = pc._pc?.signalingState;
        console.log(`🔍 Peer signalingState for offer: ${state}`);
        if (state !== 'stable') {
          console.warn(`⚠️ Ignoring offer from ${from} (invalid state: ${state})`);
          return;
        }
        peerConnection.peer.signal(offer);
      } else {
        console.log(`🆕 Creating new peer for incoming offer from ${from}`);
        const newPeer = createPeer(from, from, false);
        newPeer.signal(offer);
      }
      logPeerStates('offer');
    };


    const handleAnswer = ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      eventCallCountsRef.current['answer'] = (eventCallCountsRef.current['answer'] || 0) + 1;
      console.log(`📡 Received answer from ${from} [call #${eventCallCountsRef.current['answer']}]`);
      if (!mounted) return;
      const peerConnection = peersRef.current.get(from);
      if (peerConnection) {
        // Check signaling state before accepting answer
        const pc = peerConnection.peer as any;
        const state = pc._pc?.signalingState;
        console.log(`🔍 Peer signalingState for answer: ${state}`);
        if (state !== 'have-remote-offer' && state !== 'have-local-pranswer') {
          console.warn(`⚠️ Ignoring answer from ${from} (invalid state: ${state})`);
          return;
        }
        peerConnection.peer.signal(answer);
      }
      logPeerStates('answer');
    };


    const handleIceCandidate = ({ from, candidate }: { from: string; candidate: SimplePeer.SignalData }) => {
      eventCallCountsRef.current['ice-candidate'] = (eventCallCountsRef.current['ice-candidate'] || 0) + 1;
      console.log(`🧊 Received ICE candidate from ${from} [call #${eventCallCountsRef.current['ice-candidate']}]`);
      if (!mounted) return;
      const peerConnection = peersRef.current.get(from);
      if (peerConnection) {
        peerConnection.peer.signal(candidate);
      }
    };

    // Helper log: Print all current peer IDs and their signaling states
    const logPeerStates = (context: string) => {
      const states: Record<string, string | undefined> = {};
      peersRef.current.forEach((peerConn, id) => {
        const pc = (peerConn.peer as any)._pc;
        states[id] = pc?.signalingState;
      });
      console.log(`[PEER STATES][${context}]`, states);
    };


    // Always clean up listeners before registering to avoid duplicates
    console.log('[WebRTC] Cleaning up old socket listeners before registering new ones');
    socket.off('user-joined', handleUserJoined);
    socket.off('user-left', handleUserLeft);
    socket.off('room-users', handleRoomUsers);
    socket.off('offer', handleOffer);
    socket.off('answer', handleAnswer);
    socket.off('ice-candidate', handleIceCandidate);
    socket.off('connect', initializeWebRTC);

    console.log('[WebRTC] Registering socket listeners');
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('room-users', handleRoomUsers);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);

    // Initialize when socket connects
    if (socket.connected) {
      initializeWebRTC();
    } else {
      socket.on('connect', initializeWebRTC);
    }

    return () => {
      mounted = false;
      joinedRoomRef.current = false;
      console.log('🧹 Cleaning up WebRTC connections');
      // Use captured peersRef for cleanup
      console.log('[WebRTC] Cleaning up socket listeners');
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('room-users', handleRoomUsers);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('connect', initializeWebRTC);
      peersRefForCleanup.forEach((peerConnection) => {
        peerConnection.peer.destroy();
      });
      peersRefForCleanup.clear();
      setPeers(new Map());
      // Don't cleanup initial stream as it's provided externally
      if (localStreamRef.current && localStreamRef.current !== initialStream) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [socket, roomId, userName, initialStream, enableMedia, getUserMedia, createPeer]);

  return {
    localStream,
    peers,
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    error,
    toggleVideo,
    toggleAudio,
    getScreenShare,
    stopScreenShare
  };
};
