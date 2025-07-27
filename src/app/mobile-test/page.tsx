'use client';

import { useState, useEffect } from 'react';

export default function MobileTestPage() {
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [mediaSupport, setMediaSupport] = useState<any>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  useEffect(() => {
    // Device Detection
    const info = {
      userAgent: navigator.userAgent,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      isSecure: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
      browserInfo: {
        isChrome: navigator.userAgent.includes('Chrome'),
        isSafari: navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome'),
        isFirefox: navigator.userAgent.includes('Firefox'),
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
        isAndroid: navigator.userAgent.includes('Android')
      }
    };
    setDeviceInfo(info);
    addLog(`📱 Device detected: ${info.isMobile ? 'Mobile' : 'Desktop'}`);

    // Media Support Detection
    const support = {
      getUserMedia: !!navigator.mediaDevices?.getUserMedia,
      enumerateDevices: !!navigator.mediaDevices?.enumerateDevices,
      webRTC: !!(window as any).RTCPeerConnection
    };
    setMediaSupport(support);
    addLog(`🎥 Media support: ${Object.entries(support).filter(([,v]) => v).map(([k]) => k).join(', ')}`);
  }, []);

  const testBasicAccess = async () => {
    addLog('🔄 Testing basic media access...');
    try {
      const testStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      addLog(`✅ Basic access: Video=${testStream.getVideoTracks().length}, Audio=${testStream.getAudioTracks().length}`);
      testStream.getTracks().forEach(track => track.stop());
    } catch (err: any) {
      addLog(`❌ Basic access failed: ${err.name} - ${err.message}`);
    }
  };

  const testMobileOptimized = async () => {
    addLog('📱 Testing mobile-optimized access...');
    setError(null);
    
    try {
      const constraints = {
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 15, max: 30 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: 16000 }
        }
      };

      const testStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(testStream);
      addLog(`✅ Mobile optimized: Video=${testStream.getVideoTracks().length}, Audio=${testStream.getAudioTracks().length}`);
      
      // Show track capabilities
      testStream.getVideoTracks().forEach((track, index) => {
        const settings = track.getSettings();
        addLog(`📹 Video Track ${index}: ${settings.width}x${settings.height}@${settings.frameRate}fps`);
      });
      
    } catch (err: any) {
      const errorMsg = `❌ Mobile optimized failed: ${err.name} - ${err.message}`;
      addLog(errorMsg);
      setError(errorMsg);
    }
  };

  const testProgressiveFallback = async () => {
    addLog('🔄 Testing progressive fallback...');
    setError(null);

    const constraintLevels = [
      // Level 1: High quality
      {
        video: { width: 1280, height: 720, frameRate: 30 },
        audio: { echoCancellation: true, noiseSuppression: true }
      },
      // Level 2: Medium quality
      {
        video: { width: 640, height: 480, frameRate: 15 },
        audio: { echoCancellation: true }
      },
      // Level 3: Low quality
      {
        video: { width: 320, height: 240 },
        audio: true
      },
      // Level 4: Minimal
      { video: true, audio: true }
    ];

    for (let i = 0; i < constraintLevels.length; i++) {
      try {
        addLog(`🎯 Trying constraint level ${i + 1}...`);
        const testStream = await navigator.mediaDevices.getUserMedia(constraintLevels[i]);
        setStream(testStream);
        addLog(`✅ Success at level ${i + 1}!`);
        return;
      } catch (err: any) {
        addLog(`❌ Level ${i + 1} failed: ${err.name}`);
      }
    }
    
    setError('All fallback levels failed');
    addLog('❌ All fallback levels failed');
  };

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      addLog('🛑 Stream stopped');
    }
  };

  const enumerateDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      const audioDevices = devices.filter(d => d.kind === 'audioinput');
      
      addLog(`🎥 Found ${videoDevices.length} cameras, ${audioDevices.length} microphones`);
      
      videoDevices.forEach((device, index) => {
        addLog(`📹 Camera ${index}: ${device.label || 'Unknown'}`);
      });
    } catch (err: any) {
      addLog(`❌ Device enumeration failed: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">📱 Mobile WebRTC Test</h1>
        
        {/* Device Info */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h2 className="font-bold mb-2">🔍 Device Information</h2>
          {deviceInfo && (
            <div className="text-sm space-y-1">
              <p>📱 Mobile: {deviceInfo.isMobile ? 'Yes' : 'No'}</p>
              <p>🔒 Secure: {deviceInfo.isSecure ? 'HTTPS' : 'HTTP'}</p>
              <p>🌐 Browser: {JSON.stringify(deviceInfo.browserInfo)}</p>
              <p>📋 Support: {JSON.stringify(mediaSupport)}</p>
            </div>
          )}
        </div>

        {/* Video Preview */}
        {stream && (
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <h2 className="font-bold mb-2">📹 Live Preview</h2>
            <video
              autoPlay
              muted
              playsInline
              ref={(video) => {
                if (video && stream) {
                  video.srcObject = stream;
                }
              }}
              className="w-full max-w-md mx-auto bg-black rounded"
            />
            <button
              onClick={stopStream}
              className="mt-2 w-full bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
            >
              Stop Stream
            </button>
          </div>
        )}

        {/* Test Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={testBasicAccess}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Test Basic Access
          </button>
          <button
            onClick={testMobileOptimized}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
          >
            Test Mobile Optimized
          </button>
          <button
            onClick={testProgressiveFallback}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded"
          >
            Test Progressive Fallback
          </button>
          <button
            onClick={enumerateDevices}
            className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded"
          >
            Enumerate Devices
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-red-400">❌ Error</h3>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Logs */}
        <div className="bg-black rounded-lg p-4">
          <h2 className="font-bold mb-2">📝 Debug Logs</h2>
          <div className="font-mono text-sm text-green-400 h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p>No logs yet...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-900 rounded-lg p-4">
          <h3 className="font-bold mb-2">📋 Mobile Testing Guide</h3>
          <ul className="text-sm space-y-1">
            <li>• Teste auf echtem mobilen Gerät (nicht Desktop DevTools)</li>
            <li>• Verwende HTTPS oder localhost für Permissions</li>
            <li>• Chrome Android: Gehe zu Einstellungen → Erweitert → Website-Einstellungen</li>
            <li>• Safari iOS: Einstellungen → Safari → Kamera & Mikrofon</li>
            <li>• Bei Fehlern: Browser-Cache leeren und neu laden</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
