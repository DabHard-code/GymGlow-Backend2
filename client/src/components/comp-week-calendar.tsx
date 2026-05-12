import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

type CompetitionStatus = {
  isCompWeek: boolean;
  weekInCycle?: number;
  weekStart?: string;
  weekEnd?: string;
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

function fmtRange(start: Date, end: Date) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString(undefined, opts)} - ${end.toLocaleDateString(undefined, opts)}`;
}

function nextCycleWeek(currentWeek: number, offset: number) {
  return ((currentWeek - 1 + offset) % 6) + 1;
}

export function CompWeekCalendar({ profileId }: { profileId?: string | null }) {
  const { data: status, isLoading } = useQuery<CompetitionStatus>({
    queryKey: ["/api/competition/status", profileId],
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("profileId", String(profileId));
      const res = await apiRequest("GET", `/api/competition/status?${qs.toString()}`);
      if (!res.ok) throw new Error("Failed to load competition status");
      return res.json();
    },
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
  });

  const weeks = useMemo(() => {
    if (!status?.weekStart || !status.weekInCycle) return [];
    const currentWeekStart = new Date(status.weekStart);
    if (Number.isNaN(currentWeekStart.getTime())) return [];

    return Array.from({ length: 6 }, (_, offset) => {
      const start = addDays(currentWeekStart, offset * 7);
      const end = addDays(start, 6);
      const cycleWeek = nextCycleWeek(status.weekInCycle!, offset);
      const isCompWeek = cycleWeek === 3 || cycleWeek === 6;
      return {
        start,
        end,
        cycleWeek,
        isCompWeek,
        isCurrent: offset === 0,
      };
    });
  }, [status]);

  if (!profileId) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Pick a sport profile to see the Comp Week calendar.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">Loading calendar...</CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="comp-week-calendar">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-5 w-5" />
          Comp Week Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          GymGlow uses one shared 6-week calendar for every athlete and sport profile. Weeks 3 and 6 are Comp Weeks, when eligible uploads and challenge submissions can earn Crimson badges.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {weeks.map((week) => (
            <div
              key={`${week.cycleWeek}-${week.start.toISOString()}`}
              className={cn(
                "rounded-lg border p-4",
                week.isCurrent && "border-primary bg-primary/5",
                week.isCompWeek && !week.isCurrent && "border-red-500/30 bg-red-500/5",
              )}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="font-semibold">Week {week.cycleWeek}</div>
                {week.isCurrent ? (
                  <Badge>Current</Badge>
                ) : week.isCompWeek ? (
                  <Badge variant="secondary" className="gap-1">
                    <Trophy className="h-3 w-3" />
                    Comp Week
                  </Badge>
                ) : (
                  <Badge variant="outline">Training</Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">{fmtRange(week.start, week.end)}</div>
              <div className="mt-3 text-xs text-muted-foreground">
                {week.isCompWeek
                  ? "Crimson badges can be earned from eligible work."
                  : "Practice week. Build consistency before Comp Week."}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
