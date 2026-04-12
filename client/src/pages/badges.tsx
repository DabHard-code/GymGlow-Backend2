import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAuthHeaders } from "@/lib/queryClient";
import { Link } from "wouter";
import { ArrowLeft, Award, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { BadgeIconDb } from "@/components/badge-icon-db";
import { BadgeRow } from "@/components/badge-display";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { Athlete, SportProfile, EarnedBadge } from "@shared/schema";

type DbTier = "common" | "rare" | "epic" | "legendary" | "crimson";
type DbBadge = {
  id: any; // uuid in db, keep flexible
  sport: string;
  name: string;
  shortName?: string | null;
  description?: string | null;
  tier: DbTier;
  icon?: string | null;
  isCompOnly?: boolean;
  bodyFocus?: string | null;
};
const normKey = (s: string) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const badgeKeys = (b: DbBadge) =>
  [
    normKey(b.shortName || ""),
    normKey(b.name || ""),
    String(b.shortName || "").toLowerCase().trim(),
    String(b.name || "").toLowerCase().trim(),
  ].filter(Boolean);
const tierOrder: DbTier[] = ["common", "rare", "epic", "legendary", "crimson"];

const tierDisplay: Record<DbTier, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
  crimson: "Crimson (Competition)",
};

function getBadgeMetaOrFallback(
  catalogByKey: Record<string, DbBadge>,
  badgeType: string
): DbBadge {
  const key = normKey(badgeType);

  // 1) direct normalized lookup
  const direct = catalogByKey[key];
  if (direct) return direct;

  // 2) common variant keys (underscore/hyphen/space mismatches)
  const variants = [
    key.replace(/_/g, "-"),
    key.replace(/-/g, "_"),
    key.replace(/\s+/g, "-"),
    key.replace(/\s+/g, "_"),
  ];

  for (const v of variants) {
    const hit = catalogByKey[v];
    if (hit) return hit;
  }

  // 3) fallback meta so UI never hides badges
  const prettyName =
    badgeType
      .toString()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase()) || "Unknown Badge";

  // Use an existing badge as template (keeps tier/sport consistent)
  const template = Object.values(catalogByKey)[0];

  return {
    ...(template ?? {
      id: `fallback:${key}`,
      sport: "gymnastics",
      name: prettyName,
      tier: "common" as DbTier,
    }),
    id: `fallback:${key}`,
    name: prettyName,
    shortName: prettyName,
    description: `Awarded badge type: "${badgeType}" (not yet in catalog)`,
    icon: template?.icon ?? "Award",
    isCompOnly: false,
    bodyFocus: template?.bodyFocus ?? null,
  };
}

