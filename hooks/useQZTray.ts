'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  connectQZ,
  disconnectQZ,
  isQZConnected,
  getInstalledPrinters,
  findTargetPrinter,
  printIDCardImage
} from '../lib/qz';
import { QZConnectionState, QZPrintOptions } from '../types/qz';

export interface UseQZTrayReturn {
  state: QZConnectionState;
  printers: string[];
  selectedPrinter: string;
  setSelectedPrinter: (printerName: string) => void;
  loading: boolean;
  error: string | null;
  statusMessage: string;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshPrinters: () => Promise<void>;
  printCard: (imageBase64: string, customPrinter?: string, options?: QZPrintOptions) => Promise<boolean>;
  clearError: () => void;
}

const FARGO_PRINTER_DEFAULT = 'HID Fargo DTC1250e';

export function useQZTray(): UseQZTrayReturn {
  const [state, setState] = useState<QZConnectionState>('disconnected');
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Disambungkan ke QZ Tray.');

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Refreshes printer list from client Windows machine.
   */
  const refreshPrinters = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getInstalledPrinters();
      setPrinters(list);
      
      // Auto-detect HID Fargo DTC1250e if present in system printer list
      const fargoMatch = list.find((p) => p.toLowerCase().includes('fargo') || p.toLowerCase().includes('dtc1250e'));
      if (fargoMatch) {
        setSelectedPrinter(fargoMatch);
        setStatusMessage(`Printer "${fargoMatch}" terdeteksi secara otomatis.`);
      } else if (list.length > 0 && !selectedPrinter) {
        setSelectedPrinter(list[0]);
      }
    } catch (err: any) {
      console.error('Failed to get printers:', err);
      setError(err.message || 'Gagal mengambil daftar printer dari QZ Tray.');
    } finally {
      setLoading(false);
    }
  }, [selectedPrinter]);

  /**
   * Connects to QZ Tray daemon.
   */
  const connect = useCallback(async () => {
    setLoading(true);
    setState('connecting');
    setError(null);
    setStatusMessage('Menghubungkan ke QZ Tray...');

    try {
      await connectQZ();
      setState('connected');
      setStatusMessage('Terhubung ke QZ Tray.');
      await refreshPrinters();
    } catch (err: any) {
      setState('error');
      const msg = err.message || 'Gagal terhubung ke QZ Tray.';
      setError(msg);
      setStatusMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [refreshPrinters]);

  /**
   * Disconnects from QZ Tray daemon.
   */
  const disconnect = useCallback(async () => {
    setLoading(true);
    try {
      await disconnectQZ();
      setState('disconnected');
      setStatusMessage('Koneksi QZ Tray terputus.');
    } catch (err: any) {
      console.error('Disconnect error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Auto-connect on mount on client side
   */
  useEffect(() => {
    let isMounted = true;
    async function initConnection() {
      const alreadyConnected = await isQZConnected();
      if (alreadyConnected && isMounted) {
        setState('connected');
        await refreshPrinters();
      } else if (isMounted) {
        // Try auto-connecting silently on mount
        try {
          await connectQZ();
          if (isMounted) {
            setState('connected');
            await refreshPrinters();
          }
        } catch {
          if (isMounted) {
            setState('disconnected');
          }
        }
      }
    }
    initConnection();
    return () => {
      isMounted = false;
    };
  }, [refreshPrinters]);

  /**
   * Sends base64 ID Card image to selected printer via QZ Tray.
   */
  const printCard = useCallback(
    async (
      imageBase64: string,
      customPrinter?: string,
      options?: QZPrintOptions
    ): Promise<boolean> => {
      setLoading(true);
      setError(null);
      
      const targetPrinterName = customPrinter || selectedPrinter || FARGO_PRINTER_DEFAULT;
      setStatusMessage(`Mengirim data cetak ke "${targetPrinterName}"...`);

      try {
        // Ensure connected
        const connected = await isQZConnected();
        if (!connected) {
          await connectQZ();
          setState('connected');
        }

        // Verify printer exists
        const verifiedPrinter = await findTargetPrinter(targetPrinterName);

        // Send print job
        await printIDCardImage({
          printerName: verifiedPrinter,
          imageBase64,
          options
        });

        setStatusMessage(`Sukses! ID Card berhasil dikirim ke printer "${verifiedPrinter}".`);
        return true;
      } catch (err: any) {
        console.error('Print Card Error:', err);
        const errMsg = err.message || 'Terjadi kesalahan saat mengirim data cetak ke printer.';
        setError(errMsg);
        setStatusMessage(errMsg);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [selectedPrinter]
  );

  return {
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
  };
}
