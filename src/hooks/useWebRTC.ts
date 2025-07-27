import { useEffect, useRef, useState, useCallback } from 'react';
import SimplePeer from 'simple-peer';
import { Socket } from 'socket.io-client';

export interface PeerConnection {
  id: string;
  name: string;
  peer: SimplePeer.Instance;
  stream?: MediaStream;
}

export const useWebRTC = (roomId: string, userName: string, socket: Socket | null, initialStream?: MediaStream | null) => {
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

  // Initialize WebRTC when room and user are ready
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !roomId || !userName) return;

    console.log(`🚪 Setting up WebRTC for room: ${roomId}, user: ${userName}`);

    let mounted = true;
    const currentPeers = peersRef.current; // Capture peers ref at effect start

    const initializeWebRTC = async () => {
      if (!mounted) return;
      
      try {
        // Use initial stream if provided, otherwise get user media
        let stream: MediaStream;
        if (initialStream) {
          stream = initialStream;
          setLocalStream(stream);
          localStreamRef.current = stream;
          setError(null);
        } else {
          stream = await getUserMedia();
        }
        
        if (mounted && socket.connected) {
          console.log(`🚪 Joining room ${roomId} as ${userName}`);
          socket.emit('join-room', { room: roomId, name: userName });
        }
      } catch (err) {
        console.error('Failed to initialize WebRTC:', err);
        setError('Failed to initialize video/audio. Please check permissions.');
      }
    };

    // Socket event handlers for WebRTC signaling
    const handleUserJoined = ({ id, name }: { id: string; name: string }) => {
      if (!mounted) return;
      console.log(`👥 User ${name} (${id}) joined room`);
      
      // Create peer connection as initiator for the new user
      if (id !== socket.id && !currentPeers.has(id)) {
        console.log(`🤝 Creating initiating peer connection to ${name}`);
        createPeer(id, name, true);
      }
    };

    const handleUserLeft = ({ id, name }: { id: string; name?: string }) => {
      if (!mounted) return;
      console.log(`👋 User ${name || id} left room`);
      
      const peerConnection = currentPeers.get(id);
      if (peerConnection) {
        console.log(`🔌 Destroying peer connection with ${name || id}`);
        peerConnection.peer.destroy();
        currentPeers.delete(id);
        setPeers(new Map(currentPeers));
      }
    };

    const handleRoomUsers = (users: { id: string; name: string }[]) => {
      if (!mounted) return;
      console.log(`📋 Current room users:`, users);
      
      users.forEach((user) => {
        if (user.id !== socket.id && !currentPeers.has(user.id)) {
          console.log(`🤝 Creating receiving peer connection to ${user.name}`);
          createPeer(user.id, user.name, false);
        }
      });
    };

    const handleOffer = ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      if (!mounted) return;
      console.log(`📡 Received offer from ${from}`);
      
      const peerConnection = currentPeers.get(from);
      if (peerConnection) {
        peerConnection.peer.signal(offer);
      } else {
        console.log(`🆕 Creating new peer for incoming offer from ${from}`);
        const newPeer = createPeer(from, from, false);
        newPeer.signal(offer);
      }
    };

    const handleAnswer = ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      if (!mounted) return;
      console.log(`📡 Received answer from ${from}`);
      
      const peerConnection = currentPeers.get(from);
      if (peerConnection) {
        peerConnection.peer.signal(answer);
      }
    };

    const handleIceCandidate = ({ from, candidate }: { from: string; candidate: SimplePeer.SignalData }) => {
      if (!mounted) return;
      console.log(`🧊 Received ICE candidate from ${from}`);
      
      const peerConnection = currentPeers.get(from);
      if (peerConnection) {
        peerConnection.peer.signal(candidate);
      }
    };

    // Register socket event listeners
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
      
      console.log('🧹 Cleaning up WebRTC connections');
      
      // Capture current peers reference for cleanup
      const currentPeers = peersRef.current;
      
      // Cleanup event listeners
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('room-users', handleRoomUsers);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('connect', initializeWebRTC);
      
      // Cleanup peers
      currentPeers.forEach((peerConnection) => {
        peerConnection.peer.destroy();
      });
      currentPeers.clear();
      setPeers(new Map());

      // Don't cleanup initial stream as it's provided externally
      if (localStreamRef.current && localStreamRef.current !== initialStream) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [roomId, userName, initialStream, getUserMedia, createPeer]);

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