export default function BadgesPage({ params }: { params: { athleteId: string } }) {
  const athleteId = params.athleteId;

  const { data: athletes = [] } = useQuery<Athlete[]>({
    queryKey: ["/api/athletes"],
  });

  const athlete = useMemo(() => athletes.find((a) => a.id === athleteId), [athletes, athleteId]);

  const { data: profiles = [] } = useQuery<SportProfile[]>({
    queryKey: ["/api/athletes", athleteId, "profiles"],
    enabled: !!athleteId,
  });

  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId && profiles.length > 0) setProfileId(profiles[0].id);
  }, [profileId, profiles]);

  const selectedProfile = useMemo(() => profiles.find((p) => p.id === profileId) || profiles[0], [profiles, profileId]);
  const sport = selectedProfile?.sport || "gymnastics";
  const level = selectedProfile?.level || "";

  const { data: compStatus } = useQuery<{
    isCompWeek: boolean;
    weekInCycle?: number;
    weekStart?: string;
    weekEnd?: string;
  }>({
    queryKey: ["/api/competition/status", profileId],
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("profileId", String(profileId));
      const res = await fetch(`/api/competition/status?${qs.toString()}`, { headers: await getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to load competition status");
      return res.json();
    },
    enabled: !!profileId,
  });

  const isCompWeek = !!compStatus?.isCompWeek;

  // Training/legacy earned badges
  const { data: legacyBadges = [] } = useQuery<EarnedBadge[]>({
    queryKey: ["/api/athletes", athleteId, "badges"],
    enabled: !!athleteId,
  });

  const uniqueLegacyBadges = useMemo(() => {
    const seen = new Set<string>();
    const out: EarnedBadge[] = [];
    for (const b of legacyBadges) {
      const raw = (b as any).badgeType ?? (b as any).id ?? "";
      const key = normKey(raw);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(b);
    }
    return out;
  }, [legacyBadges]);

  // DB-backed badge catalog
  const { data: catalog = [], isLoading: isCatalogLoading } = useQuery<DbBadge[]>({
    queryKey: ["/api/badges", sport, level],
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("sport", sport);
      if (level) qs.set("level", level);
      const res = await fetch(`/api/badges?${qs.toString()}`);
      if (!res.ok) throw new Error("Failed to load badges");
      return res.json();
    },
    enabled: !!sport,
  });

  // Earned/progress state for DB badges
  const { data: badgeState, isLoading: isStateLoading } = useQuery<{ earnedBadgeIds: string[]; progress: any[] }>({
    queryKey: ["/api/athletes", athleteId, "badge-progress", sport, level],
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("sport", sport);
      if (level) qs.set("level", level);
      const res = await fetch(`/api/athletes/${athleteId}/badge-progress?${qs.toString()}`, { headers: await getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to load badge progress");
      return res.json();
    },
    enabled: !!athleteId,
  });
const earnedIds = useMemo(() => {
  const ids = new Set<string>();

  for (const id of badgeState?.earnedBadgeIds || []) ids.add(normKey(id));

  for (const b of uniqueLegacyBadges) {
    const raw = (b as any).badgeType ?? (b as any).id ?? "";
    const k = normKey(raw);
    if (k) ids.add(k);
  }

  return ids;
}, [badgeState, uniqueLegacyBadges]);

const isBadgeEarned = (badge: DbBadge) =>
  badgeKeys(badge).some((k) => earnedIds.has(k)) || earnedIds.has(normKey(badge.id));

  const grouped = useMemo(() => {
    const byTier: Record<DbTier, DbBadge[]> = {
      common: [],
      rare: [],
      epic: [],
      legendary: [],
      crimson: [],
    };

    for (const b of catalog) {
  const t = (b.tier || "common") as DbTier;
  byTier[t].push(b);
}

    for (const t of tierOrder) {
      byTier[t].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }

    return byTier;
  }, [catalog]);

  const isLoading = isCatalogLoading || isStateLoading;

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
              <Award className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">{athlete ? `${athlete.name}'s Badges` : "Badges"}</h1>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        <Card className="border-primary/15">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">How badges work</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Badges are milestones, not levels — you don’t “level them up.” You earn different badges with different rarities
              as progress happens.
            </p>
            <p>Earn badges by uploading skills, completing weekly challenges, and showing consistent improvement over time.</p>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading badges…</div>
        ) : (
          <div className="space-y-8">
            {uniqueLegacyBadges.length > 0 && (
              <Card className="border-primary/15">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Training badges earned</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    These come from uploads and AI feedback (practice/training). Catalog + Competition badges are shown below.
                  </div>
                  <BadgeRow badges={uniqueLegacyBadges} showAll />
                </CardContent>
              </Card>
            )}

            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">Sport profile</div>
              <div className="w-[240px]">
                <Select value={selectedProfile?.id} onValueChange={(v) => setProfileId(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.sport} · {p.level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Crimson badges are earned through <span className="font-medium text-foreground">Competition Mode</span>.
              {!isCompWeek && <> Current week is not a Competition Week.</>}
            </div>

           {tierOrder.map((tier) => {
  const earnedCount = grouped[tier].filter((b) => isBadgeEarned(b)).length;

  return (
    <section key={tier}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">{tierDisplay[tier]}</h2>
        <div className="text-xs text-muted-foreground">
          {earnedCount}/{grouped[tier].length} earned
        </div>
      </div>
      <Separator className="mb-4" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {grouped[tier].map((badge) => {
          const earned = isBadgeEarned(badge);
          return (
            <Card
              key={String(badge.id)}
              className={earned ? "" : "opacity-80"}
              data-testid={`badge-card-${String(badge.id)}`}
            >
              <CardContent className="p-4 flex gap-3 items-start">
                <div className="mt-1">
                  <BadgeIconDb tier={badge.tier} icon={badge.icon} size="md" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium leading-none">{badge.name}</p>
                    {!earned && <Lock className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                  <p className="text-xs mt-2">
                    {earned ? (
                      <span className="text-primary font-medium">Earned</span>
                    ) : (
                      <span className="text-muted-foreground">Locked</span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
})}
          </div>
        )}
      </main>
    </div>
  );
}