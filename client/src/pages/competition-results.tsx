import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Trophy, ArrowLeft, Sparkles } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { type SportProfile, type SportType, sportDisplayNames } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

type ResultsResponse =
  | {
      weekStart: string | Date;
      weekEnd: string | Date;
      cycleWeek: number;
      isCompWeek: false;
      message: string;
      coachRecap: string;
    }
  | {
      weekStart: string | Date;
      weekEnd: string | Date;
      cycleWeek: number;
      isCompWeek: true;
      totalPlayers: number;
      your:
        | null
        | {
            rank: number;
            percentile: number | null;
            avgTop2: number;
            best: number;
            second: number;
            top2: { score: number; createdAt: string | Date }[];
          };
      top10: { rank: number; displayName: string; avgTop2: number; best: number; second: number }[];
      message: string;
      coachRecap: string;
    };

function fmtDateRange(a: Date, b: Date) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${a.toLocaleDateString(undefined, opts)} – ${b.toLocaleDateString(undefined, opts)}`;
}

export default function CompetitionResultsPage() {
  const params = useParams<{ athleteId: string }>();
  const athleteId = params.athleteId;

  const { data: profiles = [] } = useQuery<SportProfile[]>({
    queryKey: ["/api/athletes", athleteId, "profiles"],
  });

  const [profileId, setProfileId] = useState<string>("");

  // Auto-select the only sport profile if there's just one (GymGlow v1: usually gymnastics only).
  useEffect(() => {
    if (!profileId && profiles.length === 1) {
      setProfileId(profiles[0].id);
    }
  }, [profiles, profileId]);

  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === profileId) || null,
    [profiles, profileId],
  );

  const { data: results, isLoading } = useQuery<ResultsResponse>({
    queryKey: ["/api/competition/results", profileId],
    enabled: Boolean(profileId),
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/competition/results?profileId=${encodeURIComponent(profileId)}&viewerAthleteId=${encodeURIComponent(athleteId)}`);
      if (!res.ok) throw new Error("Failed to load results");
      return res.json();
    },
  });

  const weekLabel = useMemo(() => {
    if (!results) return null;
    const ws = new Date(results.weekStart);
    const we = new Date(results.weekEnd);
    return fmtDateRange(ws, we);
  }, [results]);

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" className="gap-2">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6" /> End of Week Results
            </h1>
            <p className="text-sm text-muted-foreground">
              Results show for the last completed week (Sun–Sat). Best 2 uploads count.
            </p>
          </div>
        </div>
      </div>

      {profiles.length > 1 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> Choose a Sport Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={profileId} onValueChange={setProfileId}>
              <SelectTrigger>
                <SelectValue placeholder="Select sport + level" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {sportDisplayNames[p.sport as SportType]} • {p.level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedProfile ? (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{sportDisplayNames[selectedProfile.sport as SportType]}</Badge>
                <Badge variant="outline">{selectedProfile.level}</Badge>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> Sport Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedProfile ? (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{sportDisplayNames[selectedProfile.sport as SportType]}</Badge>
                <Badge variant="outline">{selectedProfile.level}</Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading profile…</p>
            )}
          </CardContent>
        </Card>
      )}

      {!profileId ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Pick a profile to see last week’s results.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Loading results…</CardContent>
        </Card>
      ) : !results ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">No results.</CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Coach Recap
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {results.coachRecap}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span>Last Week • {weekLabel}</span>
                <Badge variant={results.isCompWeek ? "default" : "secondary"}>
                  Week {results.cycleWeek} • {results.isCompWeek ? "Comp Week Results" : "Training Week"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{results.message}</p>

              {results.isCompWeek ? (
                <>
                  <div className="grid md:grid-cols-3 gap-3">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">Your Rank</div>
                        <div className="text-2xl font-bold">
                          {results.your?.rank ? `#${results.your.rank}` : "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">of {results.totalPlayers} athletes</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">Avg (Top 2)</div>
                        <div className="text-2xl font-bold">{results.your ? results.your.avgTop2 : "—"}</div>
                        <div className="text-xs text-muted-foreground">best two uploads</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-xs text-muted-foreground">Percentile</div>
                        <div className="text-2xl font-bold">{results.your?.percentile ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">higher is better</div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Your Counting Uploads (Top 2)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {results.your?.top2?.length ? (
                        results.your.top2.map((x, idx) => (
                          <div key={idx} className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                              <div className="font-medium">Slot #{idx + 1}</div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(x.createdAt).toLocaleString()}
                              </div>
                            </div>
                            <Badge className="text-base">{x.score}</Badge>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground">No uploads counted last week.</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Top 10 (Anonymous)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {results.top10.length ? (
                        <div className="space-y-2">
                          {results.top10.map((row) => (
                            <div key={row.rank} className="flex items-center justify-between rounded-lg border p-3">
                              <div className="flex items-center gap-3">
                                <Badge variant="secondary">#{row.rank}</Badge>
                                <div>
                                  <div className="font-medium">{row.displayName}</div>
                                  <div className="text-xs text-muted-foreground">Best 2 Avg: {row.avgTop2}</div>
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground">{row.best} • {row.second}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No results yet.</div>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  No comp results for this week. Results show after Comp Week (week 3 and week 6).
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
