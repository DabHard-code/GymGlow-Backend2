import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useParams, Link } from "wouter";
import {
  ArrowLeft,
  Upload,
  Clock,
  Sparkles,
  Music,
  Trophy,
  Heart,
  Eye,
  Megaphone,
  Trash2,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { VideoUploadZone } from "@/components/video-upload-zone";
import { AnalysisView } from "@/components/analysis-view";
import { FeedbackPanel } from "@/components/feedback-panel";
import { CompWeekCallout } from "@/components/comp-week-callout";
import { useToast } from "@/hooks/use-toast";

import {
  type SportProfile,
  type Athlete,
  type Analysis,
  sportDisplayNames,
  type SportType,
  getLevelDisplayForSport,
} from "@shared/schema";

const sportIcons: Record<SportType, typeof Sparkles> = {
  gymnastics: Sparkles,
  dance: Music,
  cheer: Megaphone,
  lifting: Trophy,
  yoga: Heart,
};

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function AnalysisCard({
  analysis,
  onView,
  onDelete,
  isDeleting,
}: {
  analysis: Analysis;
  onView: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const date = analysis.createdAt ? new Date(analysis.createdAt) : new Date();
  const timeAgo = getTimeAgo(date);

  return (
    <Card className="overflow-visible" data-testid={`card-analysis-${analysis.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm line-clamp-2">{analysis.summary}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo}
            </p>
          </div>
          <div className="flex-shrink-0 flex flex-col items-center">
            <div className="text-2xl font-bold">{analysis.overallScore}</div>
            <Progress value={analysis.overallScore} className="w-12 h-1.5" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mt-3">
          {analysis.strengths && analysis.strengths.length > 0 && (
            <div className="flex flex-wrap gap-1 flex-1">
              {analysis.strengths.slice(0, 2).map((strength, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {strength.length > 20 ? strength.slice(0, 20) + "..." : strength}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onView}>
              View
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  disabled={isDeleting}
                  aria-label="Delete analysis"
                  data-testid={`button-delete-analysis-${analysis.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this result?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the analysis result and related awards from your account.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await apiRequest("GET", url);

  const contentType = res.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    const text = await res.text();
    throw new Error(`Non-JSON response for ${url}: ${text.slice(0, 300)}`);
  }

  return res.json();
}

export default function ProfilePage() {
  const params = useParams<{ id?: string; profileId?: string }>();
  const { toast } = useToast();

  // supports either /profiles/:id or /profiles/:profileId
  const profileId = params.id || params.profileId || "";

  console.log("PROFILE PARAMS:", params, "profileId:", profileId, "path:", window.location.pathname);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [viewingAnalysis, setViewingAnalysis] = useState<Analysis | null>(null);

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileIsError,
    error: profileError,
  } = useQuery<SportProfile>({
    queryKey: ["profile", profileId],
    enabled: !!profileId,
    queryFn: () => fetchJson<SportProfile>(`/api/profiles/${profileId}`),
    retry: 1,
  });

  const {
    data: analyses = [],
    isLoading: analysesLoading,
    isError: analysesIsError,
    error: analysesError,
  } = useQuery<Analysis[]>({
    queryKey: ["analyses", profileId],
    enabled: !!profileId,
    queryFn: () => fetchJson<Analysis[]>(`/api/profiles/${profileId}/analyses`),
    retry: 1,
  });

  const {
  data: athlete,
  isLoading: athleteIsLoading,
  isError: athleteIsError,
  error: athleteError,
} = useQuery<Athlete>({
  queryKey: profile?.athleteId
    ? ["/api/athletes", profile.athleteId]
    : ["/api/athletes", "none"],
  enabled: !!profile?.athleteId,
  retry: 1,
});

  const videoUrl = useMemo(() => {
    if (videoFile) return URL.createObjectURL(videoFile);
    return null;
  }, [videoFile]);

  const handleVideoSelect = (file: File) => setVideoFile(file);

  const handleBack = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoFile(null);
  };

  const deleteAnalysisMutation = useMutation({
    mutationFn: async (analysisId: string) => {
      const res = await apiRequest("DELETE", `/api/analyses/${analysisId}`);
      return res.json();
    },
    onSuccess: async () => {
      setViewingAnalysis(null);
      await queryClient.invalidateQueries({ queryKey: ["analyses", profileId] });
      toast({
        title: "Result deleted",
        description: "That analysis has been removed from your profile.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteAnalysis = (analysisId: string) => {
    deleteAnalysisMutation.mutate(analysisId);
  };

  // --- HARD FAILS THAT EXPLAIN THE ISSUE ---
  if (!profileId) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-red-500 font-semibold">Missing profile id in the URL</p>
        <p className="text-sm text-muted-foreground">
          Current path: <span className="font-mono">{window.location.pathname}</span>
        </p>
        <Link href="/">
          <Button variant="outline">Go Home</Button>
        </Link>
      </div>
    );
  }

  if (profileIsError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-red-500 font-semibold">Profile query error</p>
        <pre className="text-xs max-w-[900px] w-full overflow-auto p-3 rounded bg-muted">
          {String((profileError as any)?.message || profileError)}
        </pre>
        <Link href="/">
          <Button variant="outline">Go Home</Button>
        </Link>
      </div>
    );
  }

  if (analysesIsError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-red-500 font-semibold">Analyses query error</p>
        <pre className="text-xs max-w-[900px] w-full overflow-auto p-3 rounded bg-muted">
          {String((analysesError as any)?.message || analysesError)}
        </pre>
        <Link href="/">
          <Button variant="outline">Go Home</Button>
        </Link>
      </div>
    );
  }

  if (athleteIsError) {
    console.warn("Athlete query error:", athleteError);
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    // this should basically never happen now, but keep it safe
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Profile not found</p>
        <Link href="/">
          <Button variant="outline">Go Home</Button>
        </Link>
      </div>
    );
  }

  const Icon = sportIcons[profile.sport as SportType] || Sparkles;

  if (videoFile && videoUrl) {
    return (
      <AnalysisView
        videoFile={videoFile}
        videoUrl={videoUrl}
        onBack={handleBack}
        profileId={profileId}
        sport={profile.sport as SportType}
      />
    );
  }

  if (viewingAnalysis) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="h-16 border-b flex-shrink-0 sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="h-full max-w-screen-2xl mx-auto px-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setViewingAnalysis(null)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="p-2 rounded-lg bg-primary">
                <Eye className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-xl">Analysis Details</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    disabled={deleteAnalysisMutation.isPending}
                    aria-label="Delete analysis"
                    data-testid={`button-delete-analysis-detail-${viewingAnalysis.id}`}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this result?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes the analysis result and related awards from your account.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteAnalysis(viewingAnalysis.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <FeedbackPanel
            result={{
              ...viewingAnalysis,
              createdAt: viewingAnalysis.createdAt || new Date(),
            }}
            isLoading={false}
            exerciseType={profile.sport as SportType}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-16 border-b flex-shrink-0 sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="h-full max-w-screen-2xl mx-auto px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>

            <img src="/gymglow-logo.png" alt="GymGlow logo" className="h-11 w-14 rounded-md object-cover" />

            <span className="font-display font-bold text-xl" data-testid="text-brand">
              GymGlow
            </span>
          </div>

          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 py-8 px-4">
        <div className="max-w-screen-lg mx-auto">
          <div className="mb-8 flex items-start gap-4">
            <div className="p-4 rounded-xl bg-primary/10">
              <Icon className="h-8 w-8 text-primary" />
            </div>

            <div>
              <h1 className="text-2xl font-display font-bold">
                {sportDisplayNames[profile.sport as SportType]}
              </h1>

              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">
                  {getLevelDisplayForSport(profile.sport as SportType, profile.level, profile.metadata)}
                </Badge>

                {athlete && (
                  <span className="text-sm text-muted-foreground">{athlete.name}</span>
                )}
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Recent Analyses</h2>

            {analysesLoading ? (
              <div className="grid gap-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="h-24" />
                  </Card>
                ))}
              </div>
            ) : analyses.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground mb-2">No analyses yet</p>
                  <p className="text-sm text-muted-foreground">
                    Upload your first video to get AI-powered feedback
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {analyses.map((analysis) => (
                  <AnalysisCard
                    key={analysis.id}
                    analysis={analysis}
                    onView={() => setViewingAnalysis(analysis)}
                    onDelete={() => handleDeleteAnalysis(analysis.id)}
                    isDeleting={deleteAnalysisMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload New Video
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CompWeekCallout profileId={profileId} />
              <VideoUploadZone onVideoSelect={handleVideoSelect} compact />
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t py-4 flex-shrink-0">
        <div className="max-w-screen-2xl mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by AI vision technology. Your videos are analyzed securely and not stored.
          </p>
        </div>
      </footer>
    </div>
  );
}
