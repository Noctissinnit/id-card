'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import html2canvas from 'html2canvas-pro';
import { 
  Download, 
  RefreshCw, 
  ShieldCheck, 
  Building, 
  Briefcase, 
  Mail, 
  Phone, 
  Globe,
  Share2,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRightLeft,
  User,
  Printer
} from 'lucide-react';
import { IDCardSession, clearSessionAction } from './actions';
import { useRouter } from 'next/navigation';
import { getPhoto, deletePhoto } from './db';

// Dynamic SVG Barcode Generator
const Barcode = ({ value }: { value: string }) => {
  const lines = [];
  let currentX = 10;
  const barcodeVal = value || '1234567890';
  
  for (let i = 0; i < barcodeVal.length; i++) {
    const charCode = barcodeVal.charCodeAt(i);
    const binary = charCode.toString(2).padStart(7, '0');
    for (const bit of binary) {
      const width = bit === '1' ? 3 : 1;
      lines.push(
        <rect 
          key={`${i}-${currentX}`} 
          x={currentX} 
          y={2} 
          width={width} 
          height={36} 
          fill="currentColor" 
        />
      );
      currentX += width + 1;
    }
  }
  
  return (
    <div className="flex flex-col items-center w-full">
      <svg 
        width="100%" 
        height="40" 
        viewBox={`0 0 ${currentX + 10} 40`} 
        preserveAspectRatio="none" 
        className="text-current"
      >
        {lines}
      </svg>
      <span className="text-[9px] tracking-[4px] mt-1 font-mono uppercase opacity-80">{barcodeVal}</span>
    </div>
  );
};

// Dynamic SVG QR Code Generator (Offline & Responsive)
const QRCode = ({ value }: { value: string }) => {
  const size = 21;
  const grid = Array(size).fill(0).map(() => Array(size).fill(false));
  const qrVal = value || 'https://id-card-generator.local';

  const fillRect = (x: number, y: number, w: number, h: number) => {
    for (let r = y; r < y + h; r++) {
      for (let c = x; c < x + w; c++) {
        if (r >= 0 && r < size && c >= 0 && c < size) {
          grid[r][c] = true;
        }
      }
    }
  };

  const clearRect = (x: number, y: number, w: number, h: number) => {
    for (let r = y; r < y + h; r++) {
      for (let c = x; c < x + w; c++) {
        if (r >= 0 && r < size && c >= 0 && c < size) {
          grid[r][c] = false;
        }
      }
    }
  };

  // Draw positioning blocks (7x7 outline, 3x3 solid center)
  const drawPositionBlock = (x: number, y: number) => {
    fillRect(x, y, 7, 7);
    clearRect(x + 1, y + 1, 5, 5);
    fillRect(x + 2, y + 2, 3, 3);
  };

  drawPositionBlock(0, 0);
  drawPositionBlock(size - 7, 0);
  drawPositionBlock(0, size - 7);

  // Fill random pattern elsewhere (using char codes of value)
  let seed = 0;
  for (let i = 0; i < qrVal.length; i++) {
    seed += qrVal.charCodeAt(i);
  }

  const pseudoRandom = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= size - 8;
      const inBottomLeft = r >= size - 8 && c < 8;
      if (!inTopLeft && !inTopRight && !inBottomLeft) {
        grid[r][c] = pseudoRandom() > 0.45;
      }
    }
  }

  // Draw alignment pattern (5x5 outline, 1x1 center)
  const ax = size - 9;
  const ay = size - 9;
  fillRect(ax, ay, 5, 5);
  clearRect(ax + 1, ay + 1, 3, 3);
  grid[ay + 2][ax + 2] = true;

  // Compile path
  const cellSize = 5;
  const paths: string[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c]) {
        paths.push(`M ${c * cellSize} ${r * cellSize} h ${cellSize} v ${cellSize} h -${cellSize} Z`);
      }
    }
  }

  return (
    <svg 
      width="75" 
      height="75" 
      viewBox={`0 0 ${size * cellSize} ${size * cellSize}`} 
      className="text-current bg-white p-1 rounded-sm"
    >
      <path d={paths.join(' ')} fill="black" />
    </svg>
  );
};

// Theme configurations for background patterns, borders, fonts, colors
interface ThemeConfig {
  name: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  badgeBg: string;
  badgeText: string;
  glow: string;
  logoColor: string;
  fontFamily: string;
  photoBorder: string;
}

