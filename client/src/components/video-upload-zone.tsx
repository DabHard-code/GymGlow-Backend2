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

  const validateFile = (file: File): boolean => {
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
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find((f) => isAcceptedVideoFile(f));

    if (videoFile && validateFile(videoFile)) {
      onVideoSelect(videoFile);
    }
  }, [disabled, onVideoSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      onVideoSelect(file);
    }

    e.target.value = "";
  }, [onVideoSelect]);

  const helperText = "MP4, MOV, or WebM up to 500 MB. 4K/iPhone videos are optimized automatically after upload.";

  if (compact) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-testid="video-upload-zone"
        className={cn(
          "flex flex-col items-center justify-center py-8 rounded-lg border-2 border-dashed transition-all duration-300",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          disabled && "opacity-50 pointer-events-none",
        )}
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className={cn("p-4 rounded-full transition-colors duration-300", isDragging ? "bg-primary/10" : "bg-muted")}>
            {isDragging ? <Film className="h-8 w-8 text-primary" /> : <Upload className="h-8 w-8 text-muted-foreground" />}
          </div>

          <div className="space-y-1">
            <p className="font-medium">{isDragging ? "Drop your video here" : "Drag and drop your video"}</p>
            <p className="text-sm text-muted-foreground">or click to browse</p>
          </div>

          <label htmlFor="video-input-compact">
            <Button asChild size="sm" disabled={disabled}>
              <span className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Select Video
              </span>
            </Button>
          </label>
          <input
            id="video-input-compact"
            type="file"
            accept="video/*,.mov,.mp4,.webm,.m4v"
            onChange={handleFileInput}
            className="hidden"
            disabled={disabled}
            data-testid="input-video-file"
          />

          <p className="max-w-sm text-xs text-muted-foreground">{helperText}</p>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm" data-testid="text-upload-error">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid="video-upload-zone"
      className={cn(
        "relative flex flex-col items-center justify-center min-h-96 rounded-xl border-2 border-dashed p-12 transition-all duration-300",
        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 bg-card",
        disabled && "opacity-50 pointer-events-none",
      )}
    >
      <div className="flex flex-col items-center text-center space-y-6">
        <div className={cn("p-6 rounded-full transition-colors duration-300", isDragging ? "bg-primary/10" : "bg-muted")}>
          {isDragging ? <Film className="h-16 w-16 text-primary" /> : <Upload className="h-16 w-16 text-muted-foreground" />}
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl font-display font-bold">{isDragging ? "Drop your video here" : "Upload Your Video"}</h3>
          <p className="text-muted-foreground max-w-md">
            Upload your routine, drill, swing, or dance video. GymGlow will optimize large mobile videos before AI analysis.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <label htmlFor="video-input">
            <Button asChild disabled={disabled}>
              <span className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Browse Files
              </span>
            </Button>
          </label>
          <input
            id="video-input"
            type="file"
            accept="video/*,.mov,.mp4,.webm,.m4v"
            onChange={handleFileInput}
            className="hidden"
            disabled={disabled}
            data-testid="input-video-file"
          />

          <div className="space-y-1 text-center">
            <p className="text-xs text-muted-foreground">{helperText}</p>
            <p className="text-xs text-muted-foreground">If preview looks black, upload can still work after optimization.</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm" data-testid="text-upload-error">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="absolute bottom-6 left-6 right-6">
        <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-primary" />
            <span>Large Video Support</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-primary" />
            <span>4K Optimization</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-primary" />
            <span>Form Correction</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-primary" />
            <span>Progress Tracking</span>
          </div>
        </div>
      </div>
    </div>
  );
}
