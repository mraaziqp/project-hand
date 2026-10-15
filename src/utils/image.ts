// Image helpers: phone cameras produce 12MP+ photos, which are slow to upload on
// mobile data and exceed serverless body limits. Everything sent to the vision
// model is downscaled first.

export interface LoadedImage {
  dataUrl: string;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image'));
    img.src = src;
  });
}

function drawScaled(source: CanvasImageSource, srcW: number, srcH: number, maxSide: number, quality: number): LoadedImage {
  const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(source, 0, 0, width, height);
  return { dataUrl: canvas.toDataURL('image/jpeg', quality), width, height };
}

/** Read a picked/captured file, apply EXIF orientation, downscale to maxSide. */
export async function fileToScaledImage(file: File, maxSide = 1600): Promise<LoadedImage> {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const result = drawScaled(bitmap, bitmap.width, bitmap.height, maxSide, 0.85);
      bitmap.close();
      return result;
    } catch {
      // Fall through to <img> decoding (e.g. older Safari, HEIC quirks).
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    return drawScaled(img, img.naturalWidth, img.naturalHeight, maxSide, 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Grab the current video frame, downscaled. */
export function captureVideoFrame(video: HTMLVideoElement, maxSide = 1600): LoadedImage | null {
  if (!video.videoWidth || !video.videoHeight) return null;
  return drawScaled(video, video.videoWidth, video.videoHeight, maxSide, 0.85);
}

export async function makeThumbnail(dataUrl: string, maxSide = 320): Promise<string> {
  try {
    const img = await loadImage(dataUrl);
    return drawScaled(img, img.naturalWidth, img.naturalHeight, maxSide, 0.7).dataUrl;
  } catch {
    return '';
  }
}

export async function getImageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  const img = await loadImage(dataUrl);
  return { width: img.naturalWidth, height: img.naturalHeight };
}
