// client/src/components/video-upload-zone.tsx
// DROP-IN REPLACEMENT (adds silent compression)

import { useRef } from "react";
import { compressVideo } from "./video-compress";

export function VideoUploadZone({ onVideoSelect, compact }: any) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File) => {
    try {
      const compressed = await compressVideo(file);
      onVideoSelect(compressed);
    } catch (e) {
      console.warn("Compression failed, using original file");
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
