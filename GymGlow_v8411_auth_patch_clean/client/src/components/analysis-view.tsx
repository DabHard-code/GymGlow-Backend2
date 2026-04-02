import { useState, useEffect } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { VideoPlayer } from "./video-player";
import { FeedbackPanel } from "./feedback-panel";
import { ExerciseTypeSelector } from "./exercise-type-selector";
import type { AnalysisResult, SportType, Session, Analysis } from "@shared/schema";
import { sportDisplayNames } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PlanRequiredDialog } from "@/components/plan-required-dialog";

// ✅ CHANGE THIS IMPORT if your supabase client lives elsewhere
import { supabase } from "@/lib/supabase";

interface AnalysisViewProps {
  videoFile: File;
  videoUrl: string;
  onBack: () => void;
  profileId?: string;
  sport?: SportType;
}

type UserMe = { id: string; plan: "none" | "coach" | "competition"; trialCredits?: number };
type AnalysisStep = "uploading" | "processing" | "analyzing" | "ready" | "error";

const analysisSteps: { key: AnalysisStep; label: string; icon: typeof Activity }[] = [
  { key: "uploading", label: "Uploading video...", icon: Activity },
  { key: "processing", label: "Processing video...", icon: Eye },
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
    Math.floor(Math.random() * GYM_TIPS.length)
  );

  useEffect(() => {
    if (currentStep === "error") return;

    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % GYM_TIPS.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [currentStep]);

  const progress =
    currentStep === "ready"
      ? 100
      : currentStep === "error"
        ? 0
        : Math.min(((stepIndex + 1) / analysisSteps.length) * 100, 95);

  return (

    <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-10">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="py-8 px-6">
          {currentStep === "error" ? (
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Analysis Failed</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {error || "Something went wrong. Please try again."}
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Analyzing Your Form</h3>
                <p className="text-sm text-muted-foreground">This usually takes 10-15 seconds</p>
              </div>

              <Progress value={progress} className="mb-6 h-2" />
              <div className="mb-6 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
  <div className="font-medium mb-1">💡 Gym Tip While You Wait</div>
  <div
    key={tipIndex}
    className="transition-opacity duration-700 ease-in-out opacity-0 animate-fadeIn"
  >
    {GYM_TIPS[tipIndex]}
  </div>
</div>

              <div className="space-y-3">
                {analysisSteps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = step.key === currentStep;
                  const isComplete = stepIndex > index || currentStep === "ready";

                  return (
                    <div
                      key={step.key}
                      className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                        isActive ? "bg-primary/10" : ""
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center ${
                          isComplete
                            ? "bg-primary text-primary-foreground"
                            : isActive
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isComplete ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <Icon className={`h-3 w-3 ${isActive ? "animate-pulse" : ""}`} />
                        )}
                      </div>

                      <span
                        className={`text-sm ${
                          isActive
                            ? "text-foreground font-medium"
                            : isComplete
                              ? "text-muted-foreground"
                              : "text-muted-foreground/60"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Creates a unique storage path like:
 *   userId/profileId/1700000000000_ab12cd34.mp4
 */
function buildVideoObjectPath(args: {
  userId: string;
  profileId?: string;
  filename: string;
}) {
  const safeName = args.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = safeName.includes(".") ? safeName.split(".").pop() : "mp4";

  return `${args.userId}/${args.profileId ?? "no-profile"}/${Date.now()}_${Math.random()
    .toString(16)
    .slice(2)}.${ext}`;
}

export function AnalysisView({
  videoFile,
  videoUrl,
  onBack,
  profileId,
  sport,
}: AnalysisViewProps) {
  const { data: me } = useQuery<UserMe>({ queryKey: ["/api/users/me"] });
  
  const [exerciseType, setExerciseType] = useState<SportType>(sport || "gymnastics");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<AnalysisStep | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: session } = useQuery<Session>({
    queryKey: ["/api/sessions", sessionId],
    enabled: !!sessionId && currentStep !== "ready" && currentStep !== "error",
    refetchInterval: (query) => {
      const data = query.state.data as Session | undefined;
      if (data?.status === "ready" || data?.status === "error") return false;
      return 1000;
    },
  });

  const { data: analysisData } = useQuery<Analysis>({
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
      feedback: analysisData.feedback,
      strengths: analysisData.strengths,
      createdAt: analysisData.createdAt || new Date(),
    };

    setAnalysisResult(result);
    setCurrentStep(null);
    setSessionId(null);
    document.body.classList.add("analysis-complete-flash");
setTimeout(() => {
  document.body.classList.remove("analysis-complete-flash");
}, 600);

    if (profileId) {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", profileId, "analyses"] });
    }

    toast({
      title: "Analysis Complete",
      description: "Your form has been analyzed. Check out the feedback!",
    });
  }, [analysisData, profileId, toast]);

  const analyzeMutation = useMutation({
    mutationFn: async (data: { videoPath: string; title?: string }) => {
      if (profileId) {
        const response = await apiRequest("POST", `/api/profiles/${profileId}/analyze`, {
          videoPath: data.videoPath,
          title: data.title,
        });
        return (await response.json()) as { sessionId: string; status: string };
      } else {
        const response = await apiRequest("POST", "/api/analyze", {
          exerciseType,
          videoPath: data.videoPath,
          title: data.title,
        });
        return (await response.json()) as AnalysisResult;
      }
    },
    onSuccess: (data) => {
      if ("sessionId" in data) {
        setSessionId(data.sessionId);
        setCurrentStep("processing");
      } else {
        setAnalysisResult(data);
        setCurrentStep(null);
      }
    },
    onError: (error: Error) => {
      // Paywall
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
      // ✅ Ensure logged in user (needed for Storage rules)
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData?.user) {
        throw new Error("You must be logged in to upload and analyze videos.");
      }

      const userId = authData.user.id;

      // ✅ Upload to Supabase Storage bucket: Videos
      const objectPath = buildVideoObjectPath({
        userId,
        profileId,
        filename: videoFile.name,
      });

      const { error: uploadErr } = await supabase.storage
        .from("Videos")
        .upload(objectPath, videoFile, {
          contentType: videoFile.type || "video/mp4",
          upsert: false,
        });

      if (uploadErr) {
        throw new Error(`Upload failed: ${uploadErr.message}`);
      }

      // ✅ Tell backend to analyze by storage path (NO BASE64)
      analyzeMutation.mutate({
        videoPath: objectPath,
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

  return (
    <div className="flex flex-col h-full min-h-screen bg-background relative" data-testid="analysis-view">
      <PlanRequiredDialog
        open={planDialogOpen}
        onOpenChange={setPlanDialogOpen}
        message="AI analysis requires an active plan."
      />
      {currentStep && <AnalyzingOverlay currentStep={currentStep} error={errorMessage} />}

      <div className="flex-shrink-0 border-b bg-card">
        <div className="max-w-screen-2xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <Button variant="ghost" onClick={onBack} disabled={isAnalyzing} data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {profileId ? "Back to Profile" : "New Video"}
            </Button>

            {profileId && sport ? (
              <Badge variant="secondary" className="text-sm py-1.5 px-4" data-testid="badge-sport">
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

            <Button onClick={handleAnalyze} disabled={isAnalyzing} data-testid="button-analyze">
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : analysisResult ? (
                "Re-analyze"
              ) : (
                (me?.plan === "none" && (me.trialCredits ?? 0) > 0 ? "Try AI Feedback (1 free analysis)" : "Analyze Form")
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-screen-2xl mx-auto">
          <div className="flex flex-col lg:flex-row h-full">
            <div className="lg:w-3/5 p-4 lg:p-6 flex flex-col">
              <div className="flex-1 flex items-center justify-center">
                <div className="w-full max-w-4xl">
                  <VideoPlayer videoUrl={videoUrl} />
                </div>
              </div>

              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">{videoFile.name}</span>{" "}
                  ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)
                </p>
              </div>
            </div>

            <div className="lg:w-2/5 border-t lg:border-t-0 lg:border-l bg-card min-h-[400px] lg:min-h-0">
              <FeedbackPanel result={analysisResult} isLoading={false} exerciseType={exerciseType} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

}