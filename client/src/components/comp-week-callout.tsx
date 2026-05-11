import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

type CompetitionStatus = {
  isCompWeek: boolean;
  weekInCycle?: number;
  weekStart?: string;
  weekEnd?: string;
};

function formatDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getWeeksUntilCompWeek(weekInCycle?: number) {
  if (!weekInCycle) return null;
  if (weekInCycle === 3 || weekInCycle === 6) return 0;
  if (weekInCycle < 3) return 3 - weekInCycle;
  return 6 - weekInCycle;
}

export function CompWeekCallout({
  profileId,
  compact = false,
  showWhenInactive = true,
  className,
}: {
  profileId?: string | null;
  compact?: boolean;
  showWhenInactive?: boolean;
  className?: string;
}) {
  const { data: status } = useQuery<CompetitionStatus>({
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

  const weeksUntilCompWeek = getWeeksUntilCompWeek(status?.weekInCycle);
  const weekEnd = formatDate(status?.weekEnd);

  const message = useMemo(() => {
    if (!status) return null;
    if (status.isCompWeek) {
      return `Comp Week is live${weekEnd ? ` through ${weekEnd}` : ""}. Eligible uploads and challenge submissions can earn Crimson badges.`;
    }
    if (weeksUntilCompWeek === 1) {
      return "Next week is Comp Week. Practice now, then upload eligible routines when it opens.";
    }
    if (weeksUntilCompWeek && weeksUntilCompWeek > 1) {
      return `Comp Week opens in ${weeksUntilCompWeek} weeks. Crimson badges unlock during Comp Week.`;
    }
    return "Crimson badges unlock during Comp Week.";
  }, [status, weekEnd, weeksUntilCompWeek]);

  if (!profileId || !status || (!status.isCompWeek && !showWhenInactive)) return null;

  if (compact) {
    return (
      <div
        className={cn(
          "rounded-md border p-3 text-xs",
          status.isCompWeek ? "border-primary/30 bg-primary/10" : "bg-muted/40",
          className,
        )}
        data-testid="comp-week-callout"
      >
        <div className="mb-1 flex items-center gap-2 font-medium">
          {status.isCompWeek ? <Trophy className="h-3.5 w-3.5" /> : <CalendarDays className="h-3.5 w-3.5" />}
          <span>{status.isCompWeek ? "Comp Week Live" : "Comp Week"}</span>
        </div>
        <p className="text-muted-foreground">{message}</p>
      </div>
    );
  }

  return (
    <Card className={cn(status.isCompWeek ? "border-primary/30 bg-primary/5" : "", className)} data-testid="comp-week-callout">
      <CardContent className="flex items-start gap-3 py-4">
        <div className="rounded-md bg-primary/10 p-2">
          {status.isCompWeek ? <Trophy className="h-5 w-5 text-primary" /> : <CalendarDays className="h-5 w-5 text-primary" />}
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">{status.isCompWeek ? "Comp Week is live" : "Comp Week badges"}</h2>
            <Badge variant={status.isCompWeek ? "default" : "secondary"}>
              Week {status.weekInCycle ?? "-"} of 6
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}
