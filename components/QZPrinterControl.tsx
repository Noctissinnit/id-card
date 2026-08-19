'use client';

import React, { useState, useEffect } from 'react';
import html2canvas from 'html2canvas-pro';
import { useQZTray } from '../hooks/useQZTray';
import {
  Printer,
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sliders,
  ShieldCheck
} from 'lucide-react';

interface QZPrinterControlProps {
  cardElementId?: string;
  cardBackElementId?: string;
  onPrintSuccess?: () => void;
}

export default function QZPrinterControl({
  cardElementId = 'id-card',
  cardBackElementId = 'id-card-back',
  onPrintSuccess
}: QZPrinterControlProps) {
  const CR80_WIDTH_MM = 53.98;
  const CR80_HEIGHT_MM = 85.60;
  const CR80_RATIO = CR80_WIDTH_MM / CR80_HEIGHT_MM;
  const DEFAULT_HORIZONTAL_BLEED_MM = 0.8;
  const DEFAULT_VERTICAL_BLEED_MM = 0.8;
  const MAX_VERTICAL_NUDGE_MM = 1.8;
  const MAX_HORIZONTAL_NUDGE_MM = 0.8;
  // Asymmetric extras to help cover printer non-printable edges
  const EXTRA_RIGHT_MM = 1.0; // extend drawing to the right by ~1mm
  const EXTRA_BOTTOM_MM = 1.0; // extend drawing downward by ~1mm
  const EXTRA_UP_SHIFT_MM = 1.0; // shift image up by ~1mm to compensate for bottom white strip

  const {
    state,
    printers,
    selectedPrinter,
    setSelectedPrinter,
    loading,
    error,
    statusMessage,
    connect,
    disconnect,
    refreshPrinters,
    printCard,
    clearError
  } = useQZTray();

  const [printingSide, setPrintingSide] = useState<'front' | 'back' | 'both' | null>(null);
  const [printAsIs, setPrintAsIs] = useState<boolean>(true);
  const [verticalNudgeMm, setVerticalNudgeMm] = useState<number>(0);
  const [horizontalNudgeMm, setHorizontalNudgeMm] = useState<number>(0);
  const [horizontalBleedMm, setHorizontalBleedMm] = useState<number>(DEFAULT_HORIZONTAL_BLEED_MM);
  const [verticalBleedMm, setVerticalBleedMm] = useState<number>(DEFAULT_VERTICAL_BLEED_MM);
  const STORAGE_KEY = 'idcard_printer_calibration_v1';

  // Load saved calibration for selected printer
  useEffect(() => {
    if (!selectedPrinter) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw || '{}');
      const cfg = parsed[selectedPrinter];
      if (!cfg) return;
      if (typeof cfg.hNudge === 'number') setHorizontalNudgeMm(cfg.hNudge);
      if (typeof cfg.vNudge === 'number') setVerticalNudgeMm(cfg.vNudge);
      if (typeof cfg.hBleed === 'number') setHorizontalBleedMm(cfg.hBleed);
      if (typeof cfg.vBleed === 'number') setVerticalBleedMm(cfg.vBleed);
    } catch (e) {
      // ignore
    }
  }, [selectedPrinter]);

  // Persist calibration whenever values change for the selected printer
  useEffect(() => {
    if (!selectedPrinter) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || '{}';
      const parsed = JSON.parse(raw);
      parsed[selectedPrinter] = {
        hNudge: horizontalNudgeMm,
        vNudge: verticalNudgeMm,
        hBleed: horizontalBleedMm,
        vBleed: verticalBleedMm,
        savedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch (e) {
      // ignore
    }
  }, [selectedPrinter, horizontalNudgeMm, verticalNudgeMm, horizontalBleedMm, verticalBleedMm]);

  const normalizeCanvasToCardAspect = (source: HTMLCanvasElement): HTMLCanvasElement => {
    const srcW = source.width;
    const srcH = source.height;
    const srcRatio = srcW / srcH;

    let cropW = srcW;
    let cropH = srcH;
    let cropX = 0;
    let cropY = 0;

    // Center-crop to CR-80 ratio so printer doesn't add white bars on fit-to-page.
    if (srcRatio > CR80_RATIO) {
      cropW = Math.round(srcH * CR80_RATIO);
      cropX = Math.round((srcW - cropW) / 2);
    } else if (srcRatio < CR80_RATIO) {
      cropH = Math.round(srcW / CR80_RATIO);
      cropY = Math.round((srcH - cropH) / 2);
    }

    // Render to exact 300 DPI CR-80 pixels.
    const targetW = Math.round((CR80_WIDTH_MM / 25.4) * 300);
    const targetH = Math.round((CR80_HEIGHT_MM / 25.4) * 300);
    const bleedXPx = Math.round((horizontalBleedMm / 25.4) * 300);
    const bleedYPx = Math.round((verticalBleedMm / 25.4) * 300);
    const requestedYNudgePx = Math.round((verticalNudgeMm / 25.4) * 300);
    const extraUpPx = Math.round((EXTRA_UP_SHIFT_MM / 25.4) * 300);
    // Apply extra up-shift (moves image up by EXTRA_UP_SHIFT_MM)
    const nudgeYPx = Math.max(-bleedYPx, Math.min(bleedYPx, requestedYNudgePx - extraUpPx));
    const requestedXNudgePx = Math.round((horizontalNudgeMm / 25.4) * 300);
    const nudgeXPx = Math.max(-bleedXPx, Math.min(bleedXPx, requestedXNudgePx));
    const extraRightPx = Math.round((EXTRA_RIGHT_MM / 25.4) * 300);
    const extraBottomPx = Math.round((EXTRA_BOTTOM_MM / 25.4) * 300);
    const out = document.createElement('canvas');
    out.width = targetW;
    out.height = targetH;

    const ctx = out.getContext('2d');
    if (!ctx) return source;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // Apply a rounded-rect clip (powerclip) so the image is constrained to the CR-80 frame
    // Corner radius ~3.18mm (standard CR-80 corner radius)
    const CORNER_RADIUS_MM = 3.18;
    const cornerRadiusPx = Math.round((CORNER_RADIUS_MM / 25.4) * 300);

    // Create rounded rect path that represents the visible card area
    const rx = 0;
    const ry = 0;
    const rw = targetW;
    const rh = targetH;
    ctx.save();
    ctx.beginPath();
    // rounded rect path
    ctx.moveTo(rx + cornerRadiusPx, ry);
    ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, cornerRadiusPx);
    ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, cornerRadiusPx);
    ctx.arcTo(rx, ry + rh, rx, ry, cornerRadiusPx);
    ctx.arcTo(rx, ry, rx + rw, ry, cornerRadiusPx);
    ctx.closePath();
    ctx.clip();

    // Draw the source image with bleed and nudges; clip will keep it within the rounded card frame
    ctx.drawImage(
      source,
      cropX,
      cropY,
      cropW,
      cropH,
      -bleedXPx + nudgeXPx,
      -bleedYPx + nudgeYPx,
      targetW + bleedXPx * 2 + extraRightPx,
      targetH + bleedYPx * 2 + extraBottomPx
    );

    ctx.restore();

    return out;
  };

  // Small symmetric safety margin kept even in "as-is" mode so a slightly
  // out-of-registration printer still lays ink to the card edge instead of
  // leaving a blank strip. Deliberately much smaller than the old bleed
  // (0.8-1.8mm) so it stays visually indistinguishable from the preview.
  const WYSIWYG_SAFETY_BLEED_MM = 0.3;

  // Resize/crop to the exact print pixel dimensions (matching the mm page config QZ expects)
  // with only the small safety bleed above — no nudge/shift/corner rounding — "as-is" WYSIWYG output.
  const resizeCanvasToExactCard = (source: HTMLCanvasElement): HTMLCanvasElement => {
    const srcW = source.width;
    const srcH = source.height;
    const srcRatio = srcW / srcH;

    let cropW = srcW;
    let cropH = srcH;
    let cropX = 0;
    let cropY = 0;

    if (srcRatio > CR80_RATIO) {
      cropW = Math.round(srcH * CR80_RATIO);
      cropX = Math.round((srcW - cropW) / 2);
    } else if (srcRatio < CR80_RATIO) {
      cropH = Math.round(srcW / CR80_RATIO);
      cropY = Math.round((srcH - cropH) / 2);
    }

    const targetW = Math.round((CR80_WIDTH_MM / 25.4) * 300);
    const targetH = Math.round((CR80_HEIGHT_MM / 25.4) * 300);
    const safetyBleedPx = Math.round((WYSIWYG_SAFETY_BLEED_MM / 25.4) * 300);

    const out = document.createElement('canvas');
    out.width = targetW;
    out.height = targetH;

    const ctx = out.getContext('2d');
    if (!ctx) return source;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      source,
      cropX,
      cropY,
      cropW,
      cropH,
      -safetyBleedPx,
      -safetyBleedPx,
      targetW + safetyBleedPx * 2,
      targetH + safetyBleedPx * 2
    );

    return out;
  };

  /**
   * Converts targeted HTML element to Base64 PNG image string at 300 DPI for Fargo printer
   */
  const convertElementToBase64 = async (elementId: string): Promise<string> => {
    const element = document.getElementById(elementId) || document.getElementById('export-front-card');
    if (!element) {
      throw new Error(`Elemen HTML "#${elementId}" tidak ditemukan.`);
    }

    // Capture exact card node directly with onclone hook enforcing 330px x 515px relative container bounds
    const cardNode = (element.querySelector('.id-card-render') as HTMLElement | null) || element;

    // Wait for web fonts (e.g. a custom Poppins weight) to finish loading before
    // rasterizing — otherwise the captured image can fall back to a default font
    // even though the on-screen card already looks correct.
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      await document.fonts.ready;
    }

    const canvas = await html2canvas(cardNode, {
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

    if (printAsIs) {
      // WYSIWYG: same crop/DPI resize QZ needs to size the page correctly, but no bleed/nudge/corner-clip.
      const exact = resizeCanvasToExactCard(canvas);
      return exact.toDataURL('image/png');
    }

    const normalized = normalizeCanvasToCardAspect(canvas);
    return normalized.toDataURL('image/png');
  };

  /**
   * Handles 1-Click Direct Silent Printing to HID Fargo DTC1250e via QZ Tray
   */
  const handleDirectPrint = async (side: 'front' | 'back' | 'both') => {
    clearError();
    setPrintingSide(side);

    try {
      if (side === 'front') {
        const pngBase64 = await convertElementToBase64(cardElementId);
        const success = await printCard(pngBase64, selectedPrinter, {
          orientation: 'portrait',
          density: 300,
          copies: 1
        });
        if (success && onPrintSuccess) onPrintSuccess();
      } else if (side === 'back') {
        const pngBase64 = await convertElementToBase64(cardBackElementId);
        const success = await printCard(pngBase64, selectedPrinter, {
          orientation: 'portrait',
          density: 300,
          copies: 1
        });
        if (success && onPrintSuccess) onPrintSuccess();
      } else if (side === 'both') {
        // Print Front
        const frontPng = await convertElementToBase64(cardElementId);
        const frontSuccess = await printCard(frontPng, selectedPrinter, {
          orientation: 'portrait',
          density: 300,
          copies: 1
        });

        if (frontSuccess) {
          // Short delay between dual-side card feed
          await new Promise((r) => setTimeout(r, 1200));
          const backPng = await convertElementToBase64(cardBackElementId);
          await printCard(backPng, selectedPrinter, {
            orientation: 'portrait',
            density: 300,
            copies: 1
          });
          if (onPrintSuccess) onPrintSuccess();
        }
      }
    } catch (err: any) {
      console.error('Direct Print Failed:', err);
    } finally {
      setPrintingSide(null);
    }
  };

  const isConnected = state === 'connected';

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 text-slate-800">
      {/* Header & Status Indicator */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Printer className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-sm text-slate-900">QZ Tray Direct Silent Printer</h3>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Wifi className="w-3.5 h-3.5" />
              Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <WifiOff className="w-3.5 h-3.5" />
              {state === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </span>
          )}
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={isConnected ? disconnect : connect}
          disabled={loading || state === 'connecting'}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
            isConnected
              ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
              : 'bg-indigo-600 hover:bg-indigo-700 border-indigo-600 text-white shadow-sm'
          } disabled:opacity-50`}
        >
          {loading && state === 'connecting' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isConnected ? (
            <WifiOff className="w-4 h-4 text-slate-500" />
          ) : (
            <Wifi className="w-4 h-4" />
          )}
          {isConnected ? 'Putus Koneksi QZ' : 'Hubungkan QZ Tray'}
        </button>

        <button
          onClick={refreshPrinters}
          disabled={loading || !isConnected}
          className="flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          Refresh Daftar Printer
        </button>
      </div>

      {/* Printer Selection Dropdown */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
          <span>Pilih Printer Tujuan</span>
          {selectedPrinter.toLowerCase().includes('dtc1250e') && (
            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Auto-Selected (Fargo DTC1250e)
            </span>
          )}
        </label>
        <select
          value={selectedPrinter}
          onChange={(e) => setSelectedPrinter(e.target.value)}
          disabled={!isConnected || printers.length === 0}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition disabled:opacity-50"
        >
          {printers.length === 0 ? (
            <option value="">{isConnected ? '-- Tidak ada printer terdeteksi --' : '-- Hubungkan QZ Tray terlebih dahulu --'}</option>
          ) : (
            printers.map((p) => (
              <option key={p} value={p}>
                {p} {p.toLowerCase().includes('dtc1250e') ? '★ (HID Fargo DTC1250e)' : ''}
              </option>
            ))
          )}
        </select>
      </div>

      {/* WYSIWYG Toggle */}
      <div className="pt-2 border-t border-slate-100">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={printAsIs}
            onChange={(e) => setPrintAsIs(e.target.checked)}
            className="mt-0.5 rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
          />
          <span>
            <span className="text-xs font-bold text-slate-800 block">Cetak Apa Adanya (Sesuai Preview)</span>
            <span className="text-[11px] text-slate-500 leading-relaxed block mt-0.5">
              Kirim hasil tangkapan kartu sesuai preview (plus safety bleed kecil 0.3mm di semua sisi supaya tepi kartu tetap tercetak penuh). Matikan opsi ini kalau printer fisik masih menyisakan garis putih dan Anda ingin kalibrasi bleed/geser manual yang lebih besar.
            </span>
          </span>
        </label>
      </div>

      {/* Action Printing Buttons */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
          1-Click Silent Direct Print (Fargo DTC1250e)
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleDirectPrint('front')}
            disabled={!isConnected || loading}
            className="flex flex-col items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white py-2.5 px-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-40"
          >
            {printingSide === 'front' ? <Loader2 className="w-4 h-4 animate-spin text-cyan-400" /> : <Printer className="w-4 h-4 text-cyan-400" />}
            <span>Sisi Depan</span>
          </button>

          <button
            onClick={() => handleDirectPrint('back')}
            disabled={!isConnected || loading}
            className="flex flex-col items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white py-2.5 px-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-40"
          >
            {printingSide === 'back' ? <Loader2 className="w-4 h-4 animate-spin text-purple-400" /> : <Printer className="w-4 h-4 text-purple-400" />}
            <span>Sisi Belakang</span>
          </button>

          <button
            onClick={() => handleDirectPrint('both')}
            disabled={!isConnected || loading}
            className="flex flex-col items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-2.5 px-2 rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/10 cursor-pointer disabled:opacity-40"
          >
            {printingSide === 'both' ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Printer className="w-4 h-4 text-white" />}
            <span>Kedua Sisi</span>
          </button>
        </div>
      </div>

      {/* Calibration controls (ignored while "Cetak Apa Adanya" is on) */}
      <div className={printAsIs ? 'opacity-40 pointer-events-none' : undefined}>
      {printAsIs && (
        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-2">
          Kalibrasi di bawah ini nonaktif selama &quot;Cetak Apa Adanya&quot; menyala.
        </div>
      )}
      {/* Vertical Alignment Calibration */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Kalibrasi Posisi Vertikal
          </label>
          <button
            type="button"
            onClick={() => setVerticalNudgeMm(0)}
            className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 transition"
          >
            Reset
          </button>
        </div>
        <div className="text-[11px] text-slate-600 leading-relaxed">
          Geser hasil cetak sedikit ke atas atau ke bawah. Nilai plus menggeser ke bawah, nilai minus menggeser ke atas.
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold text-slate-500 w-14">Atas</span>
          <input
            type="range"
            min={-MAX_VERTICAL_NUDGE_MM}
            max={MAX_VERTICAL_NUDGE_MM}
            step={0.05}
            value={verticalNudgeMm}
            onChange={(e) => setVerticalNudgeMm(Number(e.target.value))}
            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <span className="text-[10px] font-semibold text-slate-500 w-14 text-right">Bawah</span>
        </div>
        <div className="text-[11px] font-mono text-slate-700">
          Offset Y: {verticalNudgeMm.toFixed(2)} mm
        </div>
      </div>

        {/* Horizontal Alignment & Bleed Calibration */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Kalibrasi Posisi Horizontal
            </label>
            <button
              type="button"
              onClick={() => setHorizontalNudgeMm(0)}
              className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 transition"
            >
              Reset
            </button>
          </div>
          <div className="text-[11px] text-slate-600 leading-relaxed">
            Geser hasil cetak sedikit ke kiri atau kanan. Nilai plus menggeser ke kanan, nilai minus menggeser ke kiri.
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold text-slate-500 w-14">Kiri</span>
            <input
              type="range"
              min={-MAX_HORIZONTAL_NUDGE_MM}
              max={MAX_HORIZONTAL_NUDGE_MM}
              step={0.05}
              value={horizontalNudgeMm}
              onChange={(e) => setHorizontalNudgeMm(Number(e.target.value))}
              className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <span className="text-[10px] font-semibold text-slate-500 w-14 text-right">Kanan</span>
          </div>
          <div className="text-[11px] font-mono text-slate-700">Offset X: {horizontalNudgeMm.toFixed(2)} mm</div>

          <div className="pt-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Bleed (Horizontal)</label>
            <div className="text-[11px] text-slate-600 leading-relaxed">Tambahkan bleed jika kartu tidak ter-cover penuh pada tepi.</div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] font-semibold text-slate-500 w-14">Min</span>
              <input
                type="range"
                min={0}
                max={2}
                step={0.05}
                value={horizontalBleedMm}
                onChange={(e) => setHorizontalBleedMm(Number(e.target.value))}
                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="text-[10px] font-semibold text-slate-500 w-14 text-right">Max</span>
            </div>
            <div className="text-[11px] font-mono text-slate-700 mt-1">Bleed: {horizontalBleedMm.toFixed(2)} mm</div>
          </div>
        </div>
      </div>

      {/* Error Notification Toast */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-red-700">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Error Cetak QZ Tray:</p>
            <p className="mt-0.5 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Status Message */}
      {statusMessage && !error && (
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center gap-2 text-xs text-slate-600">
          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span className="truncate">{statusMessage}</span>
        </div>
      )}
    </div>
  );
}
