'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { Scissors, X, Sparkles, ZoomIn, ZoomOut } from 'lucide-react';
import { removeBackground } from '@imgly/background-removal';
// @ts-expect-error - onnxruntime-web types exist but can't be resolved via package.json "exports"
import * as ort from 'onnxruntime-web';

// Configure ONNX Runtime WASM threading on the ACTUAL module object.
// Setting globalThis.ort has no effect — the library uses its own internal
// module reference.  With Cross-Origin Isolation headers enabled in
// next.config.ts, proper multi-threading via SharedArrayBuffer works.
// We cap threads at 4 to balance speed and memory on typical machines.
if (typeof window !== 'undefined') {
  ort.env.wasm.numThreads = 1;
}

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface IDCardCropperProps {
  imageSrc: string;
  defaultBgColor?: string;
  defaultZoom?: number;
  onCropComplete: (croppedImageBase64: string) => void;
  onCancel: () => void;
}

// Utility function to create an HTML image element from source URL
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // Avoid CORS issues
    image.src = url;
  });

// Utility function to crop the image using canvas
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get 2D context for canvas');
  }

  // Set canvas size to the exact crop area size
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Draw the cropped portion of the image onto the canvas
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // Export canvas content as base64 PNG string to support transparency
  return canvas.toDataURL('image/png');
}

// Utility function to apply a solid background color behind a transparent image
const applyBackgroundColor = (base64Image: string, color: string): Promise<string> =>
  new Promise((resolve, reject) => {
    if (color === 'transparent') {
      resolve(base64Image);
      return;
    }
    const img = new Image();
    img.addEventListener('load', () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Image);
        return;
      }

      // Fill canvas background with solid color
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw the transparent image on top
      ctx.drawImage(img, 0, 0);

      resolve(canvas.toDataURL('image/png'));
    });
    img.addEventListener('error', (error) => reject(error));
    img.src = base64Image;
  });

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;

