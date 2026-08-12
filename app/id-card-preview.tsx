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
import QZPrinterControl from '../components/QZPrinterControl';
import JsBarcode from 'jsbarcode';

// Helper to format name with a maximum of 2 words per line before moving to the next line
export function formatNameLines(name: string, maxWordsPerLine: number = 2): string {
  if (!name) return '';
  const words = name.trim().split(/\s+/);
  if (words.length <= maxWordsPerLine) {
    return name;
  }
  const lines: string[] = [];
  for (let i = 0; i < words.length; i += maxWordsPerLine) {
    lines.push(words.slice(i, i + maxWordsPerLine).join(' '));
  }
  return lines.join('\n');
}

let measureCanvas: HTMLCanvasElement | null = null;

// Shrinks font size (down to minFontPx) until `text` fits within maxWidthPx on one line.
function fitSingleLineFontSize(
  text: string,
  maxWidthPx: number,
  baseFontPx: number,
  fontWeight: string | number,
  fontFamily: string,
  letterSpacingPx: number,
  minFontPx: number
): number {
  if (typeof document === 'undefined' || !text) return baseFontPx;
  if (!measureCanvas) measureCanvas = document.createElement('canvas');
  const ctx = measureCanvas.getContext('2d');
  if (!ctx) return baseFontPx;

  const upperText = text.toUpperCase();
  let fontPx = baseFontPx;
  while (fontPx > minFontPx) {
    ctx.font = `${fontWeight} ${fontPx}px ${fontFamily}`;
    const width = ctx.measureText(upperText).width + letterSpacingPx * Math.max(0, upperText.length - 1);
    if (width <= maxWidthPx) break;
    fontPx -= 0.5;
  }
  return fontPx;
}

