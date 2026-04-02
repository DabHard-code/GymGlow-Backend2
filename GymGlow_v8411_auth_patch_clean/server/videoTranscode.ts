import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import path from "path";

export async function transcodeTo1080pH264Mp4(inputPath: string): Promise<string> {
  if (!ffmpegPath) throw new Error("ffmpeg-static not available");

  const dir = path.dirname(inputPath);
  const base = path.basename(inputPath).replace(/\.[^.]+$/, "");
  const outPath = path.join(dir, `${base}_1080p_h264.mp4`);

  const args = [
    "-y",
    "-i", inputPath,

    // Downscale to <=1080p, preserve aspect ratio
    "-vf", "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease",

    // H.264 encode (fast)
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "23",
    "-pix_fmt", "yuv420p",

    // Audio safe default
    "-c:a", "aac",
    "-b:a", "128k",

    // Better seeking/streaming
    "-movflags", "+faststart",

    outPath,
  ];

  await new Promise<void>((resolve, reject) => {
    const p = spawn(ffmpegPath as string, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    p.stderr.on("data", (d) => (stderr += d.toString()));
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg failed (code ${code}): ${stderr.slice(-2000)}`));
    });
  });

  return outPath;
}