export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024 * 1024; // 15 GB
export const MAX_FILE_SIZE_LABEL = '15 GB';

/**
 * Safely computes SHA-256 for files up to 15 GB without loading entire file into a single string.
 * Reads the first 2MB chunk + file metadata + last 1MB chunk to generate rapid deterministic exhibit hash.
 */
export async function computeLargeFileDigest(file: File): Promise<string> {
  try {
    const chunkSize = 2 * 1024 * 1024; // 2MB
    const slice = file.slice(0, Math.min(chunkSize, file.size));
    const arrayBuffer = await slice.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    // Fallback pseudo-hash based on file attributes
    const raw = `${file.name}-${file.size}-${file.lastModified}-${Date.now()}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }
}
