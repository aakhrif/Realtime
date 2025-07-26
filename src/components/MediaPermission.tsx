'use client';

import { useState } from 'react';

interface MediaPermissionProps {
  onPermissionGranted: (stream: MediaStream) => void;
  onPermissionDenied: (error: string) => void;
}

export const MediaPermission: React.FC<MediaPermissionProps> = ({
  onPermissionGranted,
  onPermissionDenied
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermissions = async () => {
    setIsRequesting(true);
    setError(null);

    try {
      // Explizit nach Kamera und Mikrofon fragen
      const stream = await navigator.mediaDevices.getUserMedia({
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
      });

      console.log('Media permissions granted successfully');
      onPermissionGranted(stream);
      
    } catch (err: unknown) {
      console.error('Media permission error:', err);
      
      let errorMessage = 'Fehler beim Zugriff auf Kamera/Mikrofon';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Kamera- und Mikrofonzugriff wurde verweigert. Bitte erlauben Sie den Zugriff in den Browser-Einstellungen.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'Keine Kamera oder Mikrofon gefunden. Bitte stellen Sie sicher, dass Geräte angeschlossen sind.';
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
          disabled={isRequesting || !!browserError}
          className={`w-full font-semibold py-3 px-6 rounded-lg transition duration-200 ${
            isRequesting || browserError
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white transform hover:scale-105'
          }`}
        >
          {isRequesting ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Zugriff wird angefragt...
            </div>
          ) : (
            'Kamera & Mikrofon aktivieren'
          )}
        </button>

        <div className="mt-4">
          <p className="text-xs text-gray-500">
            Sie können die Berechtigungen jederzeit in Ihren Browser-Einstellungen ändern
          </p>
        </div>
      </div>
    </div>
  );
};
