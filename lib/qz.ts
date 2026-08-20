import { QZPrintOptions, QZPrintJob } from '../types/qz';

// Define a type for QZ Tray instance
let qzInstance: typeof import('qz-tray') | null = null;

/**
 * Dynamically loads QZ Tray library on client-side only.
 */
export async function getQZ(): Promise<typeof import('qz-tray')> {
  if (typeof window === 'undefined') {
    throw new Error('QZ Tray dapat dijalankan hanya pada browser (Client-Side).');
  }

  if (!qzInstance) {
    // Dynamic import to support SSR / Next.js App Router
    qzInstance = await import('qz-tray');
    configureSecurity(qzInstance);
  }

  return qzInstance;
}

/**
 * Configures security certificates and signing algorithm for QZ Tray.
 * Default: uses QZ Tray's built-in "unsigned" prompt-authorization mode (the user
 * clicks Allow once in the QZ Tray app) — this needs no certificate setup at all.
 * Signed/silent mode (no prompt) requires a real QZ Tray certificate + private key;
 * set NEXT_PUBLIC_QZ_SIGNED_MODE=true once /api/qz/cert and QZ_PRIVATE_KEY are
 * properly configured to switch this app over to that flow.
 */
function configureSecurity(qz: typeof import('qz-tray')) {
  if (process.env.NEXT_PUBLIC_QZ_SIGNED_MODE !== 'true') {
    return;
  }

  // Use SHA-256 algorithm
  qz.api.setSha256Type((data: string) => {
    return new Promise<string>((resolve, reject) => {
      try {
        if (window.crypto && window.crypto.subtle) {
          const encoder = new TextEncoder();
          const buffer = encoder.encode(data);
          window.crypto.subtle.digest('SHA-256', buffer).then((hash) => {
            const hex = Array.from(new Uint8Array(hash))
              .map((b) => b.toString(16).padStart(2, '0'))
              .join('');
            resolve(hex);
          }).catch(reject);
        } else {
          reject(new Error('Web Crypto API tidak tersedia.'));
        }
      } catch (err) {
        reject(err);
      }
    });
  });

  // Security certificate promise
  qz.security.setCertificatePromise((resolve: (cert: string) => void, reject: (reason: any) => void) => {
    // In production mode: fetch trusted public certificate
    fetch('/api/qz/cert')
      .then((res) => res.text())
      .then(resolve)
      .catch(reject);
  });

  // Security signature algorithm promise (production only)
  qz.security.setSignatureAlgorithm((data: string) => {
    return new Promise<string>((resolve, reject) => {
      fetch('/api/qz/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: data })
      })
        .then((res) => {
          if (!res.ok) throw new Error('Gagal menandatangani sertifikat QZ Tray.');
          return res.text();
        })
        .then(resolve)
        .catch(reject);
    });
  });
}

/**
 * Establishes WebSocket connection to QZ Tray daemon (wss://localhost:8182 or ws://localhost:8181)
 */
export async function connectQZ(): Promise<void> {
  const qz = await getQZ();
  if (qz.websocket.isActive()) {
    return;
  }

  try {
    await qz.websocket.connect({
      retries: 2,
      delay: 1
    });
  } catch (err: any) {
    if (err.message && err.message.includes('Unable to establish connection')) {
      throw new Error(
        'QZ Tray belum berjalan di komputer Anda. Silakan buka aplikasi QZ Tray dari Start Menu / System Tray Windows.'
      );
    }
    throw err;
  }
}

/**
 * Closes connection to QZ Tray daemon.
 */
export async function disconnectQZ(): Promise<void> {
  if (qzInstance && qzInstance.websocket.isActive()) {
    await qzInstance.websocket.disconnect();
  }
}

/**
 * Checks if QZ Tray WebSocket is connected.
 */
export async function isQZConnected(): Promise<boolean> {
  try {
    const qz = await getQZ();
    return qz.websocket.isActive();
  } catch {
    return false;
  }
}

