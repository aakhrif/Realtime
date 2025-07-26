import { useEffect, useRef } from 'react';

interface VideoPlayerProps {
  stream: MediaStream | null;
  isLocal?: boolean;
  userName?: string;
  muted?: boolean;
  className?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  stream,
  isLocal = false,
  userName = 'Unknown',
  muted = false,
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`relative bg-gray-800 rounded-lg overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted || isLocal}
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
        {isLocal ? 'You' : userName}
      </div>
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
          <div className="text-white text-center">
            <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl">{(isLocal ? 'You' : userName).charAt(0).toUpperCase()}</span>
            </div>
            <p className="text-sm">{isLocal ? 'You' : userName}</p>
            <p className="text-xs text-gray-400">No video</p>
          </div>
        </div>
      )}
    </div>
  );
};
