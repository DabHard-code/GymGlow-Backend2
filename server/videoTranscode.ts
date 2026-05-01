import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import path from "path";
import fs from "fs";

ffmpeg.setFfmpegPath(ffmpegPath as string);

export async function transcodeTo1080pH264Mp4(
  inputPath: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const outputPath =
      path.join(
        path.dirname(inputPath),
        path.basename(inputPath, path.extname(inputPath)),
      ) + "_optimized.mp4";

    ffmpeg(inputPath)
      .outputOptions([
        "-c:v libx264",
        "-preset veryfast",
        "-crf 28",
        "-pix_fmt yuv420p",
        "-profile:v baseline",
        "-level 3.1",
        "-movflags +faststart",
        "-c:a aac",
        "-b:a 128k",
        "-ar 44100",
        "-vf scale='min(1280,iw)':-2",
      ])
      .on("start", (cmd) => {
        console.log("FFMPEG START:", cmd);
      })
      .on("error", (err) => {
        console.error("FFMPEG ERROR:", err.message);
        reject(err);
      })
      .on("end", () => {
        console.log("FFMPEG DONE:", outputPath);

        if (!fs.existsSync(outputPath)) {
          return reject(new Error("Output file missing after transcode"));
        }

        resolve(outputPath);
      })
      .save(outputPath);
  });
}
