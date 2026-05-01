import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  Activity,
  Eye,
  Target,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { VideoPlayer } from "./video-player";
import { FeedbackPanel } from "./feedback-panel";
import { ExerciseTypeSelector } from "./exercise-type-selector";
import type { AnalysisResult, SportType, Session } from "@shared/schema";
import { sportDisplayNames } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PlanRequiredDialog } from "@/components/plan-required-dialog";
import { supabase } from "@/lib/supabase";

interface AnalysisViewProps {
  videoFile: File;
  videoUrl: string;
  onBack: () => void;
  profileId?: string;
  sport?: SportType;
}

type UserMe = {
  id: string;
  plan: "none" | "coach" | "competition";
  trialCredits?: number;
};

type AnalysisStep = "uploading" | "processing" | "analyzing" | "ready" | "error";

const analysisSteps: { key: AnalysisStep; label: string; icon: typeof Activity }[] = [
  { key: "uploading", label: "Uploading video...", icon: Activity },
  { key: "processing", label: "Optimizing video...", icon: Eye },
  { key: "analyzing", label: "Analyzing form...", icon: Target },
  { key: "ready", label: "Building feedback...", icon: Lightbulb },
];

const GYM_TIPS = [
  "Keep your chest up on landing to avoid forward balance deductions.",
  "Pointed toes can boost execution instantly—especially on leaps and jumps.",
  "A tight core keeps your shape clean through the whole skill.",
  "Set before you flip: height first, then rotation.",
  "Spot the landing early to reduce step and balance deductions.",
  "Control beats speed—clean form usually scores higher than rushed power.",
  "A confident finish can save deductions even if the skill wasn’t perfect.",
  "Soft knees on landing helps control and protects the joints.",
  "Tight tuck = faster rotation. Loose tuck = under-rotation risk.",
  "Arms matter: strong arm positions clean up the whole look of a routine.",
];

