import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanRequiredDialog } from "@/components/plan-required-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Athlete, SportProfile } from "@shared/schema";

type UserMe = { id: string; plan: "none" | "coach" | "competition"; trialCredits?: number };

type PointsHubResponse = {
  weekStart: string;
  weekEnd: string;
  totalPoints: number;
  breakdown: {
    challengesSubmitted: number;
    basePoints: number;
    allChallengesBonus: number;
    aiBonus: number;
  };
  activity: Array<{
    challengeId: string;
    submittedAt: string;
    status: string;
    score: number | null;
    basePoints: number;
    aiPoints: number;
    totalFromThisChallenge: number;
  }>;
};
type Challenge = { id: string; name: string };

type WeeklyLeaderboardResponse = {
  locked?: boolean;
  weekStart: string;
  weekEnd: string;
  totalWeeklyChallenges: number;
  preview?: Array<{ rank: number; displayName: string }>;
  entries?: Array<{
    rank: number;
    displayName: string;
    points: number;
    challengesCompleted: number;
    aiBonus: number;
  }>;
};

export default function LeaderboardPage() {
    const [planDialogOpen, setPlanDialogOpen] = useState(false);

const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");

    const { data: me } = useQuery<UserMe>({ queryKey: ["/api/users/me"] });
    const { data: challenges = [] } = useQuery<Challenge[]>({
  queryKey: ["/api/challenges"],
});

const challengeNameById = Object.fromEntries(
  challenges.map((c) => [c.id, c.name])
) as Record<string, string>;

const { data: athletes = [] } = useQuery<Athlete[]>({
    queryKey: ["/api/athletes"],
  });

  const { data: profiles = [] } = useQuery<SportProfile[]>({
    queryKey: selectedAthleteId ? ["/api/athletes", selectedAthleteId, "profiles"] : ["/api/athletes", "none", "profiles"],
    enabled: !!selectedAthleteId,
  });

  const { data: leaderboard } = useQuery<WeeklyLeaderboardResponse>({
    queryKey: selectedProfileId
      ? [`/api/leaderboard/weekly?profileId=${selectedProfileId}`]
      : ["/api/leaderboard/weekly?profileId=none"],
    enabled: !!selectedProfileId,
    refetchInterval: 5000, // live-ish updating
  });

  const isCompetitionLocked = (leaderboard as any)?.locked || me?.plan !== "competition";

  const { data: pointsHub } = useQuery<PointsHubResponse>({
    queryKey: selectedProfileId && selectedAthleteId
      ? [`/api/points/hub?profileId=${selectedProfileId}&athleteId=${selectedAthleteId}`]
      : ["/api/points/hub?profileId=none&athleteId=none"],
    enabled: !!selectedProfileId && !!selectedAthleteId,
    refetchInterval: 5000,
  });


  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b py-4 px-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-home">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <Trophy className="h-5 w-5" /> Weekly Leaderboard
              </h1>
              <p className="text-sm text-muted-foreground">Live points update as challenges are completed.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 py-6 px-4">
        <div className="max-w-screen-xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Athlete & Profile</CardTitle>
              <CardDescription>Leaderboard is scoped to the selected sport + level profile.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Select value={selectedAthleteId} onValueChange={(v) => { setSelectedAthleteId(v); setSelectedProfileId(""); }}>
                <SelectTrigger data-testid="select-athlete">
                  <SelectValue placeholder="Choose athlete" />
                </SelectTrigger>
                <SelectContent>
                  {athletes.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedProfileId} onValueChange={setSelectedProfileId} disabled={!selectedAthleteId}>
                <SelectTrigger data-testid="select-profile">
                  <SelectValue placeholder={selectedAthleteId ? "Choose profile" : "Choose athlete first"} />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.sport} • {p.level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>


          {selectedAthleteId && selectedProfileId && (
            <Card>
              <CardHeader>
                <CardTitle>Points Hub</CardTitle>
                <CardDescription>
                  See exactly how points add up this week for the selected athlete.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!pointsHub ? (
                  <div className="text-sm text-muted-foreground">Loading points breakdown…</div>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="rounded-md border p-3">
                        <div className="text-xs text-muted-foreground">Total Points</div>
                        <div className="text-2xl font-semibold">{pointsHub.totalPoints}</div>
                      </div>
                      <div className="rounded-md border p-3">
                        <div className="text-xs text-muted-foreground">Challenges Submitted</div>
                        <div className="text-xl font-semibold">{pointsHub.breakdown.challengesSubmitted}</div>
                      </div>
                      <div className="rounded-md border p-3">
                        <div className="text-xs text-muted-foreground">Base Points</div>
                        <div className="text-xl font-semibold">{pointsHub.breakdown.basePoints}</div>
                      </div>
                      <div className="rounded-md border p-3">
                        <div className="text-xs text-muted-foreground">AI Bonus</div>
                        <div className="text-xl font-semibold">{pointsHub.breakdown.aiBonus}</div>
                      </div>
                    </div>

                    {pointsHub.breakdown.allChallengesBonus > 0 && (
                      <div className="text-sm">
                        <span className="font-medium">Bonus:</span> +{pointsHub.breakdown.allChallengesBonus} for submitting 3 challenges this week.
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Recent Challenge Activity</div>
                      {pointsHub.activity.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No challenge submissions yet this week.</div>
                      ) : (
                        <div className="space-y-2">
                          {pointsHub.activity.map((a) => (
                            <div key={a.challengeId} className="flex items-center justify-between rounded-md border px-3 py-2">
                              <div className="space-y-0.5">
                                <div className="text-sm font-medium">
  {challengeNameById[a.challengeId] ?? a.challengeId}
</div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(a.submittedAt).toLocaleString()} • {a.status}{a.score != null ? ` • score ${a.score}` : ""}
                                </div>
                              </div>
                              <div className="text-sm font-medium">+{a.totalFromThisChallenge} pts</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
  <CardHeader>
    <CardTitle>Rankings</CardTitle>
    {leaderboard?.weekStart && leaderboard?.weekEnd ? (
      <CardDescription>
        Week window:{" "}
        {new Date(leaderboard.weekStart).toLocaleDateString()} –{" "}
        {new Date(leaderboard.weekEnd).toLocaleDateString()}
      </CardDescription>
    ) : (
      <CardDescription>Pick a profile to view rankings.</CardDescription>
    )}
  </CardHeader>

  <CardContent>
    {!selectedProfileId ? (
      <div className="text-sm text-muted-foreground">
        Select a profile to load the leaderboard.
      </div>
    ) : !leaderboard ? (
      <div className="text-sm text-muted-foreground">Loading leaderboard…</div>
    ) : isCompetitionLocked ? (
      <div className="relative">
        <div className="space-y-2 blur-sm pointer-events-none select-none">
          {(leaderboard.preview && leaderboard.preview.length
            ? leaderboard.preview
            : Array.from({ length: 5 }).map((_, i) => ({
                rank: i + 1,
                displayName: "GymGlow Star ####",
                points: 0,
              }))
          ).map((e: any) => (
            <div
              key={`preview-${e.rank}-${e.displayName}`}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 text-sm font-semibold text-muted-foreground">
                  #{e.rank}
                </div>
                <div className="font-medium">{e.displayName}</div>
              </div>
              <div className="text-sm text-muted-foreground">— pts</div>
            </div>
          ))}
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-md">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 font-semibold">
              <Trophy className="h-4 w-4" />
              Competition Mode Required
            </div>
            <div className="text-sm text-muted-foreground">
              Unlock weekly rankings and crimson badges.
            </div>
          </div>
          <Button onClick={() => setPlanDialogOpen(true)}>
            Unlock Competition Mode
          </Button>
        </div>
      </div>
    ) : (leaderboard.entries?.length ?? 0) === 0 ? (
      <div className="text-sm text-muted-foreground">
        No submissions yet this week.
      </div>
    ) : (
      <div className="space-y-4">
        {leaderboard.entries!.map((raw, index) => {
          const e = raw as any;

          const rank = e.rank ?? index + 1;
          const topPoints = (leaderboard.entries?.[0] as any)?.points || 1;
          const pct = Math.max(0, Math.min(100, (Number(e.points || 0) / Number(topPoints)) * 100));

          const medalStyle =
            rank === 1
              ? "bg-yellow-50 border-yellow-400 shadow-lg shadow-yellow-200/50"
              : rank === 2
              ? "bg-gray-50 border-gray-400"
              : rank === 3
              ? "bg-orange-50 border-orange-400"
              : "bg-white";

          const isYou = e.athleteId && selectedAthleteId && e.athleteId === selectedAthleteId;

          return (
            <div
              key={`${rank}-${e.displayName}`}
              className={`rounded-xl border p-5 transition hover:shadow-md ${medalStyle}`}
              data-testid={`weekly-leaderboard-row-${rank}`}
            >
              <div className="flex items-center justify-between">
                {/* Left */}
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold w-12 text-center">#{rank}</div>

                  <div>
                    <div className="font-semibold text-lg flex items-center gap-2">
                      {e.displayName}
                      {isYou && (
                        <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full">
                          You
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {e.challengesCompleted != null ? (
                        <>Challenges: {e.challengesCompleted}</>
                      ) : (
                        <>Live weekly standings</>
                      )}
                      {e.aiBonus != null ? <> • AI Bonus: {e.aiBonus}</> : null}
                    </div>
                  </div>
                </div>

                {/* Points */}
                <div className="text-right">
                  <div className="text-3xl font-bold text-purple-600">
                    {e.points ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">points</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-600" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </CardContent>
</Card>
        </div>

        <PlanRequiredDialog
          open={planDialogOpen}
          onOpenChange={setPlanDialogOpen}
          message="Competition Mode is required to view full weekly rankings."
        />
      </main>
    </div>
  );
}