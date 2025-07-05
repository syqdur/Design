import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RotateCcw, Check } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
  isDarkMode: boolean;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  onClose,
  isDarkMode
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const startCamera = async (facing: 'user' | 'environment' = 'user') => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Kamera konnte nicht geöffnet werden. Bitte überprüfen Sie die Berechtigungen.');
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage(imageUrl);
        stopCamera();
      }
    }, 'image/jpeg', 0.8);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera(facingMode);
  };

  const confirmPhoto = () => {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        onCapture(blob);
      }
    }, 'image/jpeg', 0.8);
  };

  const switchCamera = () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    startCamera(newFacing);
  };

  useEffect(() => {
    startCamera();
    
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className={`relative w-full max-w-md mx-4 rounded-xl overflow-hidden transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className={`text-lg font-semibold transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Selfie aufnehmen
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors duration-300 ${
              isDarkMode 
                ? 'hover:bg-gray-700 text-gray-300' 
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera/Preview Area */}
        <div className="relative aspect-square bg-black">
          {error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-white text-sm px-4">{error}</p>
              </div>
            </div>
          ) : capturedImage ? (
            <img 
              src={capturedImage} 
              alt="Captured selfie" 
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-white text-sm">Kamera wird gestartet...</p>
                  </div>
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isLoading ? 'opacity-0' : 'opacity-100'}`}
              />
            </>
          )}

          {/* Camera flip button */}
          {!capturedImage && !error && (
            <button
              onClick={switchCamera}
              className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-all"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="p-4">
          {capturedImage ? (
            <div className="flex gap-3">
              <button
                onClick={retakePhoto}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors duration-300 ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                }`}
              >
                Wiederholen
              </button>
              <button
                onClick={confirmPhoto}
                className="flex-1 py-3 px-4 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-medium transition-colors duration-300 flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Verwenden
              </button>
            </div>
          ) : (
            <button
              onClick={capturePhoto}
              disabled={isLoading || !!error}
              className={`w-full py-3 px-4 rounded-xl font-medium transition-colors duration-300 flex items-center justify-center gap-2 ${
                isLoading || error
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-pink-600 hover:bg-pink-700 text-white'
              }`}
            >
              <Camera className="w-5 h-5" />
              Foto aufnehmen
            </button>
          )}
        </div>
      </div>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};