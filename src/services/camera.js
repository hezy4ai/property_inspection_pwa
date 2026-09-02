export const CAMERA_CONFIG = {
  video: {
    facingMode: { ideal: 'environment' },
    width: { ideal: 3840, min: 1920 },
    height: { ideal: 2160, min: 1080 }
  },
  audio: false
};

export async function startCameraStream(constraints = CAMERA_CONFIG) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Camera access is not supported on this browser or device.');
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  } catch (error) {
    console.warn('High-res camera constraints rejected, trying basic environment stream...', error);
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false
    });
  }
}

export function stopCameraStream(stream) {
  if (stream && stream.getTracks) {
    stream.getTracks().forEach((track) => track.stop());
  }
}

export async function captureFrameAsBlob(videoElement, quality = 0.92) {
  if (!videoElement || videoElement.videoWidth === 0) {
    throw new Error('Video stream is not ready or has zero dimensions.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;

  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    const mimeType = 'image/webp';
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          canvas.toBlob(
            (jpegBlob) => {
              if (!jpegBlob) {
                reject(new Error('Failed to generate image blob from camera frame.'));
                return;
              }
              resolve({
                blob: jpegBlob,
                mimeType: 'image/jpeg',
                width: canvas.width,
                height: canvas.height,
                previewUrl: URL.createObjectURL(jpegBlob)
              });
            },
            'image/jpeg',
            quality
          );
          return;
        }

        resolve({
          blob,
          mimeType,
          width: canvas.width,
          height: canvas.height,
          previewUrl: URL.createObjectURL(blob)
        });
      },
      mimeType,
      quality
    );
  });
}

export async function processFileToBlob(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const blob = new Blob([reader.result], { type: file.type });
      resolve({
        blob,
        mimeType: file.type,
        previewUrl: URL.createObjectURL(blob)
      });
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
