// PATCHED VIDEO PLAYER - DROP IN REPLACEMENT
// Place at: client/src/components/video-player.tsx

import { useEffect, useRef, useState } from "react";

interface Props {
  videoUrl: string;
  filename?: string;
}

export function VideoPlayer({ videoUrl, filename }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);

    try {
      video.pause();
    } catch {}

    video.currentTime = 0;
    video.load();
  }, [videoUrl]);

  return (
    <div style={{ position: "relative", background: "black", borderRadius: 12 }}>
      <video
        key={videoUrl}
        ref={videoRef}
        src={videoUrl}
        controls
        playsInline
        preload="metadata"
        style={{ width: "100%", maxHeight: "70vh" }}
        onError={() => {
          setError("Preview failed. File will still upload and be processed.");
        }}
      />

      {error && (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.8)",
          color: "white",
          padding: 16,
          textAlign: "center"
        }}>
          <div>
            <strong>Preview unavailable</strong>
            <div style={{ fontSize: 12, marginTop: 6 }}>{error}</div>
            {filename && <div style={{ fontSize: 11 }}>{filename}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