export default function IDCardCropper({ imageSrc, defaultBgColor = '#1b365d', defaultZoom = 1, onCropComplete, onCancel }: IDCardCropperProps) {
  // Zoom starts at the unit's configured default but can be adjusted freely from there.
  const [zoom, setZoom] = useState(defaultZoom);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [removeBg, setRemoveBg] = useState(false);
  const [bgColor, setBgColor] = useState<string>(defaultBgColor);
  const [cropperImage, setCropperImage] = useState(imageSrc);
  
  // AI Progress States
  const [aiProgress, setAiProgress] = useState<number | null>(null);
  const [aiStep, setAiStep] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Global error listener to alert exact error message on screen
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      alert(`Uncaught Error: ${event.message}\nAt: ${event.filename}:${event.lineno}`);
    };
    const handleRejection = (event: PromiseRejectionEvent) => {
      alert(`Unhandled Promise Rejection: ${event.reason?.message || event.reason}`);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  // Apply AI-based background removal to the image source inside the cropper
  useEffect(() => {
    if (removeBg) {
      if (typeof removeBackground !== 'function') {
        alert('Error: removeBackground is not a function. Check library imports.');
        setRemoveBg(false);
        return;
      }

      setLoading(true);
      setAiProgress(0);
      setAiStep('Menyiapkan model AI...');
      
      try {
        removeBackground(imageSrc, {
          model: 'isnet_quint8',
          device: 'cpu',
          proxyToWorker: true,
          progress: (step, current, total) => {
            try {
              const safeTotal = total || 1;
              const safeCurrent = current || 0;
              const pct = Math.round((safeCurrent / safeTotal) * 100);
              
              setAiProgress(pct);
              if (step && typeof step === 'string') {
                if (step.includes('fetch')) {
                  setAiStep(`Mengunduh model AI: ${pct}%`);
                } else if (step.includes('compute')) {
                  setAiStep(`Memotong latar belakang: ${pct}%`);
                } else {
                  setAiStep(`Memproses: ${pct}%`);
                }
              } else {
                setAiStep(`Memproses: ${pct}%`);
              }
            } catch (err) {
              console.error('Error inside progress callback:', err);
            }
          }
        })
          .then((blob) => {
            if (!blob) {
              throw new Error('Hasil pemotongan background (Blob) kosong.');
            }
            const reader = new FileReader();
            reader.onloadend = () => {
              setCropperImage(reader.result as string);
              setAiProgress(null);
              setAiStep('');
            };
            reader.readAsDataURL(blob);
          })
          .catch((err) => {
            console.error('Error processing background removal:', err);
            alert('Gagal menggunakan AI background remover. Menggunakan foto asli.');
            setRemoveBg(false);
            setAiProgress(null);
            setAiStep('');
          })
          .finally(() => {
            setLoading(false);
          });
      } catch (err) {
        console.error('Synchronous error in background removal:', err);
        alert('Terjadi kesalahan saat memproses background removal. Menggunakan foto asli.');
        setRemoveBg(false);
        setAiProgress(null);
        setAiStep('');
        setLoading(false);
      }
    } else {
      setCropperImage(imageSrc);
      setAiProgress(null);
      setAiStep('');
    }
  }, [removeBg, imageSrc]);

  const onCropChange = (newCrop: { x: number; y: number }) => {
    setCrop(newCrop);
  };

  const onCropCompleteHandler = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCrop = async () => {
    if (!croppedAreaPixels) return;
    setLoading(true);
    try {
      let croppedBase64 = await getCroppedImg(cropperImage, croppedAreaPixels);
      
      // Apply background color if selected
      if (bgColor !== 'transparent') {
        croppedBase64 = await applyBackgroundColor(croppedBase64, bgColor);
      }
      
      onCropComplete(croppedBase64);
    } catch (e) {
      console.error('Failed to crop image:', e);
      alert('Gagal memotong gambar. Silakan coba gambar lain.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="w-full max-w-lg bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 relative overflow-hidden flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center w-full mb-4 pb-3 border-b border-slate-150">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900">Sesuaikan Pas Foto</h3>
          </div>
          <button 
            onClick={onCancel}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 transition p-1 hover:bg-slate-100 rounded-lg cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cropper Box */}
        <div className="relative w-full h-80 bg-zinc-950 rounded-2xl overflow-hidden shadow-inner border border-slate-200">
          <Cropper
            image={cropperImage}
            crop={crop}
            zoom={zoom}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            zoomWithScroll={true}
            aspect={1} // Square aspect ratio since we crop to circle
            cropShape="round" // Round mask to match ID Card circle perfectly
            showGrid={true}
            onCropChange={onCropChange}
            onZoomChange={setZoom}
            onCropComplete={onCropCompleteHandler}
            classes={{
              containerClassName: 'rounded-2xl',
            }}
            style={{
              containerStyle: {
                backgroundColor: bgColor === 'transparent' ? '#09090b' : bgColor
              }
            }}
          />

          {/* AI Processing Overlay */}
          {aiProgress !== null && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-4 p-6 text-center">
              {/* Premium Glow Spinner */}
              <div className="relative h-12 w-12 flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-30" />
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-transparent border-t-indigo-500 border-r-indigo-500" />
              </div>
              
              {/* Progress Text */}
              <div className="space-y-1.5 w-full max-w-xs">
                <div className="flex items-center justify-center gap-1.5 text-indigo-400">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  <p className="text-sm font-bold text-zinc-100">Menghapus Latar (AI)</p>
                </div>
                <p className="text-xs text-zinc-300 font-semibold">{aiStep}</p>
                <p className="text-[10px] text-zinc-400 font-mono">Diproses aman & lokal di browser Anda</p>
                
                {/* Progress Bar */}
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-3 shadow-inner">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_#6366f1]"
                    style={{ width: `${aiProgress}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Zoom controls */}
        <div className="w-full flex items-center gap-3 pt-4 px-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, Number((z - ZOOM_STEP).toFixed(2))))}
            disabled={loading || zoom <= MIN_ZOOM}
            className="shrink-0 p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Perkecil zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={ZOOM_STEP}
            value={zoom}
            disabled={loading}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-40"
          />
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, Number((z + ZOOM_STEP).toFixed(2))))}
            disabled={loading || zoom >= MAX_ZOOM}
            className="shrink-0 p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Perbesar zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="shrink-0 text-[11px] font-mono font-semibold text-slate-500 w-9 text-right">{zoom.toFixed(1)}x</span>
        </div>

        {/* Position hint */}
        <p className="w-full pt-2 pb-4 px-1 text-xs text-slate-500 text-center">
          Geser foto di dalam bingkai untuk mengatur posisinya, dan gunakan tombol/slider di atas untuk memperbesar atau memperkecil.
        </p>

        {/* BG Removal Option */}
        <div className="flex flex-col gap-3 pb-4 w-full items-start px-2">
          <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={removeBg}
              disabled={loading}
              onChange={(e) => setRemoveBg(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 border-slate-350 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
            />
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 fill-indigo-100" />
              Hapus Latar Belakang Otomatis (AI)
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 w-full border-t border-slate-150 pt-4">
          <button
            onClick={onCancel}
            disabled={loading}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl transition duration-200 text-sm cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleCrop}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl transition duration-200 text-sm cursor-pointer shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading && aiProgress === null ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-transparent border-t-white" />
                <span>Memotong...</span>
              </>
            ) : (
              <span>Terapkan Potongan</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
