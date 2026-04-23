// server/downloadVideo.js
// Reliable downloader for Supabase video URLs

import fs from "fs";
import fetch from "node-fetch";

export async function downloadVideoToFile(url, outputPath) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Download failed: ${res.status}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("video")) {
    throw new Error("Downloaded file is not a video");
  }

  const fileStream = fs.createWriteStream(outputPath);

  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on("error", reject);
    fileStream.on("finish", resolve);
  });

  // Validate file size
  const stats = fs.statSync(outputPath);
  if (!stats.size || stats.size < 10000) {
    throw new Error("Downloaded file is too small / corrupted");
  }

  return outputPath;
}