const THEMES: Record<string, ThemeConfig> = {
  'karya-bakti': {
    name: 'Karya Bakti',
    cardBg: 'bg-transparent',
    textPrimary: 'text-white font-sans tracking-wide font-extrabold uppercase',
    textSecondary: 'text-yellow-400 font-sans font-bold uppercase tracking-wider',
    accent: 'text-yellow-400 font-sans',
    badgeBg: 'bg-blue-500/10 border border-blue-500/30',
    badgeText: 'text-blue-300 font-sans text-[10px] font-medium',
    glow: 'shadow-lg',
    logoColor: 'text-blue-400',
    fontFamily: 'font-sans',
    photoBorder: 'border-4 border-white rounded-full shadow-lg'
  },
  'cyberpunk': {
    name: 'Cyberpunk Neon',
    cardBg: 'bg-zinc-950 border border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.3)] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-zinc-950 to-zinc-950',
    textPrimary: 'text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400 font-mono tracking-tight font-extrabold',
    textSecondary: 'text-cyan-400 font-mono uppercase text-xs tracking-wider',
    accent: 'text-yellow-400 font-mono',
    badgeBg: 'bg-yellow-400/10 border border-yellow-400/40',
    badgeText: 'text-yellow-400 font-mono text-[10px]',
    glow: 'shadow-[0_0_20px_rgba(6,182,212,0.4)]',
    logoColor: 'text-pink-500',
    fontFamily: 'font-mono',
    photoBorder: 'border-2 border-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)] rounded-none rotate-3'
  },
  'neon-emerald': {
    name: 'Matrix Emerald',
    cardBg: 'bg-black border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)] bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black',
    textPrimary: 'text-emerald-400 font-mono tracking-wide font-bold uppercase',
    textSecondary: 'text-zinc-400 font-mono text-xs',
    accent: 'text-emerald-500 font-mono',
    badgeBg: 'bg-emerald-500/15 border border-emerald-500/30',
    badgeText: 'text-emerald-400 font-mono text-[10px]',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
    logoColor: 'text-emerald-400',
    fontFamily: 'font-mono',
    photoBorder: 'border-2 border-emerald-500 rounded-md shadow-[0_0_8px_rgba(16,185,129,0.4)]'
  },
  'minimal-dark': {
    name: 'Obsidian Dark',
    cardBg: 'bg-zinc-950 border border-zinc-800 shadow-2xl bg-gradient-to-b from-zinc-900 to-zinc-950',
    textPrimary: 'text-zinc-100 font-sans tracking-tight font-semibold',
    textSecondary: 'text-zinc-500 font-sans text-xs',
    accent: 'text-zinc-300 font-sans',
    badgeBg: 'bg-zinc-800/80 border border-zinc-700',
    badgeText: 'text-zinc-200 font-sans text-[10px] font-medium',
    glow: 'shadow-lg',
    logoColor: 'text-zinc-100',
    fontFamily: 'font-sans',
    photoBorder: 'border border-zinc-750 rounded-xl shadow-inner'
  },
  'aurora-teal': {
    name: 'Aurora Teal',
    cardBg: 'bg-slate-950 border border-teal-500/30 shadow-[0_0_20px_rgba(20,184,166,0.15)] bg-[radial-gradient(circle_at_30%_30%,rgba(20,184,166,0.15),transparent_50%)] bg-[radial-gradient(circle_at_70%_70%,rgba(168,85,247,0.1),transparent_50%)]',
    textPrimary: 'text-white font-sans tracking-tight font-bold',
    textSecondary: 'text-teal-400 font-sans text-xs font-semibold uppercase tracking-wider',
    accent: 'text-indigo-300 font-sans',
    badgeBg: 'bg-gradient-to-r from-teal-500/10 to-indigo-500/10 border border-teal-500/30',
    badgeText: 'text-teal-300 font-sans text-[10px] font-medium',
    glow: 'shadow-[0_0_15px_rgba(20,184,166,0.25)]',
    logoColor: 'text-teal-400',
    fontFamily: 'font-sans',
    photoBorder: 'border-2 border-transparent bg-gradient-to-r from-teal-400 to-indigo-500 [background-clip:padding-box,_border-box] rounded-2xl shadow-md'
  },
  'luxury-gold': {
    name: 'Luxury Gold',
    cardBg: 'bg-neutral-950 border border-amber-600/30 shadow-[0_0_20px_rgba(217,119,6,0.15)] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-neutral-950 to-neutral-950',
    textPrimary: 'text-amber-400 font-serif tracking-wide font-bold italic',
    textSecondary: 'text-neutral-400 font-sans text-xs uppercase tracking-widest',
    accent: 'text-amber-500 font-sans',
    badgeBg: 'bg-amber-500/10 border border-amber-500/30',
    badgeText: 'text-amber-400 font-sans text-[10px] uppercase font-bold tracking-wider',
    glow: 'shadow-[0_0_15px_rgba(217,119,6,0.25)]',
    logoColor: 'text-amber-500',
    fontFamily: 'font-serif',
    photoBorder: 'border-2 border-amber-600/50 p-0.5 rounded-none shadow-md'
  }
};

interface IDCardPreviewProps {
  data: IDCardSession;
  customTemplate?: {
    id: number;
    nama: string;
    card_design?: string | null;
    card_design_back?: string | null;
    layout_config?: string | any | null;
  } | null;
}

