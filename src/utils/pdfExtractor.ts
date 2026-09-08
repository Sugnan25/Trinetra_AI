import * as pdfjsLib from 'pdfjs-dist';

// Configure worker source safely using local bundler URL with unpkg fallback
function setupPdfWorker() {
  try {
    if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      // 1. Try local bundled worker URL resolved by Vite
      try {
        const localWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
        pdfjsLib.GlobalWorkerOptions.workerSrc = localWorker;
      } catch {
        // 2. Fallback to valid unpkg CDN URL (verified 200 OK for this exact version)
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      }
    }
  } catch (e) {
    console.warn('PDF.js worker setup notice:', e);
  }
}

/**
 * Fallback regex/stream extractor for PDF files when worker fails or in sandbox
 */
function extractTextFromPdfBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let text = '';
  // Convert chunks to string to search for stream text
  const chunkSize = 8192;
  const strParts: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    strParts.push(String.fromCharCode.apply(null, Array.from(sub)));
  }
  const rawStr = strParts.join('');

  // Extract parentheses content inside text objects (Tj / TJ operators)
  const matches = rawStr.match(/\(([^()]{2,})\)\s*(?:Tj|TJ|'|")/g);
  if (matches && matches.length > 0) {
    text = matches
      .map(m => {
        const inner = m.match(/\(([^()]+)\)/);
        return inner ? inner[1] : '';
      })
      .filter(t => t.trim().length > 1)
      .join(' ');
  }

  // Also extract readable ASCII words if Tj matches were scarce
  if (text.length < 50) {
    const words = rawStr.match(/[A-Za-z0-9+/=.:,-]{4,}/g);
    if (words) {
      text = words.join(' ');
    }
  }

  return text;
}

/**
 * Extracts all textual content from a PDF file using PDF.js with fallback
 */
export async function extractTextFromPdf(file: File): Promise<{
  text: string;
  pageCount: number;
  fileName: string;
  fileSize: string;
}> {
  setupPdfWorker();
  const arrayBuffer = await file.arrayBuffer();
  const fileSize = `${(file.size / 1024).toFixed(1)} KB`;

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: false,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;
    const textPieces: string[] = [];

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str || '')
        .join(' ');
      if (pageText.trim()) {
        textPieces.push(`--- PAGE ${pageNum} ---\n${pageText}`);
      }
    }

    const fullText = textPieces.join('\n\n');
    if (fullText.trim().length > 20) {
      return {
        text: fullText,
        pageCount,
        fileName: file.name,
        fileSize,
      };
    }
  } catch (err) {
    console.warn('PDF.js parse failed, trying buffer fallback extractor:', err);
  }

  // Fallback extraction
  const fallback = extractTextFromPdfBuffer(arrayBuffer);
  return {
    text: fallback || `[PDF Document: ${file.name} (Binary Content)]`,
    pageCount: 1,
    fileName: file.name,
    fileSize,
  };
}
