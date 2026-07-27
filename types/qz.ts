export interface QZPrinterInfo {
  name: string;
  isDefault?: boolean;
}

export interface QZPrintOptions {
  colorType?: 'color' | 'grayscale';
  copies?: number;
  density?: number;
  orientation?: 'portrait' | 'landscape';
  units?: 'mm' | 'in' | 'px';
  scaleContent?: boolean;
  rasterize?: boolean;
  altPrinting?: boolean;
}

export type QZConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface QZPrintJob {
  printerName: string;
  imageBase64: string;
  options?: QZPrintOptions;
}

export interface QZState {
  state: QZConnectionState;
  printers: string[];
  selectedPrinter: string | null;
  loading: boolean;
  error: string | null;
  statusMessage: string;
}
