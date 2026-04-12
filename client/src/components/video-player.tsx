import { useRef, useState, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Maximize,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  videoUrl: string;
  onTimeUpdate?: (time: number) => void;
  filename?: string;
}

export function VideoPlayer({ videoUrl, onTimeUpdate, filename }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setPreviewError(null);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleError = () => {
      setIsPlaying(false);
      setPreviewError(
        "Preview unavailable for this video format. Upload can still continue and GymGlow will optimize it before analysis.",
      );
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("error", handleError);
    };
  }, [onTimeUpdate]);

  useEffect(() => {
    setPreviewError(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }, [videoUrl]);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video || previewError) return;

    try {
      if (isPlaying) {
        video.pause();
        setIsPlaying(false);
      } else {
        await video.play();
        setIsPlaying(true);
      }
    } catch {
      setIsPlaying(false);
      setPreviewError(
        "Preview unavailable for this video format. Upload can still continue and GymGlow will optimize it before analysis.",
      );
    }
  };

  const handleSeek = (value: number[]) => {
    const video = videoRef.current;
    if (!video || previewError) return;

    video.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = value[0];
    setVolume(value[0]);
    setIsMuted(value[0] === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const skipFrames = (seconds: number) => {
    const video = videoRef.current;
    if (!video || previewError) return;

    video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
  };

  const changePlaybackRate = () => {
    const video = videoRef.current;
    if (!video || previewError) return;

    const rates = [0.25, 0.5, 1, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const newRate = rates[nextIndex];

    video.playbackRate = newRate;
    setPlaybackRate(newRate);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  };

  const restart = () => {
    const video = videoRef.current;
    if (!video || previewError) return;

    video.currentTime = 0;
    setCurrentTime(0);
  };

  const formatTime = (time: number): string => {
    if (!Number.isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-xl overflow-hidden group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => !isPlaying && setShowControls(true)}
      data-testid="video-player"
    >
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full aspect-video"
        onClick={togglePlay}
        playsInline
        preload="metadata"
        data-testid="video-element"
      />

      {previewError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6 text-center">
          <div className="max-w-md space-y-3 text-white">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
              <AlertCircle className="h-6 w-6" />
            </div>
            <p className="font-medium">Preview unavailable</p>
            <p className="text-sm text-white/80">{previewError}</p>
            {filename ? <p className="text-xs text-white/60">Selected file: {filename}</p> : null}
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0",
        )}
      />

      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 p-4 transition-opacity duration-300",
          showControls && !previewError ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        <div className="space-y-3">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
            data-testid="slider-video-progress"
          />

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={restart} className="text-white hover:bg-white/20" data-testid="button-restart">
                <RotateCcw className="h-4 w-4" />
              </Button>

              <Button variant="ghost" size="icon" onClick={() => skipFrames(-5)} className="text-white hover:bg-white/20" data-testid="button-skip-back">
                <SkipBack className="h-4 w-4" />
              </Button>

              <Button variant="ghost" size="icon" onClick={togglePlay} className="text-white hover:bg-white/20" data-testid="button-play-pause">
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>

              <Button variant="ghost" size="icon" onClick={() => skipFrames(5)} className="text-white hover:bg-white/20" data-testid="button-skip-forward">
                <SkipForward className="h-4 w-4" />
              </Button>

              <span className="text-white text-xs ml-2 font-mono" data-testid="text-video-time">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={changePlaybackRate} className="text-white hover:bg-white/20 text-xs font-mono px-2" data-testid="button-playback-rate">
                {playbackRate}x
              </Button>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={toggleMute} className="text-white hover:bg-white/20" data-testid="button-mute">
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Slider value={[isMuted ? 0 : volume]} max={1} step={0.1} onValueChange={handleVolumeChange} className="w-20" data-testid="slider-volume" />
              </div>

              <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white hover:bg-white/20" data-testid="button-fullscreen">
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {!isPlaying && currentTime === 0 && !previewError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Button size="lg" onClick={togglePlay} className="rounded-full h-16 w-16" data-testid="button-play-center">
            <Play className="h-8 w-8" />
          </Button>
        </div>
      )}
    </div>
  );
}
