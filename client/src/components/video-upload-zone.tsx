// SAFE VIDEO UPLOAD (NO WEBM, NO CORRUPTION)
// client/src/components/video-upload-zone.tsx

import { useRef } from "react";

export function VideoUploadZone({ onVideoSelect, compact }: any) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = (file: File) => {
    // Do NOT modify file
    // Let backend handle conversion safely
    onVideoSelect(file);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      <button onClick={() => inputRef.current?.click()}>
        {compact ? "Select Video" : "Upload Video"}
      </button>
    </div>
  );
}