function AnalyzingOverlay({
  currentStep,
  error,
}: {
  currentStep: AnalysisStep;
  error?: string;
}) {
  const stepIndex = analysisSteps.findIndex((s) => s.key === currentStep);
  const [tipIndex, setTipIndex] = useState(
    Math.floor(Math.random() * GYM_TIPS.length),
  );

  useEffect(() => {
    if (currentStep === "error") return;
    const interval = window.setInterval(() => {
      setTipIndex((prev) => (prev + 1) % GYM_TIPS.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [currentStep]);

  const progress =
    currentStep === "ready"
      ? 100
      : currentStep === "error"
        ? 0
        : Math.min(((stepIndex + 1) / analysisSteps.length) * 100, 95);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl">
        {currentStep === "error" ? (
          <div className="text-center space-y-4">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
            <h3 className="text-xl font-bold">Analysis Failed</h3>
            <p className="text-sm text-muted-foreground">
              {error || "Something went wrong. Please try again."}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
              <h3 className="mt-4 text-xl font-bold">Analyzing Your Form</h3>
              <p className="text-sm text-muted-foreground">
                Large videos can take a few minutes while GymGlow optimizes them.
              </p>
            </div>

            <Progress value={progress} />

            <div className="rounded-xl border bg-muted/40 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Gym Tip While You Wait
              </p>
              <p className="mt-1 text-sm">{GYM_TIPS[tipIndex]}</p>
            </div>

            <div className="space-y-3">
              {analysisSteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = step.key === currentStep;
                const isComplete = stepIndex > index || currentStep === "ready";

                return (
                  <div
                    key={step.key}
                    className="flex items-center gap-3 text-sm"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border">
                      {isComplete ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Icon
                          className={
                            isActive
                              ? "h-4 w-4 text-primary"
                              : "h-4 w-4 text-muted-foreground"
                          }
                        />
                      )}
                    </div>
                    <span className={isActive ? "font-semibold" : ""}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

async function getSignedPlaybackUrl(videoPath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from("Videos")
    .createSignedUrl(videoPath, 60 * 60);

  if (error || !data?.signedUrl) {
    console.warn("Could not create signed playback URL:", error?.message);
    return null;
  }

  return data.signedUrl;
}

export function AnalysisView({
  videoFile,
  videoUrl,
  onBack,
  profileId,
  sport,
}: AnalysisViewProps) {
  const { data: me } = useQuery<UserMe>({ queryKey: ["/api/users/me"] });
  const [exerciseType, setExerciseType] = useState<SportType>(
    sport || "gymnastics",
  );
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null,
  );
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<AnalysisStep | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [planDialogOpen, setPlanDialogOpen] = useState(false);

  // Starts as the local browser preview, then switches to the optimized MP4
  // that the backend uploads to Supabase.
  const [playbackUrl, setPlaybackUrl] = useState(videoUrl);
  const [optimizedVideoPath, setOptimizedVideoPath] = useState<string | null>(
    null,
  );

  const { toast } = useToast();

  useEffect(() => {
    setPlaybackUrl(videoUrl);
    setOptimizedVideoPath(null);
    setAnalysisResult(null);
    setSessionId(null);
    setCurrentStep(null);
    setErrorMessage(undefined);
  }, [videoFile, videoUrl]);

  const fileSizeMb = useMemo(
    () => (videoFile.size / (1024 * 1024)).toFixed(1),
    [videoFile.size],
  );

  const isLikelyBadBrowserPreview = useMemo(() => {
    const name = videoFile.name.toLowerCase();
    return (
      name.endsWith(".mov") ||
      name.endsWith(".hevc") ||
      name.endsWith(".qt") ||
      videoFile.type.toLowerCase().includes("quicktime")
    );
  }, [videoFile.name, videoFile.type]);

  const { data: session } = useQuery<Session>({
    queryKey: ["/api/sessions", sessionId],
    enabled: !!sessionId && currentStep !== "ready" && currentStep !== "error",
    refetchInterval: (query) => {
      const data = query.state.data as Session | undefined;
      if (data?.status === "ready" || data?.status === "error") return false;
      return 1000;
    },
  });

  const { data: analysisData } = useQuery<any>({
    queryKey: ["/api/sessions", sessionId, "analysis"],
    enabled: !!sessionId && session?.status === "ready",
  });

  useEffect(() => {
    if (!session) return;

    setCurrentStep(session.status as AnalysisStep);

    if (session.status === "error") {
      setErrorMessage(session.errorMessage || "Analysis failed");
    }
  }, [session]);

  useEffect(() => {
    if (!analysisData) return;

    const result: AnalysisResult = {
      id: analysisData.id,
      sessionId: analysisData.sessionId,
      overallScore: analysisData.overallScore,
      summary: analysisData.summary,
      technicalBreakdown: analysisData.technicalBreakdown,
      feedback: analysisData.feedback || [],
      strengths: analysisData.strengths || [],
      safetyNotes: analysisData.safetyNotes || [],
      progressionTips: analysisData.progressionTips || [],
      createdAt: analysisData.createdAt || new Date(),
    } as AnalysisResult;

    setAnalysisResult(result);
    setCurrentStep(null);
    setSessionId(null);

    document.body.classList.add("analysis-complete-flash");
    window.setTimeout(() => {
      document.body.classList.remove("analysis-complete-flash");
    }, 600);

    if (profileId) {
      queryClient.invalidateQueries({
        queryKey: ["/api/profiles", profileId, "analyses"],
      });
    }

    toast({
      title: "Analysis Complete",
      description: "Your form has been analyzed. Check out the feedback!",
    });
  }, [analysisData, profileId, toast]);

  const analyzeMutation = useMutation({
    mutationFn: async (data: { videoPath: string; title?: string }) => {
      if (!profileId) {
        throw new Error("Please choose an athlete profile before starting analysis.");
      }

      const response = await apiRequest("POST", `/api/profiles/${profileId}/analyze`, {
        videoPath: data.videoPath,
        title: data.title,
      });

      return (await response.json()) as { sessionId: string; status: string };
    },
    onSuccess: (data) => {
      if ("sessionId" in data) {
        setSessionId(data.sessionId);
        setCurrentStep("processing");
      }
    },
    onError: (error: Error) => {
      if (String(error.message).startsWith("402:")) {
        setPlanDialogOpen(true);
        setCurrentStep(null);
        return;
      }

      setCurrentStep("error");
      setErrorMessage(error.message);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze video. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = async () => {
    setCurrentStep("uploading");
    setErrorMessage(undefined);
    setAnalysisResult(null);

    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();

      if (authErr || !authData?.user) {
        throw new Error("You must be logged in to upload and analyze videos.");
      }

      const formData = new FormData();
      formData.append("video", videoFile);
      formData.append("profileId", profileId || "no-profile");

      const uploadResponse = await fetch("/api/uploads/video/backend", {
        method: "POST",
        headers: {
          "x-user-id": authData.user.id,
        },
        body: formData,
      });

      const uploadData = await uploadResponse.json().catch(() => null);

      if (!uploadResponse.ok) {
        throw new Error(
          uploadData?.error || `Upload failed with status ${uploadResponse.status}`,
        );
      }

      if (!uploadData?.videoPath) {
        throw new Error("Upload worked, but no optimized video path was returned.");
      }

      setOptimizedVideoPath(uploadData.videoPath);

      // IMPORTANT FIX:
      // Switch the visible player away from the original MOV/HEVC preview
      // and onto the browser-safe optimized MP4 from Supabase.
      const signedUrl = await getSignedPlaybackUrl(uploadData.videoPath);
      if (signedUrl) {
        setPlaybackUrl(signedUrl);
      }

      analyzeMutation.mutate({
        videoPath: uploadData.videoPath,
        title: videoFile.name,
      });
    } catch (error: any) {
      setCurrentStep("error");
      setErrorMessage(error?.message || "Failed to upload video");
      toast({
        title: "Error",
        description: error?.message || "Failed to upload video.",
        variant: "destructive",
      });
    }
  };

  const isAnalyzing = currentStep !== null && currentStep !== "error";
  const analyzeButtonLabel = isAnalyzing
    ? "Analyzing..."
    : analysisResult
      ? "Re-analyze"
      : me?.plan === "none" && (me.trialCredits ?? 0) > 0
        ? "Try AI Feedback (1 free analysis)"
        : "Analyze Form";

  return (
    <div className="min-h-screen bg-background">
      {currentStep && (
        <AnalyzingOverlay currentStep={currentStep} error={errorMessage} />
      )}

      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="gap-2"
            data-testid="button-back-analysis"
          >
            <ArrowLeft className="h-4 w-4" />
            {profileId ? "Back to Profile" : "Choose Profile"}
          </Button>

          {profileId && sport ? (
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              {sportDisplayNames[sport]}
            </Badge>
          ) : (
            <ExerciseTypeSelector
              selected={exerciseType}
              onSelect={(type) => {
                setExerciseType(type);
                setAnalysisResult(null);
              }}
              disabled={isAnalyzing}
            />
          )}

          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !profileId}
            className="bg-green-600 text-white hover:bg-green-700"
            data-testid="button-analyze-form"
          >
            {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {analyzeButtonLabel}
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[1.35fr_1fr]">
        <section className="space-y-4">
          <div className="overflow-hidden rounded-xl border bg-black">
            <VideoPlayer
              key={`${optimizedVideoPath || "local"}-${playbackUrl}`}
              videoUrl={playbackUrl}
              filename={videoFile.name}
            />
          </div>

          <div className="text-center">
            <p className="font-medium">
              {videoFile.name}{" "}
              <span className="text-muted-foreground">({fileSizeMb} MB)</span>
            </p>

            {optimizedVideoPath ? (
              <p className="mt-2 text-sm text-green-700">
                Optimized MP4 loaded for playback and analysis.
              </p>
            ) : isLikelyBadBrowserPreview ? (
              <p className="mt-2 text-sm text-muted-foreground">
                This phone video format may preview black in Chrome. After you
                analyze it, GymGlow switches the player to the optimized MP4.
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Large videos are sent to GymGlow first, optimized, then stored safely.
              </p>
            )}
          </div>
        </section>

        <section>
          <FeedbackPanel
            result={analysisResult}
            isLoading={isAnalyzing}
            exerciseType={exerciseType}
          />
        </section>
      </main>

      <PlanRequiredDialog
        open={planDialogOpen}
        onOpenChange={setPlanDialogOpen}
      />
    </div>
  );
}
