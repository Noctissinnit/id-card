'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { ZoomIn, ZoomOut, Scissors, X, Sparkles } from 'lucide-react';
import { removeBackground } from '@imgly/background-removal';

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface IDCardCropperProps {
  imageSrc: string;
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

export default function IDCardCropper({ imageSrc, onCropComplete, onCancel }: IDCardCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [removeBg, setRemoveBg] = useState(false);
  const [bgColor, setBgColor] = useState<string>('transparent');
  const [cropperImage, setCropperImage] = useState(imageSrc);
  
  // AI Progress States
  const [aiProgress, setAiProgress] = useState<number | null>(null);
  const [aiStep, setAiStep] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Apply AI-based background removal to the image source inside the cropper
  useEffect(() => {
    if (removeBg) {
      setLoading(true);
      setAiProgress(0);
      setAiStep('Menyiapkan model AI...');
      
      removeBackground(imageSrc, {
        progress: (step, current, total) => {
          const pct = Math.round((current / total) * 100);
          setAiProgress(pct);
          if (step.includes('fetch')) {
            setAiStep(`Mengunduh model AI: ${pct}%`);
          } else if (step.includes('compute')) {
            setAiStep(`Memotong latar belakang: ${pct}%`);
          } else {
            setAiStep(`Memproses: ${pct}%`);
          }
        }
      })
        .then((blob) => {
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
    } else {
      setCropperImage(imageSrc);
      setAiProgress(null);
      setAiStep('');
    }
  }, [removeBg, imageSrc]);

  const onCropChange = (newCrop: { x: number; y: number }) => {
    setCrop(newCrop);
  };

  const onZoomChange = (newZoom: number) => {
    setZoom(newZoom);
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
            aspect={1} // Square aspect ratio since we crop to circle
            cropShape="round" // Round mask to match ID Card circle perfectly
            showGrid={true}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
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

        {/* Zoom Controls */}
        <div className="flex items-center gap-3 py-5 w-full text-slate-700 font-medium px-1">
          <button 
            onClick={() => setZoom(Math.max(1, zoom - 0.2))}
            disabled={loading}
            className="text-slate-400 hover:text-indigo-600 transition p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer disabled:opacity-50"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-label="Zoom"
            disabled={loading}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-grow h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-50"
          />

          <button 
            onClick={() => setZoom(Math.min(3, zoom + 0.2))}
            disabled={loading}
            className="text-slate-400 hover:text-indigo-600 transition p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer disabled:opacity-50"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

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

        {/* BG Color Option */}
        <div className="w-full flex flex-col gap-2 pb-5 px-2 items-start border-t border-slate-100 pt-3.5">
          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
            Warna Latar Foto Baru (Opsional)
          </span>
          <div className="flex items-center gap-3 mt-1 w-full flex-wrap">
            {/* Transparent option */}
            <button
              type="button"
              onClick={() => setBgColor('transparent')}
              disabled={loading}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer disabled:opacity-50 ${
                bgColor === 'transparent'
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-600 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Transparan
            </button>
            {/* Red option */}
            <button
              type="button"
              onClick={() => setBgColor('#df1919')}
              disabled={loading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer disabled:opacity-50 ${
                bgColor === '#df1919'
                  ? 'bg-red-50 border-red-500 text-red-600 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="w-3 h-3 rounded-full bg-[#df1919] border border-black/10 inline-block" />
              Merah
            </button>
            {/* Blue option */}
            <button
              type="button"
              onClick={() => setBgColor('#2b539f')}
              disabled={loading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer disabled:opacity-50 ${
                bgColor === '#2b539f'
                  ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="w-3 h-3 rounded-full bg-[#2b539f] border border-black/10 inline-block" />
              Biru
            </button>

            {/* Custom Color Picker option */}
            <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white hover:bg-slate-50 transition cursor-pointer relative disabled:opacity-50">
              <input
                type="color"
                value={bgColor !== 'transparent' && bgColor !== '#df1919' && bgColor !== '#2b539f' ? bgColor : '#cccccc'}
                disabled={loading}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-4 h-4 border-none p-0 cursor-pointer bg-transparent rounded disabled:opacity-50"
              />
              <span className="text-xs font-semibold text-slate-600">Kustom</span>
            </div>
          </div>
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