// Normalizes an uploaded barcode photo so it always displays vertically (portrait):
// if the source image is landscape (wider than tall), rotate it 90° clockwise via
// canvas so it reads top-to-bottom like the barcode slot expects. Already-portrait
// images pass through untouched.
function rotateImageToPortrait(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !dataUrl) {
      resolve(dataUrl);
      return;
    }
    const img = document.createElement('img');
    img.onload = () => {
      if (img.naturalWidth <= img.naturalHeight) {
        resolve(dataUrl);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalHeight;
      canvas.height = img.naturalWidth;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.translate(canvas.width, 0);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// Dynamic Barcode Generator (Renders 90° rotated vertical PNG image directly on 2D Canvas)
// Eliminates CSS transform flattening bugs in browser print engines (Chrome/Edge @media print)
const Barcode = ({ 
  value, 
  width = '48px', 
  height = '250px', 
  color = '#000000' 
}: { 
  value: string; 
  width?: string; 
  height?: string; 
  color?: string; 
}) => {
  const [imgUrl, setImgUrl] = useState<string>('');

  useEffect(() => {
    try {
      const tempCanvas = document.createElement('canvas');
      JsBarcode(tempCanvas, value || '1234567890', {
        format: 'CODE128',
        displayValue: false,
        margin: 0,
        height: 60,
        width: 2,
        background: 'transparent',
        lineColor: color || '#000000',
      });

      // Rotate 90 degrees CW onto a vertical canvas
      const vertCanvas = document.createElement('canvas');
      vertCanvas.width = tempCanvas.height;
      vertCanvas.height = tempCanvas.width;

      const ctx = vertCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, vertCanvas.width, vertCanvas.height);
        
        ctx.translate(vertCanvas.width, 0);
        ctx.rotate((90 * Math.PI) / 180);
        ctx.drawImage(tempCanvas, 0, 0);
      }

      setImgUrl(vertCanvas.toDataURL('image/png'));
    } catch (err) {
      console.error('Barcode rendering error:', err);
    }
  }, [value, color]);

  return (
    <div 
      style={{
        width: width,
        height: height,
        display: 'block',
        boxSizing: 'border-box'
      }}
    >
      {imgUrl ? (
        <img 
          src={imgUrl} 
          alt="Barcode" 
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'fill'
          }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }} />
      )}
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
  // 'cyberpunk': {
  //   name: 'Cyberpunk Neon',
  //   cardBg: 'bg-zinc-950 border border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.3)] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-zinc-950 to-zinc-950',
  //   textPrimary: 'text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400 font-mono tracking-tight font-extrabold',
  //   textSecondary: 'text-cyan-400 font-mono uppercase text-xs tracking-wider',
  //   accent: 'text-yellow-400 font-mono',
  //   badgeBg: 'bg-yellow-400/10 border border-yellow-400/40',
  //   badgeText: 'text-yellow-400 font-mono text-[10px]',
  //   glow: 'shadow-[0_0_20px_rgba(6,182,212,0.4)]',
  //   logoColor: 'text-pink-500',
  //   fontFamily: 'font-mono',
  //   photoBorder: 'border-2 border-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)] rounded-none rotate-3'
  // },
  // 'neon-emerald': {
  //   name: 'Matrix Emerald',
  //   cardBg: 'bg-black border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)] bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black',
  //   textPrimary: 'text-emerald-400 font-mono tracking-wide font-bold uppercase',
  //   textSecondary: 'text-zinc-400 font-mono text-xs',
  //   accent: 'text-emerald-500 font-mono',
  //   badgeBg: 'bg-emerald-500/15 border border-emerald-500/30',
  //   badgeText: 'text-emerald-400 font-mono text-[10px]',
  //   glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
  //   logoColor: 'text-emerald-400',
  //   fontFamily: 'font-mono',
  //   photoBorder: 'border-2 border-emerald-500 rounded-md shadow-[0_0_8px_rgba(16,185,129,0.4)]'
  // },
  // 'minimal-dark': {
  //   name: 'Obsidian Dark',
  //   cardBg: 'bg-zinc-950 border border-zinc-800 shadow-2xl bg-gradient-to-b from-zinc-900 to-zinc-950',
  //   textPrimary: 'text-zinc-100 font-sans tracking-tight font-semibold',
  //   textSecondary: 'text-zinc-500 font-sans text-xs',
  //   accent: 'text-zinc-300 font-sans',
  //   badgeBg: 'bg-zinc-800/80 border border-zinc-700',
  //   badgeText: 'text-zinc-200 font-sans text-[10px] font-medium',
  //   glow: 'shadow-lg',
  //   logoColor: 'text-zinc-100',
  //   fontFamily: 'font-sans',
  //   photoBorder: 'border border-zinc-750 rounded-xl shadow-inner'
  // },
  // 'aurora-teal': {
  //   name: 'Aurora Teal',
  //   cardBg: 'bg-slate-950 border border-teal-500/30 shadow-[0_0_20px_rgba(20,184,166,0.15)] bg-[radial-gradient(circle_at_30%_30%,rgba(20,184,166,0.15),transparent_50%)] bg-[radial-gradient(circle_at_70%_70%,rgba(168,85,247,0.1),transparent_50%)]',
  //   textPrimary: 'text-white font-sans tracking-tight font-bold',
  //   textSecondary: 'text-teal-400 font-sans text-xs font-semibold uppercase tracking-wider',
  //   accent: 'text-indigo-300 font-sans',
  //   badgeBg: 'bg-gradient-to-r from-teal-500/10 to-indigo-500/10 border border-teal-500/30',
  //   badgeText: 'text-teal-300 font-sans text-[10px] font-medium',
  //   glow: 'shadow-[0_0_15px_rgba(20,184,166,0.25)]',
  //   logoColor: 'text-teal-400',
  //   fontFamily: 'font-sans',
  //   photoBorder: 'border-2 border-transparent bg-gradient-to-r from-teal-400 to-indigo-500 [background-clip:padding-box,_border-box] rounded-2xl shadow-md'
  // },
  // 'luxury-gold': {
  //   name: 'Luxury Gold',
  //   cardBg: 'bg-neutral-950 border border-amber-600/30 shadow-[0_0_20px_rgba(217,119,6,0.15)] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-950/20 via-neutral-950 to-neutral-950',
  //   textPrimary: 'text-amber-400 font-serif tracking-wide font-bold italic',
  //   textSecondary: 'text-neutral-400 font-sans text-xs uppercase tracking-widest',
  //   accent: 'text-amber-500 font-sans',
  //   badgeBg: 'bg-amber-500/10 border border-amber-500/30',
  //   badgeText: 'text-amber-400 font-sans text-[10px] uppercase font-bold tracking-wider',
  //   glow: 'shadow-[0_0_15px_rgba(217,119,6,0.25)]',
  //   logoColor: 'text-amber-500',
  //   fontFamily: 'font-serif',
  //   photoBorder: 'border-2 border-amber-600/50 p-0.5 rounded-none shadow-md'
  // }
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
  const [barcodeUrl, setBarcodeUrl] = useState<string>('');
  const [portraitBarcodeUrl, setPortraitBarcodeUrl] = useState<string>('');
  const [downloading, setDownloading] = useState(false);

  const unitIdentifier = `${customTemplate?.nama || ''} ${data.departemen || ''}`.toLowerCase();
  const isPoltekUnit = unitIdentifier.includes('poltek') || unitIdentifier.includes('politeknik');

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

    if (data.barcode === 'indexeddb') {
      getPhoto('id_card_barcode').then((base64) => {
        if (base64) {
          setBarcodeUrl(base64);
        }
      });
    } else {
      setBarcodeUrl(data.barcode);
    }
  }, [data.photoUrl, data.barcode]);

  // Whatever orientation the uploaded barcode photo was taken/saved in, normalize
  // it to portrait so it always fills the (tall, narrow) barcode slot correctly.
  useEffect(() => {
    if (!barcodeUrl) {
      setPortraitBarcodeUrl('');
      return;
    }
    let cancelled = false;
    rotateImageToPortrait(barcodeUrl).then((result) => {
      if (!cancelled) setPortraitBarcodeUrl(result);
    });
    return () => {
      cancelled = true;
    };
  }, [barcodeUrl]);

  const handleReset = async () => {
    await deletePhoto('id_card_photo');
    await deletePhoto('id_card_barcode');
    await clearSessionAction();
    router.refresh();
  };
  const captureCardCanvasToDataURL = async (sourceElement: HTMLElement): Promise<string> => {
    const cardRender = (sourceElement.querySelector('.id-card-render') as HTMLElement | null) || sourceElement;
    
    // Capture the exact card node on screen with onclone hook enforcing 330px x 515px relative container bounds
    const canvas = await html2canvas(cardRender, {
      scale: 3.175,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 330,
      height: 523,
      onclone: (clonedDoc, clonedElement) => {
        clonedElement.style.position = 'relative';
        clonedElement.style.width = '330px';
        clonedElement.style.height = '523px';
        clonedElement.style.overflow = 'hidden';
        clonedElement.style.transform = 'none';
        clonedElement.style.margin = '0';
        clonedElement.style.left = '0';
        clonedElement.style.top = '0';
      }
    });

    return canvas.toDataURL('image/png');
  };

  const triggerPrint = async (target: 'front' | 'back' | 'both') => {
    // Open print window synchronously on user click to prevent Chrome popup blocker
    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Pop-up terblokir oleh browser. Harap izinkan pop-up untuk situs ini agar dapat mencetak kartu.');
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Menyiapkan Cetakan...</title>
          <style>
            body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #ffffff; color: #334155; }
            .loader { text-align: center; }
          </style>
        </head>
        <body>
          <div class="loader">
            <h3 style="margin-bottom:8px;">Menyiapkan Dokumen Cetak...</h3>
            <p style="font-size:12px;color:#64748b;margin:0;">Mohon tunggu sebentar, sedang memproses gambar HD.</p>
          </div>
        </body>
      </html>
    `);

    setDownloading(true);
    try {
      const images: string[] = [];

      if (target === 'front' || target === 'both') {
        const frontNode = visibleFrontRef.current || exportFrontRef.current;
        if (frontNode) {
          const imgData = await captureCardCanvasToDataURL(frontNode);
          images.push(imgData);
        }
      }

      if (target === 'back' || target === 'both') {
        const backNode = exportBackRef.current || visibleFrontRef.current;
        if (backNode) {
          const imgData = await captureCardCanvasToDataURL(backNode);
          images.push(imgData);
        }
      }

      if (images.length === 0) {
        printWin.close();
        alert('Gagal mengambil gambar kartu.');
        return;
      }

      printWin.document.open();
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print ID Card</title>
            <style>
              @page { size: 53.98mm 85.60mm; margin: 0; }
              html, body { margin: 0; padding: 0; width: 53.98mm; height: 85.60mm; background: #ffffff; }
              .card-page { width: 53.98mm; height: 85.60mm; page-break-after: always; break-after: page; overflow: hidden; display: flex; align-items: center; justify-content: center; margin: 0; padding: 0; }
              img { width: 100%; height: 100%; object-fit: fill; display: block; border: none; margin: 0; padding: 0; }
            </style>
          </head>
          <body>
            ${images.map(img => `<div class="card-page"><img src="${img}" id="card-img" /></div>`).join('')}
            <script>
              function startPrint() {
                setTimeout(function() {
                  window.focus();
                  window.print();
                  setTimeout(function() { window.close(); }, 500);
                }, 400);
              }

              var img = document.getElementById('card-img');
              if (img && !img.complete) {
                img.onload = startPrint;
                setTimeout(startPrint, 1000);
              } else {
                startPrint();
              }
            </script>
          </body>
        </html>
      `);
      printWin.document.close();
    } catch (err) {
      console.error('Print error:', err);
      printWin.close();
      alert('Gagal menyiapkan dokumen cetak.');
    } finally {
      setDownloading(false);
    }
  };
  const cardRef = useRef<HTMLDivElement>(null);
  const visibleFrontRef = useRef<HTMLDivElement>(null);
  
  // For html2canvas, we render non-rotated, flat versions offscreen
  const exportFrontRef = useRef<HTMLDivElement>(null);
  const exportBackRef = useRef<HTMLDivElement>(null);

  const activeTheme = THEMES[data.theme] || THEMES['minimal-dark'];

  const triggerDownload = async (element: HTMLDivElement, filename: string) => {
    try {
      // Temporarily remove hidden offscreen elements if needed, though they are in DOM
      // Calibrated to 300 DPI resolution for HID Fargo DTC1250e thermal ribbon ID card printers
      const canvas = await html2canvas(element, {
        scale: 3.175, // Exact 300 DPI HD print resolution (CR-80 54mm x 86mm)
        useCORS: true, // Handle external fonts/images if any
        backgroundColor: null, // Transparent bg
        logging: false,
        width: element.offsetWidth - 1, // Subtract 1px to prevent sub-pixel white border gaps on high-DPI displays
        height: element.offsetHeight - 1,
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
      const sanitizedName = (data.nama || 'blank').toLowerCase().replace(/\s+/g, '-');

      if (mode === 'front') {
        const frontElement = visibleFrontRef.current || exportFrontRef.current;
        if (frontElement) {
          await triggerDownload(frontElement, `id-card-${sanitizedName}-front-${timestamp}.png`);
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
        container.style.background = '#00275e'; // dark backdrop for luxury presentation

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
    if (customTemplate?.card_design || customTemplate?.layout_config) {
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

      // Keep the custom-template renderer aligned with the admin layout editor.
      const PREVIEW_CARD_WIDTH = 330
      const EDITOR_CARD_WIDTH = 250
      const SCALE = PREVIEW_CARD_WIDTH / EDITOR_CARD_WIDTH

      // Positions & Dimensions mapping with defaults (percentages scale naturally)
      const posJabatan = config?.jabatan_top !== undefined ? `${config.jabatan_top}%` : '26.5%'
      const posJabatanLeft = config?.jabatan_left !== undefined ? `${config.jabatan_left}%` : '5%'
      const posNik = config?.nik_top !== undefined ? `${config.nik_top}%` : '35%'
      const posNikLeft = (config?.nik_left !== undefined && String(config.nik_left) !== '0') ? `${config.nik_left}%` : '5%'
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
      const textColor = config?.text_color ? config.text_color : '#ffffff'

      // Visibility switches
      const showJabatan = config?.show_jabatan !== undefined ? !!config.show_jabatan : true
      const showNik = config?.show_nik !== undefined ? !!config.show_nik : true
      const showNama = config?.show_nama !== undefined ? !!config.show_nama : true
      const showPhoto = config?.show_photo !== undefined ? !!config.show_photo : true

      const showBarcode = config?.show_barcode !== undefined ? !!config.show_barcode : true

      // Barcode positioning & styling
      const posBarcode = config?.barcode_top !== undefined ? `${config.barcode_top}%` : '10%'
      const posBarcodeLeft = config?.barcode_left !== undefined ? `${config.barcode_left}%` : '75%'
      const barcodeRawW = config?.barcode_width !== undefined ? Number(config.barcode_width) : 48
      const barcodeRawH = config?.barcode_height !== undefined ? Number(config.barcode_height) : 210
      const barcodeW = `${barcodeRawW}px`
      const barcodeH = `${barcodeRawH}px`
      const barcodeRotation = config?.barcode_rotation !== undefined ? Number(config.barcode_rotation) : 0
      const barcodeColor = config?.barcode_color ? config.barcode_color : '#000000'

      // Smart Card Chip Slot (ISO 7816-2 Area)
      const showChip = config?.show_chip !== undefined ? !!config.show_chip : false
      const posChipTop = config?.chip_top !== undefined ? `${config.chip_top}%` : '20%'
      const posChipLeft = config?.chip_left !== undefined ? `${config.chip_left}%` : '68%'
      const chipRawW = config?.chip_width !== undefined ? Number(config.chip_width) : 52
      const chipRawH = config?.chip_height !== undefined ? Number(config.chip_height) : 44
      const chipW = `${chipRawW}px`
      const chipH = `${chipRawH}px`

      // Footer Logo (Politeknik ATMI & Flazz) positioning - only for Poltek/Politeknik units
      const unitIdentifier = `${customTemplate?.nama || ''} ${data.departemen || ''}`.toLowerCase()
      const isPoltekUnit = unitIdentifier.includes('poltek') || unitIdentifier.includes('politeknik')
      const showFooterLogo = isPoltekUnit ? (config?.show_footer_logo !== undefined ? !!config.show_footer_logo : true) : false
      const posFooterLogoTop = config?.footer_logo_top !== undefined ? `${config.footer_logo_top}%` : '77%'
      const posFooterLogoLeft = config?.footer_logo_left !== undefined ? `${config.footer_logo_left}%` : '0%'
      const footerLogoRawW = config?.footer_logo_width !== undefined ? Number(config.footer_logo_width) : 320
      const footerLogoRawH = config?.footer_logo_height !== undefined ? Number(config.footer_logo_height) : 74
      const footerLogoW = `${footerLogoRawW}px`
      const footerLogoH = `${footerLogoRawH}px`
      const footerLogoBg = config?.footer_logo_bg !== undefined ? config.footer_logo_bg : 'transparent'
      const footerLogoUrl = config?.footer_logo_url || '/img/atmidanflazz.png'

      // Colors mapping (respect exact chosen colors from unit layout_config)
      const jabatanColor = config?.jabatan_color ? config.jabatan_color : '#facc15'
      const nikColor = config?.nik_color ? config.nik_color : '#ffffff'
      const namaColor = config?.nama_color ? config.nama_color : '#ffffff'

      // Scaled element dimensions (editor pixels × SCALE)
      // Editor: text width=185 (when barcode shown) / 216, jabatan h=24, nik h=18, nama h=35
      const textWidth = showBarcode ? Math.round(185 * SCALE) : Math.round(216 * SCALE)   // 246px max when barcode present
      const jabatanH = Math.round(24 * SCALE)      // 32
      const nikH = Math.round(18 * SCALE)           // 24
      const namaH = Math.round(35 * SCALE)          // 47

      const namaFontFamily = config?.nama_font || config?.font_family || "'Century Gothic', CenturyGothic, AppleGothic, sans-serif"
      const namaBaseFontPx = Math.round(Number(config?.nama_size || 13) * SCALE)
      const namaText = data.nama || (isExport ? '' : 'IKA')
      // Poltek renders the name on one line, so shrink it to fit rather than wrapping/cutting it off.
      const namaFontPx = isPoltekUnit
        ? fitSingleLineFontSize(namaText, textWidth, namaBaseFontPx, config?.nama_weight || '700', namaFontFamily, 0.5, Math.max(9, Math.round(namaBaseFontPx * 0.5)))
        : namaBaseFontPx

      return (
        <div 
          className="w-[330px] h-[523px] id-card-render relative overflow-hidden shrink-0 select-none bg-white"
          style={{
            boxShadow: isExport ? 'none' : '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            borderRadius: isExport ? '0px' : '16px',
            boxSizing: 'border-box',
            backgroundColor: config?.card_bg_color === 'transparent' ? 'transparent' : (config?.card_bg_color || '#ffffff')
          }}
        >
          {/* Background Image Template */}
          {customTemplate.card_design && (
            <img 
              src={customTemplate.card_design} 
              alt="Card Template" 
              crossOrigin="anonymous"
              style={{
                position: 'absolute',
                top: '0',
                left: '0',
                width: '100%',
                height: '100%',
                objectFit: 'fill',
                zIndex: 0
              }}
            />
          )}

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
                justifyContent: config?.jabatan_align === 'left' ? 'flex-start' : (config?.jabatan_align === 'right' ? 'flex-end' : 'center'),
                textAlign: config?.jabatan_align || 'center',
                zIndex: 10
              }}
            >
              <span
                style={{
                  fontFamily: config?.jabatan_font || config?.font_family || "'Century Gothic', CenturyGothic, AppleGothic, sans-serif",
                  fontWeight: config?.jabatan_weight || '900',
                  fontSize: `${Math.round(Number(config?.jabatan_size || 11) * SCALE)}px`,
                  color: jabatanColor,
                  letterSpacing: '0.5px',
                  lineHeight: '1.2',
                  textAlign: config?.jabatan_align || 'center',
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
                justifyContent: config?.nik_align === 'left' ? 'flex-start' : (config?.nik_align === 'right' ? 'flex-end' : 'center'),
                textAlign: config?.nik_align || 'center',
                zIndex: 10
              }}
            >
              <span
                style={{
                  fontFamily: config?.nik_font || config?.font_family || "'Century Gothic', CenturyGothic, AppleGothic, sans-serif",
                  fontWeight: config?.nik_weight || '400',
                  fontSize: `${Math.round(Number(config?.nik_size || 10) * SCALE)}px`,
                  color: nikColor,
                  letterSpacing: '0.5px',
                  textAlign: config?.nik_align || 'center'
                }}
              >
                {isPoltekUnit ? (data.nik || (isExport ? '' : '690/03/05')) : (data.nik ? `NIK. ${data.nik}` : (isExport ? '' : 'NIK. 690/03/05'))}
              </span>
            </div>
          )}

          {/* Photo Container */}
          {showPhoto && (photoUrl || !isExport) && (
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
                backgroundColor: photoUrl ? (config?.photo_bg_color === 'transparent' ? 'transparent' : (config?.photo_bg_color || '#1b365d')) : (config?.photo_bg_color === 'transparent' ? 'transparent' : '#e4e4e7'),
                boxSizing: 'border-box',
                zIndex: 15
              }}
            >
              {photoUrl ? (
                <img 
                  src={photoUrl} 
                  alt="Profile Photo" 
                  crossOrigin="anonymous"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: '#71717a' }}>
                  <User className="w-10 h-10" />
                  <span style={{ fontSize: '9px', fontFamily: "'Century Gothic', CenturyGothic, AppleGothic, sans-serif" }}>NO PHOTO</span>
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
                justifyContent: config?.nama_align === 'left' ? 'flex-start' : (config?.nama_align === 'right' ? 'flex-end' : 'center'),
                textAlign: config?.nama_align || 'center',
                zIndex: 10
              }}
            >
              <span
                style={
                  isPoltekUnit
                    ? {
                        fontFamily: namaFontFamily,
                        fontWeight: config?.nama_weight || '700',
                        fontSize: `${namaFontPx}px`,
                        color: namaColor,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        lineHeight: '0.85',
                        textAlign: config?.nama_align || 'center',
                        width: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }
                    : {
                        fontFamily: config?.nama_font || config?.font_family || "'Century Gothic', CenturyGothic, AppleGothic, sans-serif",
                        fontWeight: config?.nama_weight || '700',
                        fontSize: `${Math.round(Number(config?.nama_size || 13) * SCALE)}px`,
                        color: namaColor,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        lineHeight: '0.85',
                        textAlign: config?.nama_align || 'center',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: 'vertical',
                        whiteSpace: 'pre-line'
                      }
                }
              >
                {isPoltekUnit
                  ? namaText
                  : (data.nama ? formatNameLines(data.nama) : (isExport ? '' : formatNameLines('IKA')))}
              </span>
            </div>
          )}

          {/* Barcode - Uploaded PNG file or generated sample barcode with thick white outline */}
          {showBarcode && (barcodeUrl || data.barcode || !isExport) && (
            <div
              style={{
                position: 'absolute',
                top: posBarcode,
                left: posBarcodeLeft,
                width: barcodeW,
                height: barcodeH,
                zIndex: 5,
                transform: `rotate(${barcodeRotation}deg)`,
                transformOrigin: 'center center',
                filter: 'drop-shadow(0px 0px 4px #ffffff)',
                // Border + radius live on this wrapper (not the <img>) — html2canvas clips
                // overflow:hidden + border-radius reliably on plain divs, same as the photo frame.
                ...(isPoltekUnit
                  ? { border: '4px solid #ffffff', borderRadius: '6px', boxSizing: 'border-box' as const, overflow: 'hidden' as const }
                  : { outline: '4px solid #ffffff', boxSizing: 'border-box' as const })
              }}
            >
              {barcodeUrl ? (
                <img
                  src={portraitBarcodeUrl || barcodeUrl}
                  alt="Barcode"
                  style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
              ) : (
                <Barcode
                  value={data.barcode && data.barcode !== 'indexeddb' ? data.barcode : '1234567890'}
                  width="100%"
                  height="100%"
                  color={barcodeColor}
                />
              )}
            </div>
          )}

          {/* Smartcard Chip Overlay / Non-Print Zone (ISO 7816-2) */}
          {showChip && (
            <div
              style={{
                position: 'absolute',
                top: posChipTop,
                left: posChipLeft,
                width: chipW,
                height: chipH,
                borderRadius: '6px',
                background: 'linear-gradient(135deg, #e6c875 0%, #ffd700 50%, #c5a059 100%)',
                border: '1.5px solid #b38f38',
                boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.7), 0 2px 5px rgba(0,0,0,0.25)',
                zIndex: 25,
                overflow: 'hidden',
                boxSizing: 'border-box'
              }}
              title="Area Chip Smartcard ISO 7816-2"
            >
              {/* Microchip Contact Pins Pattern */}
              <div className="w-full h-full p-1 grid grid-cols-2 gap-0.5 opacity-75">
                <div className="border-r border-b border-[#8c6d23] rounded-tl-sm" />
                <div className="border-l border-b border-[#8c6d23] rounded-tr-sm" />
                <div className="border-r border-t border-b border-[#8c6d23]" />
                <div className="border-l border-t border-b border-[#8c6d23]" />
                <div className="border-r border-t border-[#8c6d23] rounded-bl-sm" />
                <div className="border-l border-t border-[#8c6d23] rounded-br-sm" />
              </div>
            </div>
          )}

          {/* Footer Logo (Politeknik ATMI & Flazz Banner Bar) */}
          {showFooterLogo && (
            <div
              style={{
                position: 'absolute',
                top: posFooterLogoTop,
                left: posFooterLogoLeft,
                width: footerLogoW,
                height: footerLogoH,
                backgroundColor: footerLogoBg === 'transparent' ? 'transparent' : footerLogoBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                padding: '0px',
                boxSizing: 'border-box',
                zIndex: 25
              }}
            >
              <img 
                src={footerLogoUrl} 
                alt="Politeknik ATMI & Flazz Logo" 
                crossOrigin="anonymous"
                style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'left center' }}
              />
            </div>
          )}
        </div>
      );
    }

    if (data.theme === 'karya-bakti') {
      return (
        <div 
          className="w-[330px] h-[523px] id-card-render relative overflow-hidden shrink-0 select-none bg-[#1570ad]"
          style={{
            backgroundColor: '#1570ad',
            boxShadow: isExport ? 'none' : '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            borderRadius: isExport ? '0px' : '16px',
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
              top: '0',
              left: '0',
              width: '100%',
              height: '100%',
              objectFit: 'fill',
              zIndex: 0
            }}
          />

          {/* Photo Container - Aligned with white circle inside template */}
          {(photoUrl || !isExport) && (
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
                backgroundColor: photoUrl ? '#1b365d' : '#e4e4e7',
                boxSizing: 'border-box',
                zIndex: 15
              }}
            >
              {photoUrl ? (
                <img 
                  src={photoUrl} 
                  alt="Profile Photo" 
                  crossOrigin="anonymous"
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

          {/* Member Details */}
          <div 
            style={{
              position: 'absolute',
              top: '68.5%',
              left: '12%',
              width: '76%',
              boxSizing: 'border-box',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              height: '19%',
              zIndex: 10
            }}
          >
            {/* Name */}
            <h2 
              style={{
                color: 'white',
                fontFamily: "'Poppins', sans-serif",
                fontWeight: '700',
                fontSize: '22px',
                textTransform: 'uppercase',
                margin: '0',
                letterSpacing: '-0.3px',
                lineHeight: '0.85',
                maxHeight: '52px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                textAlign: 'left',
                whiteSpace: 'pre-line'
              }}
            >
              {data.nama ? formatNameLines(data.nama) : (isExport ? '' : formatNameLines('MARIA YUNITA TIARA KRISTIANTI'))}
            </h2>
            
            {/* NIK */}
            <p 
              style={{
                color: '#c6ff00',
                fontFamily: "'Lato', sans-serif",
                fontWeight: '400',
                fontSize: '15px',
                marginTop: (data.nama || '').trim().split(/\s+/).length > 2 ? '8px' : '4px',
                marginBottom: '0',
                letterSpacing: '0.5px',
                textAlign: 'left'
              }}
            >
              {isPoltekUnit ? (data.nik || (isExport ? '' : '175/02/25')) : (data.nik ? `NIK.${data.nik}` : (isExport ? '' : 'NIK.175/02/25'))}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div 
        className={`w-[330px] h-[523px] id-card-render ${activeTheme.cardBg} rounded-2xl flex flex-col justify-between relative overflow-hidden shrink-0 select-none`}
        style={{
          boxShadow: isExport ? 'none' : undefined,
          padding: '24px',
          borderRadius: isExport ? '0px' : '16px',
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
            className={`w-32 h-32 overflow-hidden relative ${photoUrl ? 'bg-[#1b365d]' : 'bg-zinc-800'} ${activeTheme.photoBorder} flex items-center justify-center`}
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
                crossOrigin="anonymous"
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
        <h2 className={`text-xl tracking-wide uppercase line-clamp-1 w-full max-w-[260px] ${activeTheme.textPrimary}`} style={{ fontSize: '20px', lineHeight: '28px', fontFamily: "'Poppins', sans-serif" }}>
          {data.nama || 'JOHN DOE'}
        </h2>
        <p className={`text-[10px] font-mono tracking-widest text-zinc-400 font-medium`} style={{ fontSize: '10px', marginTop: '2px', fontFamily: "'Lato', sans-serif" }}>
          {isPoltekUnit ? (data.nik || '820491849182903') : `NIK: ${data.nik || '820491849182903'}`}
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
          className="w-[330px] h-[523px] id-card-render relative overflow-hidden shrink-0 select-none"
          style={{
            background: customTemplate?.card_design_back ? 'white' : 'radial-gradient(circle at 50% 50%, #0d47a1, #08316f)',
            boxShadow: isExport ? 'none' : '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            borderRadius: isExport ? '0px' : '16px',
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
                top: '0',
                left: '0',
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
                {data.nik ? (
                  <QRCode value={`https://verify.yayasankaryabakti.org/id/${data.nik}`} />
                ) : (
                  isExport ? null : <QRCode value="https://verify.yayasankaryabakti.org/id/175/02/25" />
                )}
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
        className={`w-[330px] h-[523px] id-card-render ${activeTheme.cardBg} rounded-2xl flex flex-col justify-between relative overflow-hidden shrink-0 select-none`}
        style={{
          boxShadow: isExport ? 'none' : undefined,
          padding: '24px',
          borderRadius: isExport ? '0px' : '16px',
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
      <div className="w-full bg-white/80 border border-emerald-200/80 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">ID Card Berhasil Dibuat!</h4>
            <p className="text-xs text-slate-500">Data Anda berhasil disimpan di dalam sesi secara aman.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-emerald-700 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold">Session Active: {data.sessionId.slice(0, 8)}...</span>
        </div>
      </div>

      {/* Layout for previews and operations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-start">
        
        {/* Left Side: Operations Card */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 shadow-xl rounded-3xl p-6 space-y-5">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] tracking-[2px] uppercase font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">ID Card Studio</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 pt-1">Kelola & Unduh Kartu</h3>
            <p className="text-xs text-slate-500 leading-relaxed">Pilih format unduhan ID Card Anda dengan resolusi cetak tinggi.</p>
          </div>

          <div className="h-[1px] bg-slate-100" />

          {/* Action Download Buttons */}
          <div className="space-y-2.5">
            <button
              onClick={() => handleDownload('front')}
              disabled={downloading}
              className="w-full flex items-center justify-between bg-slate-50 hover:bg-indigo-50/50 border border-slate-200/80 hover:border-indigo-200 text-slate-800 hover:text-indigo-900 px-4 py-3 rounded-xl transition duration-200 text-sm font-semibold cursor-pointer shadow-xs disabled:opacity-50 group"
            >
              <span className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-100/60 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition">
                  <Download className="w-4 h-4" />
                </div>
                Unduh Bagian Depan
              </span>
              <span className="text-[10px] text-slate-400 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">PNG</span>
            </button>

            <button
              onClick={() => handleDownload('back')}
              disabled={downloading}
              className="w-full flex items-center justify-between bg-slate-50 hover:bg-purple-50/50 border border-slate-200/80 hover:border-purple-200 text-slate-800 hover:text-purple-900 px-4 py-3 rounded-xl transition duration-200 text-sm font-semibold cursor-pointer shadow-xs disabled:opacity-50 group"
            >
              <span className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-purple-100/60 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition">
                  <Download className="w-4 h-4" />
                </div>
                Unduh Bagian Belakang
              </span>
              <span className="text-[10px] text-slate-400 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">PNG</span>
            </button>

            <button
              onClick={() => handleDownload('both')}
              disabled={downloading}
              className="w-full flex items-center justify-between bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold px-4 py-3.5 rounded-xl transition duration-200 text-sm cursor-pointer disabled:opacity-50 shadow-md shadow-indigo-600/20"
            >
              <span className="flex items-center gap-2.5">
                <Download className="w-4.5 h-4.5" />
                Unduh Kedua Sisi (Lebar)
              </span>
              <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded">PNG</span>
            </button>
          </div>

          <div className="h-[1px] bg-slate-100" />

          {/* Direct Print Section */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-indigo-600" />
                Cetak Langsung (Fargo DTC1250e)
              </label>
              <span className="text-[9px] bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Direct Connect
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => triggerPrint('front')}
                disabled={downloading}
                className="flex flex-col items-center justify-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 py-2.5 rounded-xl text-[10px] font-semibold cursor-pointer shadow-xs transition disabled:opacity-50"
                title="Cetak langsung Sisi Depan ke Printer Fargo DTC1250e"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-600" />
                Sisi Depan
              </button>
              <button 
                onClick={() => triggerPrint('back')}
                disabled={downloading}
                className="flex flex-col items-center justify-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 py-2.5 rounded-xl text-[10px] font-semibold cursor-pointer shadow-xs transition disabled:opacity-50"
                title="Cetak langsung Sisi Belakang ke Printer Fargo DTC1250e"
              >
                <Printer className="w-3.5 h-3.5 text-purple-600" />
                Sisi Belakang
              </button>
              <button 
                onClick={() => triggerPrint('both')}
                disabled={downloading}
                className="flex flex-col items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-[10px] font-bold cursor-pointer shadow-xs transition disabled:opacity-50"
                title="Cetak langsung Kedua Sisi ke Printer Fargo DTC1250e"
              >
                <Printer className="w-3.5 h-3.5 text-white" />
                Kedua Sisi
              </button>
            </div>
          </div>

          {/* QZ Tray Integration Panel */}
          <QZPrinterControl cardElementId="visible-front-card" cardBackElementId="export-back-card" />

          {/* Reset / Create New Button */}
          <button
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200/80 py-3 rounded-xl transition duration-200 text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Hapus Sesi & Buat Baru
          </button>
        </div>

        {/* Right Side: Interactive 3D Card Preview */}
        <div className="lg:col-span-7 flex flex-col items-center justify-start py-2">
          
          {/* Instructions to click/flip */}
          <button 
            onClick={() => setIsFlipped(!isFlipped)} 
            className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 px-5 py-2.5 rounded-full border border-slate-200/80 mb-6 transition duration-200 cursor-pointer shadow-xs hover:shadow-md"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
            <span>Klik kartu untuk membalik (Flip 3D)</span>
          </button>

          {/* The Flip container */}
          <div 
            onClick={() => setIsFlipped(!isFlipped)}
            className="perspective-1000 cursor-pointer group"
          >
            <div 
              className={`w-[330px] h-[523px] preserve-3d transition-transform duration-700 ease-out relative ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* Front side card */}
              <div id="visible-front-card" ref={visibleFrontRef} className="absolute inset-0 backface-hidden z-25">
                <CardFront />
              </div>

              {/* Back side card */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 z-20">
                <CardBack />
              </div>
            </div>
          </div>
          
          {/* Active theme badge */}
          <div className="mt-6 flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Tema Terpilih:</span>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${activeTheme.badgeBg} ${activeTheme.badgeText}`}>
              {activeTheme.name}
            </span>
          </div>

        </div>
      </div>

      {/* HIDDEN OFFSCREEN WRAPPER FOR FARGO DTC1250e PRINT & EXPORTS */}
      {/* Renders flat cards formatted directly to 54mm x 86mm CR-80 pages for Fargo printer */}
      <div 
        id="print-area"
        className="fixed -left-[9999px] -top-[9999px] pointer-events-none print:static print:left-0 print:top-0"
        style={{ opacity: 1, zIndex: -50 }}
      >
        <div 
          id="export-front-card"
          ref={exportFrontRef}
          className="print-page"
          style={{ display: 'block', opacity: 1 }}
        >
          <CardFront isExport={false} />
        </div>
        <div 
          id="export-back-card"
          ref={exportBackRef}
          className="print-page"
          style={{ display: 'block', opacity: 1 }}
        >
          <CardBack isExport={false} />
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
