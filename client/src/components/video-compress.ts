export type VideoCompressionProgress = {
  phase: "loading" | "recording" | "done" | "skipped";
  progress: number;
  message: string;
};

type CompressOptions = {
  onProgress?: (progress: VideoCompressionProgress) => void;
  minSizeBytes?: number;
  maxWidth?: number;
  maxHeight?: number;
  fps?: number;
};

function pickSupportedMimeType(): string | null {
  const candidates = [
    "video/mp4;codecs=h264",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];

  if (typeof MediaRecorder === "undefined") return null;

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || null;
}

function extensionForMimeType(mimeType: string): string {
  return mimeType.includes("mp4") ? "mp4" : "webm";
}

function replaceExtension(filename: string, extension: string): string {
  const cleanName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleanName.includes(".")
    ? cleanName.replace(/\.[^/.]+$/, `.${extension}`)
    : `${cleanName}.${extension}`;
}

function waitForMetadata(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error("Video metadata timed out."));
    }, 15000);

    video.onloadedmetadata = () => {
      window.clearTimeout(timeout);
      resolve();
    };

    video.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error("This browser could not read the selected video."));
    };
  });
}

/**
 * Best-effort browser compression before backend upload.
 *
 * Important:
 * - If the browser cannot decode the video, this safely returns the original file.
 * - Backend compression still remains the final safety net.
 * - Some iPhone HEVC/MOV files cannot be compressed in Chrome because Chrome cannot decode them.
 */
export async function compressVideo(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  const {
    onProgress,
    minSizeBytes = 45 * 1024 * 1024,
    maxWidth = 1280,
    maxHeight = 720,
    fps = 24,
  } = options;

  if (file.size < minSizeBytes) {
    onProgress?.({
      phase: "skipped",
      progress: 100,
      message: "Video is already small enough.",
    });
    return file;
  }

  const mimeType = pickSupportedMimeType();
  if (!mimeType) {
    onProgress?.({
      phase: "skipped",
      progress: 100,
      message: "Browser compression is not supported here.",
    });
    return file;
  }

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = objectUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";

  try {
    onProgress?.({
      phase: "loading",
      progress: 5,
      message: "Preparing video compression...",
    });

    await waitForMetadata(video);

    const duration = Number.isFinite(video.duration) && video.duration > 0
      ? video.duration
      : 1;

    const sourceWidth = video.videoWidth || maxWidth;
    const sourceHeight = video.videoHeight || maxHeight;
    const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight, 1);

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(2, Math.floor(sourceWidth * scale));
    canvas.height = Math.max(2, Math.floor(sourceHeight * scale));

    // H.264/yuv encoders are happier with even dimensions.
    if (canvas.width % 2) canvas.width -= 1;
    if (canvas.height % 2) canvas.height -= 1;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Unable to prepare video compression canvas.");
    }

    const stream = canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 1_800_000,
    });

    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    const stopped = new Promise<void>((resolve, reject) => {
      recorder.onstop = () => resolve();
      recorder.onerror = () => reject(new Error("Browser video compression failed."));
    });

    let animationFrame = 0;

    const drawFrame = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const rawProgress = Math.round((video.currentTime / duration) * 100);
      const progress = Math.min(98, Math.max(8, rawProgress));

      onProgress?.({
        phase: "recording",
        progress,
        message: `Compressing video... ${progress}%`,
      });

      if (!video.paused && !video.ended) {
        animationFrame = requestAnimationFrame(drawFrame);
      }
    };

    recorder.start(1000);

    await video.play();
    drawFrame();

    await new Promise<void>((resolve) => {
      video.onended = () => resolve();
    });

    if (animationFrame) cancelAnimationFrame(animationFrame);

    if (recorder.state !== "inactive") {
      recorder.stop();
    }

    await stopped;

    stream.getTracks().forEach((track) => track.stop());

    const compressedBlob = new Blob(chunks, { type: mimeType });

    if (!compressedBlob.size || compressedBlob.size >= file.size * 0.95) {
      onProgress?.({
        phase: "skipped",
        progress: 100,
        message: "Compression did not reduce this video enough.",
      });
      return file;
    }

    const extension = extensionForMimeType(mimeType);
    const compressedFile = new File(
      [compressedBlob],
      replaceExtension(file.name, extension),
      {
        type: mimeType.split(";")[0],
        lastModified: Date.now(),
      },
    );

    onProgress?.({
      phase: "done",
      progress: 100,
      message: `Compressed from ${(file.size / 1024 / 1024).toFixed(1)} MB to ${(compressedFile.size / 1024 / 1024).toFixed(1)} MB.`,
    });

    return compressedFile;
  } catch (error) {
    console.warn("Client video compression skipped:", error);

    onProgress?.({
      phase: "skipped",
      progress: 100,
      message: "Using backend optimization for this video.",
    });

    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
