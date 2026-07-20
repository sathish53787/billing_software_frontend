import React, { useCallback, useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';
import { FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { getCroppedImageFile } from './cropImage';
import './LogoCropModal.css';

const LogoCropModal = ({ open, imageSrc, onCancel, onComplete }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setProcessing(false);
  }, [open, imageSrc]);

  const onCropComplete = useCallback((_area, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  if (!open || !imageSrc) return null;

  const handleApply = async () => {
    if (!croppedAreaPixels) return;
    setProcessing(true);
    try {
      const file = await getCroppedImageFile(
        imageSrc,
        croppedAreaPixels,
        `company-logo-${Date.now()}.png`,
        'image/png'
      );
      onComplete(file);
    } catch (error) {
      toast.error(error?.message || 'Failed to crop image');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="logo-crop-overlay" role="presentation" onClick={onCancel}>
      <div
        className="logo-crop-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logo-crop-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="logo-crop-head">
          <div>
            <h3 id="logo-crop-title">Crop Logo</h3>
            <p>Drag to reposition · use zoom for a square logo</p>
          </div>
          <button
            type="button"
            className="logo-crop-close"
            onClick={onCancel}
            aria-label="Close crop"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="logo-crop-stage">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="rect"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="logo-crop-zoom">
          <label htmlFor="logoCropZoom">Zoom</label>
          <input
            id="logoCropZoom"
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </div>

        <div className="logo-crop-actions">
          <button type="button" className="logo-crop-btn is-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="logo-crop-btn is-primary"
            onClick={handleApply}
            disabled={processing || !croppedAreaPixels}
          >
            {processing ? 'Cropping...' : 'Apply Crop'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoCropModal;
