// DROP-IN REPLACEMENT
// client/src/components/video-upload-zone.tsx

import { useRef } from "react";
import { compressVideo } from "./video-compress";

export function VideoUploadZone({ onVideoSelect, compact }: any) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File) => {
    try {
      const processed = await compressVideo(file);
      onVideoSelect(processed);
    } catch (e) {
      console.warn("Compression failed, using original");
      onVideoSelect(file);
    }
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
