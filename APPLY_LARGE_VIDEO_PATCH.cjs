const fs = require('fs');
const path = require('path');

const root = process.cwd();
const files = {
  routes: path.join(root, 'server', 'routes.ts'),
  analysis: path.join(root, 'client', 'src', 'components', 'analysis-view.tsx'),
  uploadZone: path.join(root, 'client', 'src', 'components', 'video-upload-zone.tsx'),
  transcode: path.join(root, 'server', 'videoTranscode.ts'),
  pkg: path.join(root, 'package.json'),
};

function mustRead(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing file: ${path.relative(root, file)}`);
  return fs.readFileSync(file, 'utf8');
}
function write(file, text) {
  fs.writeFileSync(file, text, 'utf8');
  console.log(`patched ${path.relative(root, file)}`);
}
function once(text, search, replace, label) {
  if (!text.includes(search)) throw new Error(`Could not find patch target: ${label}`);
  return text.replace(search, replace);
}
function addImport(text, importLine, afterPattern) {
  if (text.includes(importLine)) return text;
  if (text.includes(afterPattern)) return text.replace(afterPattern, afterPattern + ' ' + importLine);
  return importLine + '\n' + text;
}

// 1) package.json: add multer + @types/multer
{
  const pkg = JSON.parse(mustRead(files.pkg));
  pkg.dependencies ||= {};
  pkg.devDependencies ||= {};
  if (!pkg.dependencies.multer) pkg.dependencies.multer = '^1.4.5-lts.1';
  if (!pkg.devDependencies['@types/multer']) pkg.devDependencies['@types/multer'] = '^1.4.12';
  write(files.pkg, JSON.stringify(pkg, null, 2) + '\n');
}

// 2) server/videoTranscode.ts: make backend-created video smaller for Supabase free 50MB limit.
{
  let t = mustRead(files.transcode);
  t = t.replace(`"scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease"`, `"scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease"`);
  t = t.replace('"-crf", "23"', '"-crf", "28"');
  t = t.replace('"-b:a", "128k"', '"-b:a", "96k"');
  if (!t.includes('"-maxrate", "2500k"') && t.includes('"-crf", "28"')) {
    t = t.replace('"-crf", "28",', '"-crf", "28", "-maxrate", "2500k", "-bufsize", "5000k",');
  }
  write(files.transcode, t);
}

// 3) server/routes.ts: add multer import and backend upload endpoint.
{
  let r = mustRead(files.routes);
  r = addImport(r, 'import multer from "multer";', 'import { getStripe, getPriceIdForPlan, planFromPriceId, type PaidPlan } from "./stripe";');

  const routeCode = [
'',
'const backendVideoUpload = multer({',
'  storage: multer.diskStorage({',
'    destination: (_req, _file, cb) => {',
'      const dir = path.join(os.tmpdir(), "gymglow-uploads");',
'      fs.mkdirSync(dir, { recursive: true });',
'      cb(null, dir);',
'    },',
'    filename: (_req, file, cb) => {',
'      const safeName = String(file.originalname || "upload.mp4").replace(/[^a-zA-Z0-9._-]/g, "_");',
'      cb(null, `${Date.now()}_${randomUUID()}_${safeName}`);',
'    },',
'  }),',
'  limits: { fileSize: 600 * 1024 * 1024 },',
'  fileFilter: (_req, file, cb) => {',
'    const name = String(file.originalname || "").toLowerCase();',
'    const ok = String(file.mimetype || "").startsWith("video/") || /\\.(mp4|mov|m4v|webm|qt|hevc)$/i.test(name);',
'    if (!ok) return cb(new Error("Please upload a supported video file."));',
'    cb(null, true);',
'  },',
'});',
'',
'app.post("/api/uploads/video/backend", backendVideoUpload.single("video"), async (req, res) => {',
'  const userId = requireUserId(req, res);',
'  if (!userId) return;',
'  await storage.ensureUserFromAuth(userId);',
'',
'  const file = req.file;',
'  if (!file) return res.status(400).json({ error: "No video file received." });',
'',
'  const profileId = String(req.body?.profileId || "no-profile");',
'  const safeBaseName = String(file.originalname || "upload.mp4")',
'    .replace(/[^a-zA-Z0-9._-]/g, "_")',
'    .replace(/\\.[^.]+$/, "");',
'',
'  let optimizedPath: string | null = null;',
'',
'  try {',
'    optimizedPath = await transcodeTo1080pH264Mp4(file.path);',
'    const optimizedBuffer = await fs.promises.readFile(optimizedPath);',
'    const optimizedSizeMb = Number((optimizedBuffer.length / 1024 / 1024).toFixed(1));',
'',
'    if (optimizedBuffer.length > 50 * 1024 * 1024) {',
'      return res.status(413).json({',
'        error: `Video is still ${optimizedSizeMb} MB after optimization. Trim it shorter, then upload again.`,',
'        optimizedSizeMb,',
'      });',
'    }',
'',
'    const videoPath = [userId, profileId, `${Date.now()}_${safeBaseName}_optimized.mp4`].join("/");',
'',
'    const { error: uploadError } = await supabaseAdmin.storage',
'      .from("Videos")',
'      .upload(videoPath, optimizedBuffer, {',
'        contentType: "video/mp4",',
'        upsert: false,',
'      });',
'',
'    if (uploadError) {',
'      return res.status(500).json({ error: `Optimized upload failed: ${uploadError.message}` });',
'    }',
'',
'    return res.json({ success: true, bucket: "Videos", videoPath, sizeMb: optimizedSizeMb });',
'  } catch (e: any) {',
'    return res.status(500).json({',
'      error: e?.message || "Backend video optimization failed before upload.",',
'    });',
'  } finally {',
'    await fs.promises.rm(file.path, { force: true }).catch(() => {});',
'    if (optimizedPath) await fs.promises.rm(optimizedPath, { force: true }).catch(() => {});',
'  }',
'});',
''
  ].join('\n');

  if (!r.includes('/api/uploads/video/backend')) {
    // Insert inside registerRoutes. Some copies of routes.ts are formatted as one very long line,
    // so this uses broad anchors instead of one exact return statement.
    const markers = [
      '/* ==================== USER / BILLING (MVP) ==================== */',
      'app.get("/api/users/me"',
      '/* ==================== ATHLETES ==================== */',
    ];
    let inserted = false;
    for (const marker of markers) {
      const idx = r.indexOf(marker);
      if (idx !== -1) {
        r = r.slice(0, idx) + routeCode + '\n' + r.slice(idx);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      throw new Error('Could not find a safe insertion spot in server/routes.ts. Looked for USER/BILLING, /api/users/me, and ATHLETES anchors.');
    }
  }
  write(files.routes, r);
}

// 4) client analysis-view.tsx: replace direct Supabase Storage upload with backend upload.
{
  let a = mustRead(files.analysis);
  if (!a.includes('/api/uploads/video/backend')) {
    const start = a.indexOf('const userId = authData.user.id;');
    const end = a.indexOf('// ✅ Tell backend to analyze by storage path', start);
    if (start === -1 || end === -1) throw new Error('Could not find direct Supabase upload block in analysis-view.tsx');
    const afterAnalyzeCall = a.indexOf('});', end);
    if (afterAnalyzeCall === -1) throw new Error('Could not find analyzeMutation.mutate close in analysis-view.tsx');
    const replaceEnd = afterAnalyzeCall + 3;
    const newBlock = [
'const formData = new FormData();',
'      formData.append("video", videoFile);',
'      formData.append("profileId", profileId || "no-profile");',
'',
'      const uploadResponse = await fetch("/api/uploads/video/backend", {',
'        method: "POST",',
'        headers: {',
'          "x-user-id": authData.user.id,',
'        },',
'        body: formData,',
'      });',
'',
'      const uploadData = await uploadResponse.json().catch(() => null);',
'',
'      if (!uploadResponse.ok) {',
'        throw new Error(uploadData?.error || `Upload failed with status ${uploadResponse.status}`);',
'      }',
'',
'      analyzeMutation.mutate({',
'        videoPath: uploadData.videoPath,',
'        title: videoFile.name,',
'      });'
    ].join('\n');
    a = a.slice(0, start) + newBlock + a.slice(replaceEnd);
  }
  write(files.analysis, a);
}

// 5) client video-upload-zone.tsx: update misleading text/comments.
{
  let z = mustRead(files.uploadZone);
  z = z.replace('Send the original file to Supabase and let the backend ffmpeg pipeline convert it.', 'Send the original file to GymGlow backend first; backend ffmpeg shrinks it before Supabase storage.');
  z = z.replace('Large videos are optimized after upload.', 'Large videos are sent to GymGlow first, optimized, then stored safely.');
  z = z.replace('GymGlow will optimize large mobile videos before AI analysis.', 'GymGlow will optimize large mobile videos before storage and AI analysis.');
  write(files.uploadZone, z);
}

console.log('\n✅ Large video backend patch applied. Now run:');
console.log('npm install');
console.log('npm run check');