export default function IDCardPreview({ data, customTemplate }: IDCardPreviewProps) {
  const router = useRouter();
  const [isFlipped, setIsFlipped] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>('');

  useEffect(() => {
    if (data.photoUrl === 'indexeddb') {
      getPhoto('id_card_photo').then((base64) => {
        if (base64) {
          setPhotoUrl(base64);
        }
      });
    } else {
      setPhotoUrl(data.photoUrl);
    }
  }, [data.photoUrl]);
  
  const handleReset = async () => {
    await deletePhoto('id_card_photo');
    await clearSessionAction();
    router.refresh();
  };
  const [downloading, setDownloading] = useState(false);
  const [printTarget, setPrintTarget] = useState<'front' | 'back' | 'both'>('both');

  const triggerPrint = (target: 'front' | 'back' | 'both') => {
    setPrintTarget(target);
    setTimeout(() => {
      window.print();
    }, 50);
  };
  const cardRef = useRef<HTMLDivElement>(null);
  
  // For html2canvas, we render non-rotated, flat versions offscreen
  const exportFrontRef = useRef<HTMLDivElement>(null);
  const exportBackRef = useRef<HTMLDivElement>(null);

  const activeTheme = THEMES[data.theme] || THEMES['minimal-dark'];

  const triggerDownload = async (element: HTMLDivElement, filename: string) => {
    try {
      // Temporarily remove hidden offscreen elements if needed, though they are in DOM
      const canvas = await html2canvas(element, {
        scale: 3, // Premium ultra-crisp resolution
        useCORS: true, // Handle external fonts/images if any
        backgroundColor: null, // Transparent bg
        logging: false,
      });
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Gagal mendownload ID Card. Silakan coba lagi.');
    }
  };

  const handleDownload = async (mode: 'front' | 'back' | 'both') => {
    setDownloading(true);
    
    // Slight delay to allow loader to show
    await new Promise(r => setTimeout(r, 100));

    try {
      const timestamp = new Date().getTime();
      const sanitizedName = data.nama.toLowerCase().replace(/\s+/g, '-');

      if (mode === 'front') {
        if (exportFrontRef.current) {
          await triggerDownload(exportFrontRef.current, `id-card-${sanitizedName}-front-${timestamp}.png`);
        }
      } else if (mode === 'back') {
        if (exportBackRef.current) {
          await triggerDownload(exportBackRef.current, `id-card-${sanitizedName}-back-${timestamp}.png`);
        }
      } else if (mode === 'both') {
        // Create a temporary side-by-side export wrapper in the body
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '-9999px';
        container.style.display = 'flex';
        container.style.gap = '20px';
        container.style.padding = '20px';
        container.style.background = '#09090b'; // dark backdrop for luxury presentation

        const frontClone = exportFrontRef.current?.cloneNode(true) as HTMLDivElement;
        const backClone = exportBackRef.current?.cloneNode(true) as HTMLDivElement;

        if (frontClone && backClone) {
          container.appendChild(frontClone);
          container.appendChild(backClone);
          document.body.appendChild(container);

          await triggerDownload(container, `id-card-${sanitizedName}-full-${timestamp}.png`);
          document.body.removeChild(container);
        }
      }
    } finally {
      setDownloading(false);
    }
  };

  // ID Card Front Template
  const CardFront = ({ isExport = false }: { isExport?: boolean }) => {
    if (customTemplate?.card_design) {
      // Parse custom layout configuration
      let config: any = null
      if (customTemplate.layout_config) {
        if (typeof customTemplate.layout_config === 'string') {
          try {
            config = JSON.parse(customTemplate.layout_config)
          } catch {
            // ignore
          }
        } else {
          config = customTemplate.layout_config
        }
      }

      // Scale factor: CardFront (320×500) / Editor (240×375) = 1.333
      const SCALE = 320 / 240

      // Positions & Dimensions mapping with defaults (percentages scale naturally)
      const posJabatan = config?.jabatan_top !== undefined ? `${config.jabatan_top}%` : '26.5%'
      const posJabatanLeft = config?.jabatan_left !== undefined ? `${config.jabatan_left}%` : '5%'
      const posNik = config?.nik_top !== undefined ? `${config.nik_top}%` : '35%'
      const posNikLeft = config?.nik_left !== undefined ? `${config.nik_left}%` : '5%'
      const posNama = config?.nama_top !== undefined ? `${config.nama_top}%` : '86%'
      const posNamaLeft = config?.nama_left !== undefined ? `${config.nama_left}%` : '5%'
      const posPhoto = config?.photo_top !== undefined ? `${config.photo_top}%` : '43%'
      const posPhotoLeft = config?.photo_left !== undefined ? `${config.photo_left}%` : '26.5%'

      // Photo: editor renders at 0.75× stored value, so actual = stored value (which is editor * 1.333)
      const photoRawW = config?.photo_width !== undefined ? Number(config.photo_width) : 150
      const photoRawH = config?.photo_height !== undefined ? Number(config.photo_height) : 200
      const photoW = `${photoRawW}px`
      const photoH = `${photoRawH}px`
      const photoShape = config?.photo_shape || 'rectangle'
      const textColor = config?.text_color || '#000000'

      // Visibility switches
      const showJabatan = config?.show_jabatan !== undefined ? !!config.show_jabatan : true
      const showNik = config?.show_nik !== undefined ? !!config.show_nik : true
      const showNama = config?.show_nama !== undefined ? !!config.show_nama : true
      const showPhoto = config?.show_photo !== undefined ? !!config.show_photo : true

      // Colors mapping
      const jabatanColor = config?.jabatan_color || textColor
      const nikColor = config?.nik_color || textColor
      const namaColor = config?.nama_color || textColor

      // Scaled element dimensions (editor pixels × SCALE)
      // Editor: text width=216, jabatan h=24, nik h=18, nama h=35
      const textWidth = Math.round(216 * SCALE)   // 288
      const jabatanH = Math.round(24 * SCALE)      // 32
      const nikH = Math.round(18 * SCALE)           // 24
      const namaH = Math.round(35 * SCALE)          // 47

      return (
        <div 
          className="w-[320px] h-[500px] id-card-render relative overflow-hidden shrink-0 select-none bg-white"
          style={{
            boxShadow: isExport ? 'none' : '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            borderRadius: '16px',
            boxSizing: 'border-box'
          }}
        >
          {/* Background Image Template */}
          <img 
            src={customTemplate.card_design} 
            alt="Card Template" 
            crossOrigin="anonymous"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'fill',
              zIndex: 0
            }}
          />

          {/* Jabatan */}
          {showJabatan && (
            <div
              style={{
                position: 'absolute',
                top: posJabatan,
                left: posJabatanLeft,
                width: `${textWidth}px`,
                height: `${jabatanH}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                zIndex: 10
              }}
            >
              <span
                style={{
                  fontFamily: 'sans-serif',
                  fontWeight: '900',
                  fontSize: 
                    (data.jabatan || '').length > 25 ? `${Math.round(11 * SCALE)}px` :
                    (data.jabatan || '').length > 18 ? `${Math.round(13 * SCALE)}px` :
                    (data.jabatan || '').length > 12 ? `${Math.round(11 * SCALE)}px` : `${Math.round(11 * SCALE)}px`,
                  color: jabatanColor,
                  letterSpacing: '0.5px',
                  lineHeight: '1.2',
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}
              >
                {data.jabatan || 'JABATAN'}
              </span>
            </div>
          )}

          {/* NIK */}
          {showNik && (
            <div
              style={{
                position: 'absolute',
                top: posNik,
                left: posNikLeft,
                width: `${textWidth}px`,
                height: `${nikH}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                zIndex: 10
              }}
            >
              <span
                style={{
                  fontFamily: 'sans-serif',
                  fontWeight: '900',
                  fontSize: `${Math.round(10 * SCALE)}px`,
                  color: nikColor,
                  letterSpacing: '0.5px'
                }}
              >
                {data.nik || '690/03/05'}
              </span>
            </div>
          )}

          {/* Photo Container */}
          {showPhoto && (
            <div 
              style={{
                position: 'absolute',
                top: posPhoto,
                left: posPhotoLeft,
                width: photoW,
                height: photoH,
                borderRadius: photoShape === 'circle' ? '50%' : (photoShape === 'square' ? '8px' : '0px'),
                border: photoShape === 'circle' ? '3px solid white' : (photoShape === 'square' ? '3px solid white' : 'none'),
                boxShadow: photoShape === 'circle' ? '0 4px 10px rgba(0,0,0,0.15)' : (photoShape === 'square' ? '0 4px 10px rgba(0,0,0,0.15)' : 'none'),
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: photoUrl ? 'transparent' : '#e4e4e7',
                boxSizing: 'border-box',
                zIndex: 10
              }}
            >
              {photoUrl ? (
                <img 
                  src={photoUrl} 
                  alt="Profile Photo" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: '#71717a' }}>
                  <User className="w-10 h-10" />
                  <span style={{ fontSize: '9px', fontFamily: 'sans-serif' }}>NO PHOTO</span>
                </div>
              )}
            </div>
          )}

          {/* Name */}
          {showNama && (
            <div
              style={{
                position: 'absolute',
                top: posNama,
                left: posNamaLeft,
                width: `${textWidth}px`,
                height: `${namaH}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                zIndex: 10
              }}
            >
              <span
                style={{
                  fontFamily: 'sans-serif',
                  fontWeight: '900',
                  fontSize: 
                    (data.nama || '').length > 25 ? `${Math.round(10 * SCALE)}px` :
                    (data.nama || '').length > 20 ? `${Math.round(11 * SCALE)}px` :
                    (data.nama || '').length > 15 ? `${Math.round(12 * SCALE)}px` : `${Math.round(13 * SCALE)}px`,
                  color: namaColor,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  lineHeight: '1.2',
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}
              >
                {data.nama || 'IKA'}
              </span>
            </div>
          )}
        </div>
      );
    }

    if (data.theme === 'karya-bakti') {
      return (
        <div 
          className="w-[320px] h-[500px] id-card-render relative overflow-hidden shrink-0 select-none"
          style={{
            boxShadow: isExport ? 'none' : '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            borderRadius: '16px',
            boxSizing: 'border-box'
          }}
        >
          {/* Background Image Template */}
          <img 
            src="/id-card-template.png" 
            alt="Card Template" 
            crossOrigin="anonymous"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'fill',
              zIndex: 0
            }}
          />

          {/* Photo Container - Aligned with white circle inside template */}
          <div 
            style={{
              position: 'absolute',
              top: '17%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '78.5%',
              height: '51.4%',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '4px solid white',
              boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: photoUrl ? 'transparent' : '#e4e4e7',
              boxSizing: 'border-box',
              zIndex: 10
            }}
          >
            {photoUrl ? (
              <img 
                src={photoUrl} 
                alt="Profile Photo" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: '#71717a' }}>
                <User className="w-10 h-10" />
                <span style={{ fontSize: '9px', fontFamily: 'sans-serif' }}>NO PHOTO</span>
              </div>
            )}
          </div>

          {/* Member Details */}
          <div 
            style={{
              position: 'absolute',
              top: '70.8%',
              left: '12%',
              width: '76%',
              boxSizing: 'border-box',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              height: '16%',
              zIndex: 10
            }}
          >
            {/* Name */}
            <h2 
              style={{
                color: 'white',
                fontFamily: 'var(--font-poppins), system-ui, sans-serif',
                fontWeight: '800',
                fontSize: data.nama.length > 20 ? '14px' : data.nama.length > 15 ? '16px' : '18px',
                textTransform: 'uppercase',
                margin: '0',
                letterSpacing: '0.5px',
                lineHeight: '1.2',
                maxHeight: '44px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                textAlign: 'left'
              }}
            >
              {data.nama || 'MARIA YUNITA TIARA KRISTIANTI'}
            </h2>
            
            {/* NIK */}
            <p 
              style={{
                color: '#facc15',
                fontFamily: 'var(--font-lato), system-ui, sans-serif',
                fontWeight: '700',
                fontSize: '13px',
                marginTop: '2px',
                marginBottom: '0',
                letterSpacing: '0.5px',
                textAlign: 'left'
              }}
            >
              NIK.{data.nik || '175/02/25'}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div 
        className={`w-[320px] h-[500px] id-card-render ${activeTheme.cardBg} rounded-2xl flex flex-col justify-between relative overflow-hidden shrink-0 select-none`}
        style={{
          boxShadow: isExport ? 'none' : undefined,
          padding: '24px',
          borderRadius: '16px',
          boxSizing: 'border-box'
        }}
      >
      {/* Decorative Top Grid Line/Accent */}
      <div className="absolute top-0 left-0 w-full h-[6px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
      
      {/* Decorative Grid or Tech Accents for cyberpunk/emerald */}
      {(data.theme === 'cyberpunk' || data.theme === 'neon-emerald') && (
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
      )}
      
      {/* Dynamic glow overlay for teal/gold */}
      {data.theme === 'aurora-teal' && (
        <div className="absolute top-[-50px] right-[-50px] w-[150px] h-[150px] bg-teal-500/20 rounded-full filter blur-2xl animate-pulse-glow" />
      )}
      
      {/* Header (Company Logo and security shield) */}
      <div className="flex justify-between items-center z-10" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '10px' }}>
        <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building className={`w-5 h-5 ${activeTheme.logoColor}`} />
          <span className={`text-[11px] font-bold tracking-[2px] uppercase ${activeTheme.fontFamily}`}>
            VORTEX LABS
          </span>
        </div>
        <div className="flex items-center gap-1" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ShieldCheck className={`w-4 h-4 ${activeTheme.accent}`} />
          <span className="text-[8px] font-mono tracking-widest text-zinc-400 uppercase">VERIFIED</span>
        </div>
      </div>

      {/* Profile Photo Section */}
      <div className="flex flex-col items-center z-10" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '8px' }}>
        <div className="relative w-36 h-36 flex items-center justify-center" style={{ width: '144px', height: '144px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Photo background container */}
          <div 
            className={`w-32 h-32 overflow-hidden relative ${photoUrl ? 'bg-transparent' : 'bg-zinc-800'} ${activeTheme.photoBorder} flex items-center justify-center`}
            style={{ 
              width: '128px', 
              height: '128px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              overflow: 'hidden'
            }}
          >
            {photoUrl ? (
              <img 
                src={photoUrl} 
                alt="Profile Photo" 
                className="w-full h-full object-cover"
                style={{ width: '128px', height: '128px', objectFit: 'cover' }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-zinc-600 gap-1" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <Briefcase className="w-8 h-8" />
                <span className="text-[9px] font-mono uppercase">NO PHOTO</span>
              </div>
            )}
          </div>
          {/* Decorative Corner Lines for Cyberpunk */}
          {data.theme === 'cyberpunk' && (
            <>
              <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-yellow-400" />
              <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-yellow-400" />
              <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-yellow-400" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-yellow-400" />
            </>
          )}
        </div>
        
        {/* Verification seal overlay */}
        <div className={`mt-2 px-2.5 py-0.5 rounded-full ${activeTheme.badgeBg} flex items-center gap-1`} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '10px' }}>
          <span className={`h-1.5 w-1.5 rounded-full bg-current ${activeTheme.accent}`} />
          <span className={`${activeTheme.badgeText}`}>ACTIVE MEMBER</span>
        </div>
      </div>

      {/* Member Details */}
      <div className="text-center flex flex-col justify-center items-center z-10 flex-grow" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '12px', flexGrow: 1 }}>
        <h2 className={`text-xl tracking-wide uppercase line-clamp-1 w-full max-w-[260px] ${activeTheme.textPrimary}`} style={{ fontSize: '20px', lineHeight: '28px', fontFamily: 'var(--font-poppins), sans-serif' }}>
          {data.nama || 'JOHN DOE'}
        </h2>
        <p className={`text-[10px] font-mono tracking-widest text-zinc-400 font-medium`} style={{ fontSize: '10px', marginTop: '2px', fontFamily: 'var(--font-lato), sans-serif' }}>
          NIK: {data.nik || '820491849182903'}
        </p>

        {/* Horizontal Divider Line */}
        <div className="w-1/2 h-[1px] bg-gradient-to-r from-transparent via-zinc-700 to-transparent my-3" style={{ width: '50%', height: '1px', marginTop: '8px', marginBottom: '8px' }} />

        <div className="flex flex-col items-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="flex items-center gap-1.5" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Briefcase className={`w-3.5 h-3.5 opacity-60 ${activeTheme.accent}`} />
            <span className={`text-[13px] font-bold tracking-wide text-zinc-200 ${activeTheme.fontFamily}`} style={{ fontSize: '13px' }}>
              {data.jabatan || 'Senior Developer'}
            </span>
          </div>
          <span className={`text-[10px] font-mono uppercase tracking-[2px] mt-0.5 text-zinc-400`} style={{ fontSize: '9px', marginTop: '4px' }}>
            {data.departemen || 'Technology Division'}
          </span>
        </div>
      </div>

      {/* Footer Barcode */}
      <div className="w-full z-10 flex flex-col items-center justify-center" style={{ borderTop: '1px solid rgba(63, 63, 70, 0.3)', paddingTop: '14px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '10px' }}>
        <Barcode value={data.nik || '820491849182903'} />
      </div>
    </div>
  );
};

  // ID Card Back Template
  const CardBack = ({ isExport = false }: { isExport?: boolean }) => {
    if (data.theme === 'karya-bakti' || customTemplate?.card_design_back) {
      return (
        <div 
          className="w-[320px] h-[500px] id-card-render relative overflow-hidden shrink-0 select-none"
          style={{
            background: customTemplate?.card_design_back ? 'white' : 'radial-gradient(circle at 50% 50%, #0d47a1, #08316f)',
            boxShadow: isExport ? 'none' : '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            borderRadius: '16px',
            padding: '24px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            color: customTemplate?.card_design_back ? '#1e293b' : 'white'
          }}
        >
          {customTemplate?.card_design_back && (
            <img 
              src={customTemplate.card_design_back} 
              alt="Card Back Template" 
              crossOrigin="anonymous"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'fill',
                zIndex: 0
              }}
            />
          )}

          {!customTemplate?.card_design_back && (
            <div className="absolute top-0 left-0 w-full h-[6px] bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
          )}
          
          {/* Back Header */}
          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '10px', position: 'relative', zIndex: 10 }}>
            <span style={{ fontSize: '9px', fontFamily: 'monospace', fontWeight: 'bold', color: customTemplate?.card_design_back ? '#475569' : '#93c5fd', letterSpacing: '1px' }}>INFO KEANGGOTAAN</span>
            <Building className={`w-4 h-4 ${customTemplate?.card_design_back ? 'text-slate-500' : 'text-blue-400'}`} />
          </div>
 
          {/* Magnetic stripe simulator - hidden on custom designs */}
          {!customTemplate?.card_design_back && (
            <div 
              className="w-full bg-zinc-950 border-y border-blue-900/40 absolute left-0" 
              style={{ height: '36px', top: '48px' }}
            />
          )}

          {/* Terms and Conditions (indonesian) */}
          {/* Terms and Conditions (indonesian) */}
          <div style={{ marginTop: '48px', display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', position: 'relative', zIndex: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <p style={{ fontSize: '8.5px', color: customTemplate?.card_design_back ? '#475569' : '#cbd5e1', fontFamily: 'sans-serif', margin: '0', lineHeight: '1.4' }}>
                1. Kartu ini adalah milik resmi <strong>YAYASAN KARYA BAKTI SURAKARTA</strong>. Hak penggunaan kartu hanya terbatas pada pemegang kartu yang terdaftar.
              </p>
              <p style={{ fontSize: '8.5px', color: customTemplate?.card_design_back ? '#475569' : '#cbd5e1', fontFamily: 'sans-serif', margin: '0', lineHeight: '1.4' }}>
                2. Pemegang kartu wajib mentaati seluruh peraturan keamanan, tata tertib, dan kode etik Yayasan.
              </p>
              <p style={{ fontSize: '8.5px', color: customTemplate?.card_design_back ? '#475569' : '#cbd5e1', fontFamily: 'sans-serif', margin: '0', lineHeight: '1.4' }}>
                3. Apabila kartu ini hilang atau ditemukan, harap segera mengembalikannya ke divisi HR / Security Yayasan Karya Bakti Surakarta.
              </p>
            </div>

            {/* Expiry and QR code section */}
            <div 
              style={{ 
                borderTop: customTemplate?.card_design_back ? '1px solid rgba(148, 163, 184, 0.2)' : '1px solid rgba(147, 197, 253, 0.2)', 
                paddingTop: '12px', 
                marginTop: '8px',
                display: 'flex', 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'space-between' 
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar className={`w-3.5 h-3.5 ${customTemplate?.card_design_back ? 'text-indigo-600' : 'text-blue-400'}`} />
                  <div>
                    <p style={{ fontSize: '7px', color: customTemplate?.card_design_back ? '#64748b' : '#93c5fd', textTransform: 'uppercase', margin: '0', lineHeight: '1' }}>Masa Berlaku</p>
                    <p style={{ fontSize: '9px', fontFamily: 'monospace', color: customTemplate?.card_design_back ? '#1e293b' : '#f8fafc', fontWeight: 'bold', margin: '2px 0 0 0' }}>SEUMUR HIDUP</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck className={`w-3.5 h-3.5 ${customTemplate?.card_design_back ? 'text-indigo-600' : 'text-blue-400'}`} />
                  <div>
                    <p style={{ fontSize: '7px', color: customTemplate?.card_design_back ? '#64748b' : '#93c5fd', textTransform: 'uppercase', margin: '0', lineHeight: '1' }}>Otoritas Penerbit</p>
                    <p style={{ fontSize: '9px', fontFamily: 'monospace', color: customTemplate?.card_design_back ? '#1e293b' : '#f8fafc', fontWeight: 'bold', margin: '2px 0 0 0' }}>Karya Bakti Security</p>
                  </div>
                </div>
              </div>
              
              {/* Real simulated QR code */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <QRCode value={`https://verify.yayasankaryabakti.org/id/${data.nik || '175/02/25'}`} />
              </div>
            </div>
          </div>

          {/* Footer Contact Details */}
          <div 
            style={{ 
              borderTop: customTemplate?.card_design_back ? '1px solid rgba(148, 163, 184, 0.2)' : '1px solid rgba(147, 197, 253, 0.2)', 
              paddingTop: '12px', 
              width: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '4px',
              marginTop: '10px',
              position: 'relative',
              zIndex: 10
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Phone className={`w-3 h-3 ${customTemplate?.card_design_back ? 'text-indigo-650' : 'text-blue-400'}`} />
              <span style={{ fontSize: '8px', color: customTemplate?.card_design_back ? '#475569' : '#93c5fd' }}>+62-271-714855</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail className={`w-3 h-3 ${customTemplate?.card_design_back ? 'text-indigo-650' : 'text-blue-400'}`} />
              <span style={{ fontSize: '8px', color: customTemplate?.card_design_back ? '#475569' : '#93c5fd' }}>info@yayasankaryabakti.org</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe className={`w-3 h-3 ${customTemplate?.card_design_back ? 'text-indigo-650' : 'text-blue-400'}`} />
              <span style={{ fontSize: '8px', color: customTemplate?.card_design_back ? '#475569' : '#93c5fd' }}>www.yayasankaryabakti.org</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div 
        className={`w-[320px] h-[500px] id-card-render ${activeTheme.cardBg} rounded-2xl flex flex-col justify-between relative overflow-hidden shrink-0 select-none`}
        style={{
          boxShadow: isExport ? 'none' : undefined,
          padding: '24px',
          borderRadius: '16px',
          boxSizing: 'border-box'
        }}
      >
      <div className="absolute top-0 left-0 w-full h-[6px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
      
      {(data.theme === 'cyberpunk' || data.theme === 'neon-emerald') && (
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
      )}

      {/* Back Header */}
      <div className="flex justify-between items-center z-10" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '10px' }}>
        <span className="text-[10px] font-mono tracking-widest text-zinc-500 font-bold" style={{ fontSize: '9px' }}>INFO KEANGGOTAAN</span>
        <Building className="w-4 h-4 text-zinc-650" />
      </div>

      {/* Magnetic stripe simulator */}
      <div 
        className="w-full bg-zinc-900 border-y border-zinc-800 absolute left-0" 
        style={{ height: '36px', top: '48px', borderTop: '1px solid rgba(63, 63, 70, 0.4)', borderBottom: '1px solid rgba(63, 63, 70, 0.4)' }}
      />

      {/* Terms and Conditions (indonesian) */}
      <div className="text-left z-10" style={{ marginTop: '48px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <p className="text-[8.5px] text-zinc-400 font-sans leading-relaxed" style={{ fontSize: '8.5px' }}>
            1. Kartu ini adalah milik resmi <strong>PT VORTEX LABS INDONESIA</strong>. Hak penggunaan kartu hanya terbatas pada pemegang kartu yang terdaftar.
          </p>
          <p className="text-[8.5px] text-zinc-400 font-sans leading-relaxed" style={{ fontSize: '8.5px' }}>
            2. Pemegang kartu wajib mentaati seluruh peraturan keamanan dan tata tertib perusahaan.
          </p>
          <p className="text-[8.5px] text-zinc-400 font-sans leading-relaxed" style={{ fontSize: '8.5px' }}>
            3. Apabila kartu ini hilang atau ditemukan, harap segera mengembalikannya ke divisi HR / Security PT Vortex Labs Indonesia.
          </p>
        </div>

        {/* Expiry and QR code section */}
        <div 
          className="pt-3 border-t border-zinc-800/60 flex justify-between items-center gap-4" 
          style={{ 
            borderTop: '1px solid rgba(63, 63, 70, 0.4)', 
            paddingTop: '12px', 
            marginTop: '8px',
            display: 'flex', 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between' 
          }}
        >
          <div className="flex flex-col gap-2" style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
            <div className="flex items-center gap-1.5" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <div>
                <p className="text-[7px] text-zinc-555 uppercase tracking-wider" style={{ fontSize: '7px', lineHeight: '1' }}>Masa Berlaku</p>
                <p className="text-[9px] font-mono text-zinc-200 font-bold" style={{ fontSize: '9px', marginTop: '2px' }}>SEUMUR HIDUP</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
              <div>
                <p className="text-[7px] text-zinc-555 uppercase tracking-wider" style={{ fontSize: '7px', lineHeight: '1' }}>Otoritas Penerbit</p>
                <p className="text-[9px] font-mono text-zinc-200 uppercase font-semibold" style={{ fontSize: '9px', marginTop: '2px' }}>Vortex Security</p>
              </div>
            </div>
          </div>
          
          {/* Real simulated QR code */}
          <div className="shrink-0 flex items-center justify-center" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <QRCode value={`https://verify.vortex.com/id/${data.nik || '820491849182903'}`} />
          </div>
        </div>
      </div>

      {/* Footer Contact Details */}
      <div 
        className="z-10 flex flex-col gap-1 text-[8px] text-zinc-500 font-mono"
        style={{ 
          borderTop: '1px solid rgba(63, 63, 70, 0.4)', 
          paddingTop: '12px', 
          width: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '4px',
          marginTop: '10px'
        }}
      >
        <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Phone className="w-3 h-3 text-zinc-650" />
          <span style={{ fontSize: '8px' }}>+62-21-9988-7766</span>
        </div>
        <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Mail className="w-3 h-3 text-zinc-650" />
          <span style={{ fontSize: '8px' }}>support@vortexlabs.com</span>
        </div>
        <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe className="w-3 h-3 text-zinc-650" />
          <span style={{ fontSize: '8px' }}>www.vortexlabs.com</span>
        </div>
      </div>
    </div>
  );
};

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto px-4 py-8">
      
      {/* Success Notification Bar */}
      <div className="w-full bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-emerald-950">ID Card Berhasil Dibuat!</h4>
            <p className="text-xs text-emerald-700">Data Anda berhasil disimpan di dalam session secara aman.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Session Active: {data.sessionId.slice(0, 8)}...</span>
        </div>
      </div>

      {/* Layout for previews and operations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-start">
        
        {/* Left Side: Operations Card */}
        <div className="lg:col-span-4 bg-white/80 border border-slate-200/80 shadow-2xl backdrop-blur-md rounded-3xl p-6 space-y-6">
          <div>
            <span className="text-[10px] tracking-[3px] uppercase font-bold text-amber-600">ID Card Studio</span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">Kelola & Unduh</h3>
            <p className="text-xs text-slate-500 mt-1">Pilih format unduhan ID Card Anda dengan kualitas resolusi cetak tinggi.</p>
          </div>

          <div className="h-[1px] bg-slate-200" />

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => handleDownload('front')}
              disabled={downloading}
              className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-slate-350 text-slate-800 hover:text-slate-950 px-4 py-3 rounded-xl transition duration-200 text-sm font-medium disabled:opacity-50 shadow-sm"
            >
              <span className="flex items-center gap-2">
                <Download className="w-4 h-4 text-cyan-600" />
                Unduh Bagian Depan
              </span>
              <span className="text-[10px] text-slate-400 font-mono">PNG</span>
            </button>

            <button
              onClick={() => handleDownload('back')}
              disabled={downloading}
              className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-slate-350 text-slate-800 hover:text-slate-950 px-4 py-3 rounded-xl transition duration-200 text-sm font-medium disabled:opacity-50 shadow-sm"
            >
              <span className="flex items-center gap-2">
                <Download className="w-4 h-4 text-purple-600" />
                Unduh Bagian Belakang
              </span>
              <span className="text-[10px] text-slate-400 font-mono">PNG</span>
            </button>

            <button
              onClick={() => handleDownload('both')}
              disabled={downloading}
              className="w-full flex items-center justify-between bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-bold px-4 py-3.5 rounded-xl transition duration-200 text-sm disabled:opacity-50 shadow-lg shadow-amber-500/15"
            >
              <span className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Unduh Kedua Sisi (Lebar)
              </span>
              <span className="text-[10px] font-mono opacity-85">PNG</span>
            </button>

            <div className="space-y-2 pt-2 border-t border-slate-200">
              <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block">
                Opsi Cetak (PDF / Kertas)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => triggerPrint('front')}
                  disabled={downloading}
                  className="flex flex-col items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 py-2.5 rounded-xl text-[10px] font-semibold cursor-pointer shadow-sm transition disabled:opacity-50"
                >
                  <Printer className="w-4 h-4 text-cyan-600" />
                  Sisi Depan
                </button>
                <button 
                  onClick={() => triggerPrint('back')}
                  disabled={downloading}
                  className="flex flex-col items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 py-2.5 rounded-xl text-[10px] font-semibold cursor-pointer shadow-sm transition disabled:opacity-50"
                >
                  <Printer className="w-4 h-4 text-purple-600" />
                  Sisi Belakang
                </button>
                <button 
                  onClick={() => triggerPrint('both')}
                  disabled={downloading}
                  className="flex flex-col items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-2.5 rounded-xl text-[10px] font-bold cursor-pointer shadow-md shadow-emerald-500/10 transition disabled:opacity-50"
                >
                  <Printer className="w-4 h-4 text-white" />
                  Kedua Sisi
                </button>
              </div>
            </div>
          </div>

          <div className="h-[1px] bg-slate-200" />

          {/* Tips */}
          <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-200 space-y-2">
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-650" />
              Petunjuk Interaksi
            </span>
            <p className="text-xs text-slate-650 leading-relaxed">
              Klik kartu di samping untuk membalikkannya secara langsung. Anda dapat melihat tampilan depan dan belakang dengan transisi 3D yang mulus.
            </p>
          </div>

          {/* Reset / Create New Button */}
          <button
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 py-3 rounded-xl transition duration-200 text-sm font-semibold"
          >
            <RefreshCw className="w-4 h-4" />
            Hapus Session & Buat Baru
          </button>
        </div>

        {/* Right Side: Interactive 3D Card Preview */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center py-6">
          
          {/* Instructions to click/flip */}
          <button 
            onClick={() => setIsFlipped(!isFlipped)} 
            className="flex items-center gap-2 text-xs font-mono text-slate-650 hover:text-slate-900 bg-white px-4 py-2 rounded-full border border-slate-200 mb-6 transition duration-250 cursor-pointer shadow-sm"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-amber-500" />
            <span>Klik kartu untuk membalik (Flip)</span>
          </button>

          {/* The Flip container */}
          <div 
            onClick={() => setIsFlipped(!isFlipped)}
            className="perspective-1000 cursor-pointer group"
          >
            <div 
              className={`w-[320px] h-[500px] preserve-3d transition-transform duration-700 ease-out relative ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* Front side card */}
              <div className="absolute inset-0 backface-hidden z-25">
                <CardFront />
              </div>

              {/* Back side card */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 z-20">
                <CardBack />
              </div>
            </div>
          </div>
          
          {/* Active theme badge */}
          <div className="mt-6 flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-mono">Tema Terpilih:</span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${activeTheme.badgeBg} ${activeTheme.badgeText}`}>
              {activeTheme.name}
            </span>
          </div>

        </div>
      </div>

      {/* HIDDEN OFFSCREEN WRAPPER FOR PERFECT HTML2CANVAS EXPORTS */}
      {/* This renders flat cards without any 3D translations, preventing export warping/bugs */}
      <div 
        id="print-area"
        className="absolute top-0 left-0 flex gap-8 pointer-events-none"
        style={{ opacity: 0, zIndex: -50 }}
      >
        <div 
          ref={exportFrontRef}
          style={{ display: (printTarget === 'front' || printTarget === 'both') ? 'block' : 'none' }}
        >
          <CardFront isExport={true} />
        </div>
        <div 
          ref={exportBackRef}
          style={{ display: (printTarget === 'back' || printTarget === 'both') ? 'block' : 'none' }}
        >
          <CardBack isExport={true} />
        </div>
      </div>

      {/* Screen Loader when exporting */}
      {downloading && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
          <div className="relative h-12 w-12 flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-30" />
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-transparent border-t-amber-500 border-r-amber-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-zinc-100">Menghasilkan Gambar Kualitas Tinggi...</p>
            <p className="text-xs text-zinc-500 mt-1 font-mono">Rendering via html2canvas canvas-render-engine</p>
          </div>
        </div>
      )}
    </div>
  );
}
