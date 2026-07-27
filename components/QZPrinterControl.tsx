'use client';

import React, { useState } from 'react';
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

  /**
   * Converts targeted HTML element to Base64 PNG image string at 300 DPI for Fargo printer
   */
  const convertElementToBase64 = async (elementId: string): Promise<string> => {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Elemen HTML "#${elementId}" tidak ditemukan.`);
    }

    // Capture HTML node as high-DPI canvas (300 DPI scaling = 3.175)
    const canvas = await html2canvas(element, {
      scale: 3.175,
      useCORS: true,
      backgroundColor: null,
      logging: false
    });

    return canvas.toDataURL('image/png');
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
