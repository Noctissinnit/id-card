import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * API Route for QZ Tray RSA SHA-256 Digital Signature (Production Security)
 * 
 * In production mode, QZ Tray requires all print commands to be digitally signed
 * by the server's private key to prevent unauthorized print jobs.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { request: requestToSign } = body;

    if (!requestToSign) {
      return NextResponse.json({ error: 'Request string is required.' }, { status: 400 });
    }

    // Retrieve RSA Private Key from environment variables (PEM format)
    const privateKey = process.env.QZ_PRIVATE_KEY;

    if (!privateKey) {
      // Development fallback message
      if (process.env.NODE_ENV === 'development') {
        return new NextResponse('DEV_UNSIGNED_MODE', { status: 200 });
      }
      return NextResponse.json(
        { error: 'Server private key (QZ_PRIVATE_KEY) is not configured.' },
        { status: 500 }
      );
    }

    // Sign request string using RSA-SHA256
    const signer = crypto.createSign('SHA256');
    signer.update(requestToSign);
    signer.end();

    const signature = signer.sign(privateKey, 'base64');

    // Return Base64-encoded signature string
    return new NextResponse(signature, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch (err: any) {
    console.error('QZ Sign Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to sign QZ request.' },
      { status: 500 }
    );
  }
}
