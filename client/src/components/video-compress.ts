// client/src/components/video-compress.ts
// Lightweight client-side compression using MediaRecorder fallback (no wasm dependency)

export async function compressVideo(file: File): Promise<File> {
  // If already small (<20MB), skip
  if (file.size < 20 * 1024 * 1024) return file;

  const video = document.createElement("video");
  video.src = URL.createObjectURL(file);
  await video.play().catch(() => {});

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // target 1080p max
  const scale = Math.min(1920 / video.videoWidth, 1080 / video.videoHeight, 1);
  canvas.width = Math.floor(video.videoWidth * scale);
  canvas.height = Math.floor(video.videoHeight * scale);

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);

  recorder.start();

  const draw = () => {
    if (video.paused || video.ended) return;
    ctx!.drawImage(video, 0, 0, canvas.width, canvas.height);
    requestAnimationFrame(draw);
  };

  draw();

  await new Promise((res) => {
    video.onended = res;
  });

  recorder.stop();

  await new Promise((res) => (recorder.onstop = res));

  const blob = new Blob(chunks, { type: "video/webm" });
  return new File([blob], file.name.replace(/\.[^/.]+$/, ".webm"), { type: "video/webm" });
}