/**
 * Fetches list of all installed printers on client Windows machine.
 */
export async function getInstalledPrinters(): Promise<string[]> {
  await connectQZ();
  const qz = await getQZ();
  const printers = await qz.printers.find();
  return Array.isArray(printers) ? printers : [printers];
}

/**
 * Finds printer matching a target query (e.g. "HID Fargo DTC1250e").
 */
export async function findTargetPrinter(printerQuery: string): Promise<string> {
  await connectQZ();
  const qz = await getQZ();
  
  if (!printerQuery) {
    throw new Error('Nama printer target tidak boleh kosong. Silakan pilih printer yang valid.');
  }

  try {
    const matched = await qz.printers.find(printerQuery);
    
    // Check if matched has a valid string or array with elements
    if (Array.isArray(matched)) {
      const firstMatch = matched.find((p) => p && p.trim().length > 0);
      if (firstMatch) {
        return firstMatch;
      }
    } else if (matched && typeof matched === 'string') {
      return matched;
    }

    // If no printer was matched, get list of all printers to show in error
    const allPrinters = await qz.printers.find();
    const printerList = Array.isArray(allPrinters) 
      ? allPrinters.filter(p => p).join(', ') 
      : (allPrinters ? String(allPrinters) : '');

    if (printerList) {
      throw new Error(
        `Printer "${printerQuery}" tidak ditemukan di sistem Windows Anda. Printer yang terdeteksi: [ ${printerList} ]. Silakan pasang driver printer atau pilih printer yang benar dari dropdown.`
      );
    } else {
      throw new Error(
        `Printer "${printerQuery}" tidak ditemukan dan tidak ada printer lain yang terdeteksi. Silakan pastikan printer terhubung dan driver terinstal.`
      );
    }
  } catch (err: any) {
    if (err.message && (err.message.includes('tidak ditemukan') || err.message.includes('tidak boleh kosong'))) {
      throw err;
    }
    throw new Error(`Gagal mencari printer "${printerQuery}". Detail: ${err.message || err}`);
  }
}

/**
 * Sends a raw image print job (Base64 PNG) to HID Fargo DTC1250e / target printer.
 */
export async function printIDCardImage({
  printerName,
  imageBase64,
  options = {}
}: QZPrintJob): Promise<void> {
  await connectQZ();
  const qz = await getQZ();

  if (!printerName) {
    throw new Error('Nama printer target tidak valid (null/kosong).');
  }

  // Extract raw base64 data payload only (strip data:image/png;base64, prefix)
  const cleanBase64 = imageBase64.includes(';base64,')
    ? imageBase64.split(';base64,')[1]
    : imageBase64;

  if (!cleanBase64 || cleanBase64.trim().length === 0) {
    throw new Error('Gambar ID Card tidak valid (Base64 kosong).');
  }

  // Configure printer config target (calibrated to CR-80 card specs: 55mm x 86mm)
  // For virtual PDF printers, we use standard sizes to avoid blank outputs.
  // For physical Fargo card printers, we force a custom 57mm x 89mm full bleed to get edge-to-edge prints.
  const sizeConfig = { width: 53.98, height: 85.60 };

  const config = qz.configs.create(printerName, {
    colorType: options.colorType || 'color',
    copies: options.copies || 1,
    orientation: options.orientation || 'portrait',
    units: 'mm',
    size: sizeConfig,
    scaleContent: options.scaleContent !== undefined ? options.scaleContent : true,
    margins: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    }
  });

  // Formulate QZ Print data array (CR-80 Image Format using correct type: 'pixel', format: 'image', flavor: 'base64')
  const printData = [
    {
      type: 'pixel',
      format: 'image',
      flavor: 'base64',
      data: cleanBase64
    }
  ];

  // Send print job to QZ Tray daemon
  await qz.print(config, printData);
}

