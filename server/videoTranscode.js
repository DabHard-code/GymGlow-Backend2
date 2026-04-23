// DROP-IN REPLACEMENT
// server/videoTranscode.js

import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import path from "path";

ffmpeg.setFfmpegPath(ffmpegPath);

export function transcodeTo1080pH264Mp4(inputPath) {
  return new Promise((resolve, reject) => {
    const outputPath = inputPath + "_fixed.mp4";

    ffmpeg(inputPath)
      .inputOptions([
        "-fflags +genpts",
        "-err_detect ignore_err"
      ])
      .outputOptions([
        "-vf scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease",
        "-c:v libx264",
        "-preset veryfast",
        "-crf 23",
        "-c:a aac",
        "-movflags +faststart"
      ])
      .on("end", () => resolve(outputPath))
      .on("error", (err) => reject(err))
      .save(outputPath);
  });
}
