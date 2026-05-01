const fs = require('fs');
const path = require('path');

function read(p) { return fs.readFileSync(p, 'utf8'); }
function write(p, s) { fs.writeFileSync(p, s, 'utf8'); console.log('patched ' + p); }
function backup(p) {
  const b = p + '.bak-large-video-tsfix';
  if (!fs.existsSync(b)) fs.copyFileSync(p, b);
}

const root = process.cwd();
const routesPath = path.join(root, 'server', 'routes.ts');
const compressPath = path.join(root, 'client', 'src', 'components', 'video-compress.ts');

if (!fs.existsSync(routesPath)) throw new Error('Missing server/routes.ts. Run this from the GymGlow project root.');

// ---- server/routes.ts helper fixes ----
backup(routesPath);
let routes = read(routesPath);

const helpers = `
function sanitizeUploadFileName(fileName: string | null | undefined): string {
  const raw = String(fileName || "upload.mp4");
  const cleaned = raw
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
  return cleaned || "upload.mp4";
}

function inferVideoExtension(fileName: string | null | undefined, mimeType: string | null | undefined): string {
  const fromName = String(fileName || "").toLowerCase().match(/\.(mp4|mov|m4v|webm|avi|mkv)$/)?.[1];
  if (fromName) return fromName === "m4v" ? "mp4" : fromName;

  const mime = String(mimeType || "").toLowerCase();
  if (mime.includes("quicktime")) return "mov";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("x-msvideo") || mime.includes("avi")) return "avi";
  if (mime.includes("matroska") || mime.includes("mkv")) return "mkv";
  return "mp4";
}

function hasInlineVideoPayload(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const value = body as Record<string, unknown>;
  return (
    typeof value.videoBase64 === "string" ||
    typeof value.videoData === "string" ||
    typeof value.videoBuffer === "string" ||
    typeof value.fileBase64 === "string" ||
    typeof value.dataUrl === "string"
  );
}
`;

if (!routes.includes('function sanitizeUploadFileName(')) {
  const anchor = 'function safeVideoExtension(videoPath: string | null | undefined): string {';
  const idx = routes.indexOf(anchor);
  if (idx !== -1) {
    routes = routes.slice(0, idx) + helpers + '\n' + routes.slice(idx);
  } else {
    // Fallback: insert after imports, before first app/register function if possible
    const fallbackIdx = routes.search(/export\s+async\s+function|async\s+function\s+registerRoutes|function\s+safeVideoExtension/);
    if (fallbackIdx === -1) throw new Error('Could not find a safe place to add routes helpers.');
    routes = routes.slice(0, fallbackIdx) + helpers + '\n' + routes.slice(fallbackIdx);
  }
}

write(routesPath, routes);

// ---- client video-compress.ts type fixes ----
if (fs.existsSync(compressPath)) {
  backup(compressPath);
  let c = read(compressPath);

  c = c.replace(/const chunks = \[\];/g, 'const chunks: BlobPart[] = [];');

  // Add a guard after getContext if missing. Handles common code shape.
  c = c.replace(
    /(const\s+ctx\s*=\s*canvas\.getContext\(["']2d["']\);)(?!\s*if \(!ctx\))/g,
    '$1\n  if (!ctx) throw new Error("Unable to prepare video compression canvas.");'
  );

  write(compressPath, c);
} else {
  console.log('client/src/components/video-compress.ts not found, skipped');
}

console.log('\nDone. Now run: npm run check');
