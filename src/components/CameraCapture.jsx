import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, Trash2, Eye, Upload, AlertCircle, RefreshCw } from 'lucide-react';
import { startCameraStream, stopCameraStream, captureFrameAsBlob, processFileToBlob } from '../services/camera.js';

export default function CameraCapture({ photos = [], onAddPhoto, onDeletePhoto }) {
  const [isOpen, setIsOpen] = useState(false);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  const startCamera = async () => {
    setError(null);
    try {
      const mediaStream = await startCameraStream();
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError(err.message || 'Unable to access camera. Use file upload fallback.');
    }
  };

  const handleOpenModal = async () => {
    setIsOpen(true);
    await startCamera();
  };

  const handleCloseModal = () => {
    stopCameraStream(stream);
    setStream(null);
    setError(null);
    setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
    return () => {
      stopCameraStream(stream);
    };
  }, [isOpen, stream]);

  const handleCapture = async () => {
    if (!videoRef.current || isCapturing) return;
    setIsCapturing(true);

    try {
      const { blob, buffer, mimeType, width, height, previewUrl } = await captureFrameAsBlob(videoRef.current);
      const photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      onAddPhoto({
        id: photoId,
        blob,
        buffer,
        mimeType,
        width,
        height,
        previewUrl
      });

      handleCloseModal();
    } catch (err) {
      setError(`Capture failed: ${err.message}`);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleFileInputChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        const { blob, buffer, mimeType, previewUrl } = await processFileToBlob(file);
        const photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

        onAddPhoto({
          id: photoId,
          blob,
          buffer,
          mimeType,
          previewUrl
        });
      } catch (err) {
        console.error('Failed to process file:', err);
      }
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleOpenModal}
          className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 active:scale-[0.98] text-app-text-primary border border-app-border rounded-xl py-2.5 px-3 text-xs font-semibold shadow-sm transition-all"
        >
          <Camera className="w-4 h-4 text-app-brand-primary" />
          <span>Take Photo</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 active:scale-[0.98] text-app-text-secondary border border-app-border rounded-xl py-2.5 px-3 text-xs font-medium transition-all"
        >
          <Upload className="w-4 h-4 text-app-text-secondary/80" />
          <span>Upload</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {photos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 pt-0.5">
          {photos.map((photo, index) => (
            <div
              key={photo.id || index}
              className="relative group shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-app-border bg-slate-100 shadow-sm"
            >
              <img
                src={photo.previewUrl}
                alt={`Defect photo ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewPhoto(photo)}
                  className="p-1 rounded bg-slate-800/90 text-sky-400 hover:text-white"
                  title="View Full Resolution"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeletePhoto(photo.id)}
                  className="p-1 rounded bg-slate-800/90 text-rose-400 hover:text-white"
                  title="Delete Photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 safe-bottom">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">Live High-Res Viewfinder</span>
            <button
              onClick={handleCloseModal}
              className="p-2 rounded-full bg-slate-800 text-slate-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden rounded-2xl bg-slate-900 border border-slate-800">
            {error ? (
              <div className="p-4 text-center text-rose-400 space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto" />
                <p className="text-xs">{error}</p>
                <button
                  onClick={startCamera}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-200 border border-slate-700"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Camera</span>
                </button>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <div className="flex items-center justify-center pb-2">
            <button
              onClick={handleCapture}
              disabled={isCapturing || !!error}
              className="w-18 h-18 p-1 rounded-full border-4 border-white/80 active:scale-95 transition-all flex items-center justify-center shadow-lg disabled:opacity-50"
            >
              <div className="w-14 h-14 rounded-full bg-white active:bg-sky-400 transition-colors" />
            </button>
          </div>
        </div>
      )}

      {previewPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col justify-between p-4">
          <div className="flex justify-end">
            <button
              onClick={() => setPreviewPhoto(null)}
              className="p-2 rounded-full bg-slate-800 text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-2">
            <img
              src={previewPhoto.previewUrl}
              alt="Full Preview"
              className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl border border-slate-800"
            />
          </div>
        </div>
      )}
    </div>
  );
}
