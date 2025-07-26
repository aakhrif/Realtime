import { useEffect, useRef, useState, useCallback } from 'react';
import SimplePeer from 'simple-peer';
import { useSocket, UserInfo } from './useSocket';

export interface PeerConnection {
  id: string;
  name: string;
  peer: SimplePeer.Instance;
  stream?: MediaStream;
}

export const useWebRTC = (roomId: string, userName: string, initialStream?: MediaStream | null) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map());
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef(useSocket());

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
    const peer = new SimplePeer({
      initiator,
      trickle: false,
      stream: localStreamRef.current || undefined
    });

    peer.on('signal', (signal: SimplePeer.SignalData) => {
      if (signal.type === 'offer') {
        socketRef.current.sendOffer(userId, signal as RTCSessionDescriptionInit);
      } else if (signal.type === 'answer') {
        socketRef.current.sendAnswer(userId, signal as RTCSessionDescriptionInit);
      }
    });

    peer.on('stream', (remoteStream: MediaStream) => {
      setPeers(prev => {
        const newPeers = new Map(prev);
        const existingPeer = newPeers.get(userId);
        if (existingPeer) {
          existingPeer.stream = remoteStream;
          newPeers.set(userId, existingPeer);
        }
        return newPeers;
      });
    });

    peer.on('connect', () => {
      console.log(`Connected to peer: ${userId}`);
    });

    peer.on('error', (err: Error) => {
      console.error(`Peer connection error with ${userId}:`, err);
      setError(`Connection error with ${userName}`);
    });

    peer.on('close', () => {
      console.log(`Peer connection closed: ${userId}`);
      setPeers(prev => {
        const newPeers = new Map(prev);
        newPeers.delete(userId);
        return newPeers;
      });
      peersRef.current.delete(userId);
    });

    const peerConnection: PeerConnection = {
      id: userId,
      name: userName,
      peer
    };

    peersRef.current.set(userId, peerConnection);
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

  // Initialize WebRTC
  useEffect(() => {
    if (!roomId || !userName) return;

    let mounted = true;
    const currentPeers = peersRef.current;
    const socket = socketRef.current;

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
        
        if (mounted) {
          socket.joinRoom(roomId, userName);
        }
      } catch (err) {
        console.error('Failed to initialize WebRTC:', err);
      }
    };

    // Socket event listeners
    const handleUserJoined = (user: UserInfo) => {
      if (!mounted) return;
      console.log('User joined:', user);
      createPeer(user.id, user.name, true);
    };

    const handleUserLeft = (user: UserInfo) => {
      if (!mounted) return;
      console.log('User left:', user);
      const peerConnection = currentPeers.get(user.id);
      if (peerConnection) {
        peerConnection.peer.destroy();
        currentPeers.delete(user.id);
        setPeers(new Map(currentPeers));
      }
    };

    const handleRoomUsers = (users: UserInfo[]) => {
      if (!mounted) return;
      console.log('Room users:', users);
      users.forEach((user) => {
        if (user.id !== socket.socket?.id) {
          createPeer(user.id, user.name, false);
        }
      });
    };

    const handleOffer = ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      if (!mounted) return;
      const peerConnection = currentPeers.get(from);
      if (peerConnection) {
        peerConnection.peer.signal(offer);
      }
    };

    const handleAnswer = ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      if (!mounted) return;
      const peerConnection = currentPeers.get(from);
      if (peerConnection) {
        peerConnection.peer.signal(answer);
      }
    };

    const handleIceCandidate = ({ from, candidate }: { from: string; candidate: RTCIceCandidate }) => {
      if (!mounted) return;
      const peerConnection = currentPeers.get(from);
      if (peerConnection) {
        peerConnection.peer.signal({ type: 'candidate', candidate });
      }
    };

    // Set up event listeners
    socket.onUserJoined(handleUserJoined);
    socket.onUserLeft(handleUserLeft);
    socket.onRoomUsers(handleRoomUsers);
    socket.onOffer(handleOffer);
    socket.onAnswer(handleAnswer);
    socket.onIceCandidate(handleIceCandidate);

    initializeWebRTC();

    return () => {
      mounted = false;
      
      // Cleanup peers
      currentPeers.forEach((peerConnection) => {
        peerConnection.peer.destroy();
      });
      currentPeers.clear();
      setPeers(new Map());

      // Cleanup media stream if not initial stream
      if (localStreamRef.current && localStreamRef.current !== initialStream) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }

      socket.removeAllListeners();
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
