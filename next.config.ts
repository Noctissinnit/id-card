import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable Cross-Origin Isolation so WASM multi-threading (SharedArrayBuffer)
  // works correctly in the browser. Without these headers, ONNX Runtime falls
  // back to single-threaded mode which freezes the main thread and triggers
  // HMR WebSocket disconnect → automatic page reload.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            // "credentialless" is more permissive than "require-corp" —
            // it does NOT require every sub-resource to send CORS headers,
            // so Google Fonts, Supabase, CDN assets, etc. keep working.
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
