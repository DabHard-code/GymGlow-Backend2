import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Dumbbell, Music, Sparkles, Heart, Trophy, Clock, Upload, Users, Medal, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanRequiredDialog } from "@/components/plan-required-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";
import { VideoUploadZone } from "@/components/video-upload-zone";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import type { Challenge, ChallengeSubmission, Athlete, SportProfile, SportType, DifficultyLevel } from "@shared/schema";

function prettySkillId(id?: string) {
  if (!id) return "—";
  return id.replace(/^skill_/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const sportIcons: Record<SportType, typeof Dumbbell> = {
  gymnastics: Sparkles,
  dance: Music,
  cheer: Star,
  lifting: Dumbbell,
  yoga: Heart,
};

const sportLabels: Record<SportType, string> = {
  gymnastics: "Gymnastics",
  dance: "Dance",
  cheer: "Cheer",
  lifting: "Weightlifting",
  yoga: "Yoga",
};

const difficultyColors: Record<DifficultyLevel, string> = {
  beginner: "bg-green-500/20 text-green-700 dark:text-green-400",
  intermediate: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  advanced: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  elite: "bg-red-500/20 text-red-700 dark:text-red-400",
};

function getTimeRemaining(endDate: Date | string): string {
  const end = new Date(endDate);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return "Ended";
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

function ChallengeCard({ 
  challenge, 
  onSubmit, 
  mySubmission, 
}: { 
  challenge: Challenge; 
  onSubmit: () => void;
  mySubmission?: ChallengeSubmission | null;
}) {
  const SportIcon = sportIcons[challenge.sport];
  const timeRemaining = getTimeRemaining(challenge.endDate);
  const isEnded = timeRemaining === "Ended";
  
  const { data: leaderboard } = useQuery<{ submission: ChallengeSubmission; athlete: Athlete }[]>({
    queryKey: [`/api/challenges/${challenge.id}/leaderboard`],
  });

  return (
    <Card 
      className="overflow-visible"
      data-testid={`card-challenge-${challenge.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-md bg-primary/10">
              <SportIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg">{challenge.name}</CardTitle>
              {challenge.targetSkillId ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Required Skill: {prettySkillId(challenge.targetSkillId)}
                </p>
              ) : null}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline">{sportLabels[challenge.sport]}</Badge>
                <Badge className={difficultyColors[challenge.difficulty]}>
                  {challenge.difficulty}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
            <Clock className="h-4 w-4" />
            <span className={isEnded ? "text-destructive" : ""}>{timeRemaining}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {challenge.description}
        </p>
        {leaderboard && leaderboard.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-sm font-medium">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span>Leaderboard</span>
            </div>
            <div className="space-y-1">
              {leaderboard.slice(0, 3).map((entry, index) => (
                <div 
                  key={(entry as any).submission?.id ?? `${(entry as any).rank ?? index}-${(entry as any).displayName ?? 'star'}-${(entry as any).submittedAt ?? ''}`}
                  className="flex items-center justify-between text-sm py-1 px-2 rounded-md bg-muted/50"
                  data-testid={`leaderboard-entry-${index}`}
                >
                  <div className="flex items-center gap-2">
                    {index === 0 && <Medal className="h-4 w-4 text-yellow-500" />}
                    {index === 1 && <Medal className="h-4 w-4 text-gray-400" />}
                    {index === 2 && <Medal className="h-4 w-4 text-amber-600" />}
                    <span>{(entry as any).displayName ?? (entry as any).athlete?.name ?? 'GymGlow Star'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium">{((entry as any).score)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {leaderboard && leaderboard.length === 0 && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No submissions yet. Be the first!</p>
          </div>
        )}
        {mySubmission ? (
  <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
    <div className="text-sm">
      <div className="font-medium">You submitted</div>
      <div className="text-xs text-muted-foreground">
        {mySubmission.submittedAt ? new Date(mySubmission.submittedAt as any).toLocaleString() : ""}
      </div>
    </div>

    <Badge variant="outline">
      {mySubmission.status === "scored"
        ? "Scored"
        : mySubmission.status === "analyzing"
        ? "Analyzing"
        : mySubmission.status === "pending"
        ? "Pending"
        : mySubmission.status === "ineligible"
        ? "Ineligible"
        : mySubmission.status === "error"
        ? "Error"
        : mySubmission.status}
    </Badge>
  </div>
) : null}

        <Button
  className="w-full"
  onClick={onSubmit}
  disabled={isEnded || !!mySubmission}
  data-testid={`button-submit-challenge-${challenge.id}`}
>
  <Upload className="h-4 w-4 mr-2" />
  {isEnded ? "Challenge Ended" : mySubmission ? "Submitted" : "Submit Entry"}
</Button>
      </CardContent>
    </Card>
  );
}

function SubmitChallengeDialog({
  challenge,
  open,
  onOpenChange,
}: {
  challenge: Challenge | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const previewUrl = useMemo(() => {
    if (!videoFile) return null;
    return URL.createObjectURL(videoFile);
  }, [videoFile]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);
  const [submitting, setSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<
    "idle" | "uploading" | "analyzing" | "done" | "ineligible" | "error"
  >("idle");
  const [scoredSubmission, setScoredSubmission] = useState<any | null>(null);
  const { toast } = useToast();

  const { data: athletes } = useQuery<Athlete[]>({
    queryKey: ['/api/athletes'],
  });

  // Auto-pick a sport profile that matches the challenge sport for the selected athlete.
  const { data: profiles = [] } = useQuery<SportProfile[]>({
    queryKey: ['/api/athletes', selectedAthleteId, 'profiles'],
    enabled: !!selectedAthleteId,
  });

  const matchingProfile = challenge
    ? profiles.find((p) => p.sport === challenge.sport)
    : undefined;

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const submitMutation = useMutation({
    mutationFn: async ({
      challengeId,
      athleteId,
      profileId,
      videoFile,
      skillId,
    }: {
      challengeId: string;
      athleteId: string;
      profileId: string;
      videoFile: File;
      skillId?: string;
    }) => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw new Error(`401: Not authenticated – ${error.message}`);
      const user = data.session?.user;
      if (!user) throw new Error("401: Not authenticated – no Supabase user session");

      // Server challenge-submit endpoint expects JSON w/ base64 (videoData)
      const videoData = await fileToBase64(videoFile);

      const payload: any = { athleteId, profileId, videoData };
      if (skillId) payload.skillId = skillId;

      const res = await fetch(`/api/challenges/${challengeId}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
          ...(user.email ? { "x-user-email": user.email } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }

      return res.json();
    },
onSuccess: (data) => {
      setSubmissionStatus("analyzing");
      pollSubmissionStatus(data.submissionId);
    },
    onError: (error: any) => {
      if (String(error?.message || "").startsWith("402:")) {
        setPlanDialogOpen(true);
        setSubmissionStatus("idle");
        return;
      }
      setSubmissionStatus("error");
      toast({
        title: "Submission Failed",
        description: error.message || "Could not submit your entry",
        variant: "destructive",
      });
    },
  });

  const pollSubmissionStatus = async (submissionId: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/submissions/${submissionId}`);
        const submission = await response.json();

        if (submission.status === "scored") {
          setScoredSubmission(submission);
          setSubmissionStatus("done");
          toast({
            title: "Entry Scored!",
            description: `Your score: ${submission.score}/100`,
          });
          queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
          return;
        }

        if (submission.status === "ineligible") {
          setScoredSubmission(submission);
          setSubmissionStatus("ineligible");
          toast({
            title: "Not eligible for this challenge",
            description: submission.feedback || "That upload doesn't match the challenge skill. Please resubmit the correct skill.",
            variant: "destructive",
          });
          return;
        }

        if (submission.status === "error") {
          setSubmissionStatus("error");
          toast({
            title: "Analysis Failed",
            description: "There was an error analyzing your video",
            variant: "destructive",
          });
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setSubmissionStatus("error");
          toast({
            title: "Timeout",
            description: "Analysis took too long. Please try again.",
            variant: "destructive",
          });
        }
      } catch (error) {
        setSubmissionStatus("error");
      }
    };

    poll();
  };

  const resetState = () => {
    setSelectedAthleteId("");
    setVideoFile(null);
    setSubmitting(false);
    setSubmissionStatus("idle");
    setScoredSubmission(null);
  };

  const handleVideoSelect = (file: File) => {
    setVideoFile(file);
  };

  const handleSubmit = async () => {
    if (!challenge || !selectedAthleteId || !videoFile) return;
    if (!matchingProfile) {
      toast({
        title: "No matching sport profile",
        description: `Add a ${sportLabels[challenge.sport]} profile for this athlete first.`,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    setSubmissionStatus("uploading");
    try {
      const skillId = challenge.targetSkillId ?? undefined;

      submitMutation.mutate({
        challengeId: challenge.id,
        athleteId: selectedAthleteId,
        profileId: matchingProfile.id,
        videoFile,
        ...(skillId ? { skillId } : {}),
      } as any);
    } catch (error) {
      setSubmissionStatus("error");
      toast({
        title: "Upload Failed",
        description: "Could not process video file",
        variant: "destructive",
      });
    }
  };

  if (!challenge) return null;

  const SportIcon = sportIcons[challenge.sport];
  const eligibleAthletes = athletes?.filter(a => {
    return true;
  }) || [];

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetState();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-submit-challenge">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <SportIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{challenge.name}</DialogTitle>
              <DialogDescription>Submit your entry for this challenge</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <h4 className="font-semibold mb-2">Challenge Instructions</h4>
            <p className="text-sm text-muted-foreground">{challenge.instructions}</p>
          </div>

          {submissionStatus === "idle" && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Athlete</label>
                <Select value={selectedAthleteId} onValueChange={setSelectedAthleteId}>
                  <SelectTrigger data-testid="select-athlete">
                    <SelectValue placeholder="Choose an athlete" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleAthletes.map((athlete) => (
                      <SelectItem key={athlete.id} value={athlete.id}>
                        {athlete.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Upload Video</label>
                <VideoUploadZone 
                  onVideoSelect={handleVideoSelect}
                />
                {videoFile && (
                  <div className="space-y-2">
                    <div className="rounded-lg overflow-hidden border bg-muted">
                      <video
                        controls
                        className="w-full h-48 object-contain bg-black"
                        src={previewUrl ?? undefined}
                      />
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Video ready for upload ({videoFile.name})
                    </p>
                  </div>
                )}
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={!selectedAthleteId || !videoFile || submitting}
                data-testid="button-confirm-submit"
              >
                <Upload className="h-4 w-4 mr-2" />
                Submit Entry
              </Button>
            </>
          )}

          {(submissionStatus === "uploading" || submissionStatus === "analyzing") && (
            <div className="text-center py-8 space-y-4">
              <div className="animate-pulse">
                {submissionStatus === "uploading" ? (
                  <Upload className="h-12 w-12 mx-auto text-primary" />
                ) : (
                  <Sparkles className="h-12 w-12 mx-auto text-primary" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  {submissionStatus === "uploading" ? "Uploading video..." : "Analyzing your performance..."}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {submissionStatus === "analyzing" && "Our AI coach is reviewing your form"}
                </p>
              </div>
              <Progress value={submissionStatus === "uploading" ? 30 : 70} className="max-w-xs mx-auto" />
            </div>
          )}

          {submissionStatus === "done" && (
            <div className="text-center py-8 space-y-4">
              <Trophy className="h-12 w-12 mx-auto text-yellow-500" />
              <p className="font-medium text-lg">Entry Scored!</p>
              <p className="text-sm text-muted-foreground">
                Your score: <span className="font-semibold">{scoredSubmission?.score ?? "—"}/100</span>
              </p>

              {scoredSubmission?.feedback ? (
                <div className="text-left max-w-xl mx-auto rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm font-semibold mb-2">Coach Feedback</p>
                  <pre className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                    {scoredSubmission.feedback}
                  </pre>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Feedback is still loading…</p>
              )}

              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    resetState();
                  }}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    resetState();
                  }}
                >
                  View Leaderboard
                </Button>
              </div>
            </div>
          )}

          {submissionStatus === "ineligible" && (
            <div className="text-center py-8 space-y-4">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="font-medium text-lg">Not eligible for this challenge</p>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                This upload doesn’t match the weekly challenge skill. No worries — just re-submit the correct skill to enter.
              </p>

              {scoredSubmission?.feedback ? (
                <div className="text-left max-w-xl mx-auto rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm font-semibold mb-2">Coach Note</p>
                  <pre className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                    {scoredSubmission.feedback}
                  </pre>
                </div>
              ) : null}

              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                <Button variant="outline" onClick={resetState}>
                  Try Again
                </Button>
                <Button
                  onClick={() => {
                    resetState();
                  }}
                >
                  Re-Upload Correct Skill
                </Button>
              </div>
            </div>
          )}

          {submissionStatus === "error" && (
            <div className="text-center py-8 space-y-4">
              <div className="text-destructive">
                <p className="font-medium">Something went wrong</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please try again
                </p>
              </div>
              <Button variant="outline" onClick={resetState}>
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ChallengesPage() {
  const [selectedSport, setSelectedSport] = useState<"all" | SportType>("all");
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  const { data: challenges, isLoading } = useQuery<Challenge[]>({
    queryKey: ['/api/challenges?active=true'],
  });

  const filteredChallenges = challenges?.filter(challenge => 
    selectedSport === "all" || challenge.sport === selectedSport
  ) || [];

  const { data: mySubs } = useQuery<{
  byChallengeId: Record<string, ChallengeSubmission>;
}>({
  queryKey: ["/api/challenges/my-submissions?active=true"],
});

  const handleSubmitChallenge = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setSubmitDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex items-center justify-between gap-4 h-14 px-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <h1 className="text-lg font-semibold">Weekly Challenges</h1>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container px-4 py-6">
        <div className="mb-6">
          <Tabs value={selectedSport} onValueChange={(v) => setSelectedSport(v as "all" | SportType)}>
            <TabsList className="w-full max-w-lg">
              <TabsTrigger value="all" className="flex-1" data-testid="tab-all">
                All
              </TabsTrigger>
              <TabsTrigger value="gymnastics" className="flex-1" data-testid="tab-gymnastics">
                <Sparkles className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Gymnastics</span>
              </TabsTrigger>
              <TabsTrigger value="dance" className="flex-1" data-testid="tab-dance">
                <Music className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Dance</span>
              </TabsTrigger>
              <TabsTrigger value="cheer" className="flex-1" data-testid="tab-cheer">
                <Star className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Cheer</span>
              </TabsTrigger>
              <TabsTrigger value="lifting" className="flex-1" data-testid="tab-lifting">
                <Dumbbell className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Lifting</span>
              </TabsTrigger>
              <TabsTrigger value="yoga" className="flex-1" data-testid="tab-yoga">
                <Heart className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Yoga</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-2/3" />
                  <div className="h-4 bg-muted rounded w-1/3 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded w-full mb-2" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredChallenges.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Active Challenges</h2>
            <p className="text-muted-foreground">
              {selectedSport === "all" 
                ? "Check back soon for new weekly challenges!"
                : `No ${sportLabels[selectedSport]} challenges right now. Try a different sport!`}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredChallenges.map((challenge) => (
  <ChallengeCard
    key={challenge.id}
    challenge={challenge}
    mySubmission={mySubs?.byChallengeId?.[challenge.id] ?? null}
    onSubmit={() => handleSubmitChallenge(challenge)}
  />
))}
          </div>
        )}
      </main>

      <SubmitChallengeDialog
        challenge={selectedChallenge}
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
      />
    </div>
  );
}
