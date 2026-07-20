/**
 * Create a cropped image File from react-easy-crop pixel area.
 */
export const getCroppedImageFile = async (
  imageSrc,
  pixelCrop,
  fileName = 'company-logo.png',
  mimeType = 'image/png'
) => {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const size = Math.max(1, Math.round(Math.min(pixelCrop.width, pixelCrop.height)));
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size
  );

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) reject(new Error('Failed to crop image'));
        else resolve(result);
      },
      mimeType,
      0.92
    );
  });

  return new File([blob], fileName, { type: mimeType });
};

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => reject(new Error('Failed to load image')));
    image.crossOrigin = 'anonymous';
    image.src = src;
  });
