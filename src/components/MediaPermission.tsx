'use client';

import { useState, useEffect } from 'react';

interface MediaPermissionProps {
  onPermissionGranted: (stream: MediaStream) => void;
  onPermissionDenied: (error: string) => void;
  onEnterWithoutMedia?: () => void; // New: Allow entering without media
  isSocketReady?: boolean; // Neu: Socket.IO-Status
}

// Mobile Detection
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// HTTPS Detection
const isSecureContext = () => {
  if (typeof window === 'undefined') return false;
  return window.location.protocol === 'https:' || window.location.hostname === 'localhost';
};

export const MediaPermission: React.FC<MediaPermissionProps> = ({
  onPermissionGranted,
  onPermissionDenied,
  onEnterWithoutMedia,
  isSocketReady
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<{
    isMobile: boolean;
    isSecure: boolean;
    browser: string;
  } | null>(null);

  useEffect(() => {
    // Device Detection für bessere Mobile-Unterstützung
    setDeviceInfo({
      isMobile: isMobile(),
      isSecure: isSecureContext(),
      browser: navigator.userAgent.includes('iPhone') ? 'Safari iOS' : 
               navigator.userAgent.includes('Android') ? 'Chrome Android' : 'Desktop'
    });
  }, []);

  const requestPermissions = async () => {
    setIsRequesting(true);
    setError(null);

    // Mobile-spezifische Warnung für HTTPS
    if (deviceInfo?.isMobile && !deviceInfo?.isSecure) {
      const httpsError = 'Mobile Browser benötigen HTTPS für Kamera-Zugriff. Bitte nutzen Sie eine sichere Verbindung.';
      setError(httpsError);
      onPermissionDenied(httpsError);
      setIsRequesting(false);
      return;
    }

    try {
      // Mobile-optimierte Media Constraints
      const mobileConstraints = {
        video: {
          width: { ideal: 640, max: 1280 }, // Kleinere Auflösung für Mobile
          height: { ideal: 480, max: 720 },
          facingMode: 'user',
          frameRate: { ideal: 15, max: 30 } // Niedrigere Framerate für bessere Performance
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      };

      const desktopConstraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };

      const constraints = deviceInfo?.isMobile ? mobileConstraints : desktopConstraints;
      
      console.log(`🎥 Requesting media permissions for ${deviceInfo?.browser}...`, constraints);
      
      // Try progressive fallback for mobile
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✅ Primary constraints succeeded');
      } catch (primaryError) {
        console.warn('⚠️ Primary constraints failed, trying fallback...', primaryError);
        
        if (deviceInfo?.isMobile) {
          // Mobile fallback: Lower quality
          const mobileFallback = {
            video: {
              width: { ideal: 320, max: 640 },
              height: { ideal: 240, max: 480 },
              frameRate: { ideal: 10, max: 15 }
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true
            }
          };
          
          try {
            stream = await navigator.mediaDevices.getUserMedia(mobileFallback);
            console.log('✅ Mobile fallback succeeded');
          } catch (fallbackError) {
            console.warn('⚠️ Mobile fallback failed, trying minimal...', fallbackError);
            // Minimal fallback
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            console.log('✅ Minimal constraints succeeded');
          }
        } else {
          // Desktop fallback
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          console.log('✅ Desktop fallback succeeded');
        }
      }

      // Validate stream
      if (!stream || !stream.active) {
        throw new Error('Media stream is not available or active');
      }

      console.log('✅ Media permissions granted successfully');
      onPermissionGranted(stream);
      
    } catch (err: unknown) {
      console.error('Media permission error:', err);
      
      let errorMessage = 'Fehler beim Zugriff auf Kamera/Mikrofon';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = deviceInfo?.isMobile 
            ? 'Kamera-Zugriff verweigert. Auf Mobile: Gehen Sie zu Browser-Einstellungen → Website-Einstellungen → Kamera erlauben.'
            : 'Kamera- und Mikrofonzugriff wurde verweigert. Bitte erlauben Sie den Zugriff in den Browser-Einstellungen.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = deviceInfo?.isMobile
            ? 'Keine Kamera gefunden. Überprüfen Sie, ob eine andere App die Kamera verwendet.'
            : 'Keine Kamera oder Mikrofon gefunden. Bitte stellen Sie sicher, dass Geräte angeschlossen sind.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Kamera/Mikrofon wird bereits von einer anderen Anwendung verwendet.';
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'Ihre Kamera unterstützt nicht die angeforderte Auflösung.';
        }
      }

      setError(errorMessage);
      onPermissionDenied(errorMessage);
    } finally {
      setIsRequesting(false);
    }
  };

  const checkBrowserSupport = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return 'Ihr Browser unterstützt keine Kamera-/Mikrofonzugriffe. Bitte verwenden Sie einen modernen Browser.';
    }
    return null;
  };

  const browserError = checkBrowserSupport();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Kamera & Mikrofon Zugriff
          </h1>
          <p className="text-gray-600">
            Für den Video-Chat benötigen wir Zugriff auf Ihre Kamera und Ihr Mikrofon
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="font-medium text-red-800">Zugriff fehlgeschlagen</span>
            </div>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {browserError && (
          <div className="mb-6 p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
            <p className="text-sm text-yellow-800">{browserError}</p>
          </div>
        )}

        {/* Mobile-spezifische Hinweise */}
        {deviceInfo?.isMobile && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
              <span className="font-medium text-blue-800">Mobile Browser ({deviceInfo.browser})</span>
            </div>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• HTTPS erforderlich für Kamera-Zugriff</p>
              <p>• Bei Problemen: Browser-Einstellungen → Diese Website → Kamera erlauben</p>
              <p>• Schließen Sie andere Apps, die die Kamera verwenden</p>
            </div>
          </div>
        )}

        {/* HTTPS Warnung für Mobile */}
        {deviceInfo?.isMobile && !deviceInfo?.isSecure && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span className="font-medium text-red-800">Unsichere Verbindung</span>
            </div>
            <p className="text-sm text-red-700">
              Mobile Browser benötigen HTTPS für Kamera-Zugriff. 
              Bitte nutzen Sie eine sichere Verbindung (https://).
            </p>
          </div>
        )}

        <div className="mb-6">
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Sichere Verbindung über HTTPS</span>
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Keine Datenaufzeichnung</span>
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Peer-to-Peer Verbindung</span>
            </div>
          </div>
        </div>

        <button
          onClick={requestPermissions}
          disabled={
            isRequesting ||
            !!browserError ||
            (deviceInfo?.isMobile && !deviceInfo?.isSecure)
          }
          className={`w-full font-semibold py-3 px-6 rounded-lg transition duration-200 ${
            isRequesting || browserError || (deviceInfo?.isMobile && !deviceInfo?.isSecure)
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white transform hover:scale-105'
          }`}
        >
          {isRequesting ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Zugriff wird angefragt...
            </div>
          ) : deviceInfo?.isMobile && !deviceInfo?.isSecure ? (
            'HTTPS erforderlich für Mobile'
          ) : (
            `${deviceInfo?.isMobile ? 'Mobile ' : ''}Kamera & Mikrofon aktivieren`
          )}
        </button>

        {/* Enter without media button */}
        {onEnterWithoutMedia && (
          <button
            onClick={onEnterWithoutMedia}
            disabled={isRequesting}
            className="w-full mt-3 font-medium py-3 px-6 rounded-lg transition duration-200 bg-gray-600 hover:bg-gray-700 text-white border border-gray-500"
          >
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              Enter room (without camera/microphone)
            </div>
          </button>
        )}

        <div className="mt-4">
          <p className="text-xs text-gray-500">
            Sie können die Berechtigungen jederzeit in Ihren Browser-Einstellungen ändern
          </p>
          {onEnterWithoutMedia && (
            <p className="text-xs text-gray-400 mt-2">
              💡 <strong>Tipp:</strong> Treten Sie ohne Medien bei, um CPU-Ressourcen zu sparen und nur zu chatten/zuschauen
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
