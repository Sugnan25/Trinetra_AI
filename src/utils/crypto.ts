/**
 * Real SHA-256 computation using the browser's SubtleCrypto API.
 * Ensures tamper-evident evidentiary provenance for Section 65B/63 judicial certifications.
 */
export async function computeSha256(data: string | ArrayBuffer): Promise<string> {
  let buffer: ArrayBuffer;
  if (typeof data === 'string') {
    const encoder = new TextEncoder();
    buffer = encoder.encode(data);
  } else {
    buffer = data;
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Generates an official digital evidence fingerprint tag.
 */
export function formatEvidenceHash(hash: string): string {
  if (!hash || hash.length < 16) return 'SHA-256: PENDING_VERIFICATION';
  return `SHA256:${hash.slice(0, 8)}...${hash.slice(-8)}`.toUpperCase();
}
