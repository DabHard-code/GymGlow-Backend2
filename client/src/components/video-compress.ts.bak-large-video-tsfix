// REAL SAFE COMPRESSION (MP4 PRESERVING)
// client/src/components/video-compress.ts

export async function compressVideo(file: File): Promise<File> {
  // Skip small files
  if (file.size < 40 * 1024 * 1024) return file;

  const video = document.createElement("video");
  video.src = URL.createObjectURL(file);

  await new Promise((res) => {
    video.onloadedmetadata = res;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const scale = Math.min(1920 / video.videoWidth, 1080 / video.videoHeight, 1);
  canvas.width = Math.floor(video.videoWidth * scale);
  canvas.height = Math.floor(video.videoHeight * scale);

  const stream = canvas.captureStream(30);

  const recorder = new MediaRecorder(stream, {
    mimeType: "video/mp4"
  });

  const chunks = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);

  recorder.start();

  video.play();

  const draw = () => {
    if (video.paused || video.ended) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    requestAnimationFrame(draw);
  };

  draw();

  await new Promise((res) => (video.onended = res));

  recorder.stop();
  await new Promise((res) => (recorder.onstop = res));

  const blob = new Blob(chunks, { type: "video/mp4" });

  return new File([blob], file.name.replace(/\.[^/.]+$/, ".mp4"), {
    type: "video/mp4"
  });
}
