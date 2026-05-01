import { useCallback, useState } from "react";
import { Upload, Film, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VideoUploadZoneProps {
  onVideoSelect: (file: File) => void;
  disabled?: boolean;
  compact?: boolean;
}

const ACCEPTED_VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".m4v", ".hevc", ".qt"];
const ACCEPTED_VIDEO_MIME_PREFIXES = ["video/"];
const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024;

function isAcceptedVideoFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  return (
    ACCEPTED_VIDEO_MIME_PREFIXES.some((prefix) => (file.type || "").startsWith(prefix)) ||
    ACCEPTED_VIDEO_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VideoUploadZone({ onVideoSelect, disabled, compact }: VideoUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback((file: File): boolean => {
    if (!isAcceptedVideoFile(file)) {
      setError("Please upload a supported video file like MP4, MOV, or WebM.");
      return false;
    }

    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      setError(
        `This video is ${formatFileSize(file.size)}. GymGlow currently supports uploads up to 500 MB.`,
      );
      return false;
    }

    setError(null);
    return true;
  }, []);

  const selectFile = useCallback(
    (file: File) => {
      if (!validateFile(file)) return;

      // IMPORTANT:
      // Do not browser-compress or re-encode here.
      // Browser MediaRecorder can create fake/corrupted mp4/webm files.
      // Send the original file to GymGlow backend first; backend ffmpeg shrinks it before Supabase storage.
      onVideoSelect(file);
    },
    [onVideoSelect, validateFile],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!disabled) setIsDragging(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      const videoFile = files.find((f) => isAcceptedVideoFile(f));
      if (videoFile) selectFile(videoFile);
    },
    [disabled, selectFile],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) selectFile(file);
      e.target.value = "";
    },
    [selectFile],
  );

  const helperText = "MP4, MOV, WebM, M4V, HEVC, or QT up to 500 MB. Large videos are sent to GymGlow first, optimized, then stored safely.";

  const content = compact ? (
    <>
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-primary/10 p-2">
          {isDragging ? (
            <CheckCircle className="h-5 w-5 text-primary" />
          ) : (
            <Film className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {isDragging ? "Drop your video here" : "Drag and drop your video"}
          </p>
          <p className="text-xs text-muted-foreground">or click to browse</p>
        </div>
        <Button type="button" size="sm" disabled={disabled}>
          Select Video
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{helperText}</p>
    </>
  ) : (
    <>
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        {isDragging ? (
          <CheckCircle className="h-8 w-8 text-primary" />
        ) : (
          <Upload className="h-8 w-8 text-primary" />
        )}
      </div>
      <h3 className="text-lg font-semibold">
        {isDragging ? "Drop your video here" : "Upload Your Video"}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Upload your routine, drill, swing, or dance video. GymGlow will optimize large mobile videos before storage and AI analysis.
      </p>
      <Button type="button" className="mt-4" disabled={disabled}>
        Browse Files
      </Button>
      <p className="mt-3 text-xs text-muted-foreground">{helperText}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        If preview looks black, upload can still work after backend optimization.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
        <div>Large Video Support</div>
        <div>4K Optimization</div>
        <div>Form Correction</div>
        <div>Progress Tracking</div>
      </div>
    </>
  );

  return (
    <div>
      <label className={cn(disabled ? "pointer-events-none opacity-50" : "cursor-pointer")}>
        <input
          type="file"
          accept="video/*,.mp4,.mov,.webm,.m4v,.hevc,.qt"
          className="hidden"
          disabled={disabled}
          onChange={handleFileInput}
          data-testid="input-video-upload"
        />

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "rounded-2xl border border-dashed p-4 transition-colors",
            compact ? "text-left" : "text-center",
            isDragging
              ? "border-primary bg-primary/10"
              : "border-border bg-card hover:border-primary/60 hover:bg-primary/5",
          )}
          data-testid="video-upload-zone"
        >
          {content}
        </div>
      </label>

      {error ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
}
