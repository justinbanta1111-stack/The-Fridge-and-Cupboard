import { createFileRoute } from '@tanstack/react-router';
import { createPrivateKey, createSign } from 'crypto';

// Convert ECDSA DER signature to JOSE raw R||S (64 bytes for P-256).
function derToJose(der: Buffer): Buffer {
  // DER: 0x30 len 0x02 rLen r 0x02 sLen s
  let offset = 2;
  if (der[0] !== 0x30) throw new Error('Invalid DER signature');
  if (der[1] & 0x80) offset += der[1] & 0x7f; // long-form length
  if (der[offset] !== 0x02) throw new Error('Invalid DER signature (r)');
  const rLen = der[offset + 1];
  let r = der.subarray(offset + 2, offset + 2 + rLen);
  offset = offset + 2 + rLen;
  if (der[offset] !== 0x02) throw new Error('Invalid DER signature (s)');
  const sLen = der[offset + 1];
  let s = der.subarray(offset + 2, offset + 2 + sLen);
  // strip leading zeros / pad to 32 bytes
  const pad = (buf: Buffer) => {
    if (buf.length > 32) buf = buf.subarray(buf.length - 32);
    if (buf.length < 32) buf = Buffer.concat([Buffer.alloc(32 - buf.length), buf]);
    return buf;
  };
  return Buffer.concat([pad(r), pad(s)]);
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function signAppStoreJwt(keyId: string, issuerId: string, p8: string): string {
  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: issuerId,
    iat: now,
    exp: now + 600,
    aud: 'appstoreconnect-v1',
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const key = createPrivateKey({ key: p8, format: 'pem' });
  const signer = createSign('SHA256');
  signer.update(signingInput);
  const der = signer.sign(key);
  const jose = derToJose(der);
  return `${signingInput}.${b64url(jose)}`;
}

interface DryCheckBody {
  keyId?: string;
  issuerId?: string;
  p8?: string;
}

export const Route = createFileRoute('/api/admin/testflight-dry-check')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.ADMIN_API_TOKEN || '';
        if (!expected) {
          return Response.json(
            { ok: false, error: 'ADMIN_API_TOKEN is not configured on the server.' },
            { status: 401 },
          );
        }
        if (request.headers.get('authorization') !== `Bearer ${expected}`) {
          return Response.json({ ok: false, error: 'Admin API token rejected.' }, { status: 401 });
        }

        let body: DryCheckBody = {};
        try {
          body = (await request.json()) as DryCheckBody;
        } catch {
          // empty ok
        }

        const keyId = (body.keyId || process.env.ASC_KEY_ID || process.env.APP_STORE_CONNECT_API_KEY_ID || '').trim();
        const issuerId = (body.issuerId || process.env.APP_STORE_CONNECT_API_ISSUER_ID || '').trim();
        const p8 = (body.p8 || process.env.APP_STORE_CONNECT_API_KEY_P8 || '').trim();

        const missing: string[] = [];
        if (!keyId) missing.push('ASC_KEY_ID');
        if (!issuerId) missing.push('APP_STORE_CONNECT_API_ISSUER_ID');
        if (!p8) missing.push('APP_STORE_CONNECT_API_KEY_P8');
        if (missing.length) {
          return Response.json(
            {
              ok: false,
              stage: 'inputs',
              error: `Missing values: ${missing.join(', ')}`,
              hint: 'Paste all three App Store Connect API values, or set them as runtime secrets on the server.',
            },
            { status: 400 },
          );
        }

        // 1. Shape check on the P8.
        if (!/-----BEGIN PRIVATE KEY-----/.test(p8) || !/-----END PRIVATE KEY-----/.test(p8)) {
          return Response.json(
            {
              ok: false,
              stage: 'p8_format',
              error: 'P8 does not look like a PEM private key.',
              hint: 'Paste the full AuthKey_XXXX.p8 contents including the BEGIN/END lines.',
            },
            { status: 400 },
          );
        }

        // 2. Mint JWT.
        let jwt: string;
        try {
          jwt = signAppStoreJwt(keyId, issuerId, p8);
        } catch (e: any) {
          return Response.json(
            {
              ok: false,
              stage: 'jwt_sign',
              error: `Failed to sign JWT with the provided .p8: ${e?.message || String(e)}`,
              hint: 'The .p8 is malformed or does not match ES256. Re-download AuthKey_XXXX.p8 from App Store Connect.',
            },
            { status: 400 },
          );
        }

        // 3. Call App Store Connect — GET /v1/apps?limit=1 verifies auth + issuer + key match.
        let res: Response;
        try {
          res = await fetch('https://api.appstoreconnect.apple.com/v1/apps?limit=1', {
            headers: { Authorization: `Bearer ${jwt}`, Accept: 'application/json' },
          });
        } catch (e: any) {
          return Response.json(
            {
              ok: false,
              stage: 'network',
              error: `Network error calling App Store Connect: ${e?.message || String(e)}`,
            },
            { status: 502 },
          );
        }

        const text = await res.text();
        let parsed: any = null;
        try {
          parsed = JSON.parse(text);
        } catch {
          // non-JSON
        }

        if (res.status === 401) {
          return Response.json(
            {
              ok: false,
              stage: 'auth',
              httpStatus: 401,
              error: 'App Store Connect rejected the JWT (401).',
              hint: 'Key ID, Issuer ID, and .p8 do not all match. Re-copy each from App Store Connect → Users and Access → Integrations → Team Keys.',
              apple: parsed?.errors?.[0] || text.slice(0, 500),
            },
            { status: 200 },
          );
        }

        if (res.status === 403) {
          return Response.json(
            {
              ok: false,
              stage: 'permissions',
              httpStatus: 403,
              error: 'Authenticated, but the API key lacks permission (403).',
              hint: 'The API key role must be Admin or App Manager to use TestFlight upload.',
              apple: parsed?.errors?.[0] || text.slice(0, 500),
            },
            { status: 200 },
          );
        }

        if (!res.ok) {
          return Response.json(
            {
              ok: false,
              stage: 'http',
              httpStatus: res.status,
              error: `App Store Connect returned HTTP ${res.status}.`,
              apple: parsed?.errors?.[0] || text.slice(0, 500),
            },
            { status: 200 },
          );
        }

        const appCount = Array.isArray(parsed?.data) ? parsed.data.length : 0;
        const firstApp = parsed?.data?.[0]?.attributes || null;
        return Response.json({
          ok: true,
          stage: 'ok',
          httpStatus: 200,
          message: 'Credentials authenticated successfully with App Store Connect.',
          appCount,
          sampleApp: firstApp
            ? {
                bundleId: firstApp.bundleId,
                name: firstApp.name,
                sku: firstApp.sku,
              }
            : null,
        });
      },
    },
  },
});
