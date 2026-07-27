declare module 'qz-tray' {
  export namespace api {
    function setSha256Type(fn: (data: string) => Promise<string>): void;
    function setPromiseType(fn: (promise: Promise<any>) => any): void;
  }
  export namespace security {
    function setCertificatePromise(fn: (resolve: (cert: string) => void, reject: (reason: any) => void) => void): void;
    function setSignatureAlgorithm(fn: (data: string) => Promise<string>): void;
    function setSignaturePromise(fn: (toSign: string) => (resolve: (signature: string) => void, reject: (reason: any) => void) => void): void;
  }
  export namespace websocket {
    function connect(options?: { retries?: number; delay?: number; host?: string; port?: { secure?: number[]; insecure?: number[] } }): Promise<void>;
    function disconnect(): Promise<void>;
    function isActive(): boolean;
  }
  export namespace printers {
    function find(query?: string): Promise<string | string[]>;
    function details(query?: string): Promise<any>;
  }
  export namespace configs {
    function create(printer: string, options?: any): any;
  }
  export function print(config: any, data: any[]): Promise<void>;
}
