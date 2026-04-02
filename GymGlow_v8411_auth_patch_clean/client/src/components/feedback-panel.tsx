import { Clock, AlertTriangle, Info, AlertCircle, Trophy, TrendingUp, BookOpen, Shield, ArrowUpRight, Target, Dumbbell } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { AnalysisResult, FeedbackItem, SportType, Drill } from "@shared/schema";
import { sportDisplayNames } from "@shared/schema";
import { cn } from "@/lib/utils";
import { AnalysisBadges } from "./badge-display";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FeedbackPanelProps {
  result: AnalysisResult | null;
  isLoading: boolean;
  exerciseType: SportType;
}

const severityConfig = {
  critical: {
    icon: AlertCircle,
    className: "border-destructive/30 bg-destructive/5",
    badgeVariant: "destructive" as const,
    label: "Critical",
  },
  warning: {
    icon: AlertTriangle,
    className: "border-chart-2/30 bg-chart-2/5",
    badgeVariant: "secondary" as const,
    label: "Attention",
  },
  info: {
    icon: Info,
    className: "border-primary/30 bg-primary/5",
    badgeVariant: "outline" as const,
    label: "Tip",
  },
};

const bodyPartLabels: Record<string, string> = {
  head: "Head & Neck",
  shoulders: "Shoulders",
  arms: "Arms & Hands",
  core: "Core & Torso",
  hips: "Hips & Pelvis",
  legs: "Legs & Knees",
  feet: "Feet & Ankles",
  full_body: "Full Body",
};

const phaseLabels: Record<string, string> = {
  preparation: "Preparation",
  execution: "Execution",
  transition: "Transition",
  finish: "Finish",
};

function FeedbackCard({
  item,
  index,
  onDrillClick,
}: {
  item: FeedbackItem;
  index: number;
  onDrillClick: (drillId: string) => void;
}) {
  const config = severityConfig[item.severity];
  const Icon = config.icon;

  return (
    <Card
      className={cn("transition-all duration-200", config.className)}
      data-testid={`card-feedback-${index}`}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <h4 className="font-semibold text-sm">{item.title}</h4>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {item.bodyPart && bodyPartLabels[item.bodyPart] && (
              <Badge variant="outline" className="text-xs">
                {bodyPartLabels[item.bodyPart]}
              </Badge>
            )}
            {item.phase && phaseLabels[item.phase] && (
              <Badge variant="secondary" className="text-xs">
                {phaseLabels[item.phase]}
              </Badge>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          {item.description}
        </p>

        <div className="bg-primary/10 rounded-lg p-3">
          <p className="text-sm font-medium flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <span>{item.improvement}</span>
          </p>
        </div>

        {item.drillRecommendation && (
          <div className="bg-muted/50 rounded-lg p-3 border border-muted">
            <p className="text-sm flex items-start gap-2">
              <Dumbbell className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <span>
                <span className="font-medium">Try this drill: </span>
                {item.drillRecommendation}
              </span>
            </p>
          </div>
        )}

        {item.drillMatches && item.drillMatches.length > 0 && (
          <div className="bg-muted/30 rounded-lg p-3 border border-muted">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Recommended from your Drill Library
            </p>
            <div className="flex flex-wrap gap-2">
              {item.drillMatches.map((d) => (
                <Badge
                  key={d.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => onDrillClick(d.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onDrillClick(d.id);
                  }}
                  data-testid={`drill-badge-${d.id}`}
                >
                  {d.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4" data-testid="loading-skeleton">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-full" />
      </div>

      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-32 w-full" />

      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function FeedbackPanel({ result, isLoading, exerciseType }: FeedbackPanelProps) {
  const [openDrillId, setOpenDrillId] = useState<string | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drill, setDrill] = useState<Drill | null>(null);

  useEffect(() => {
    if (!openDrillId) {
      setDrill(null);
      return;
    }
    let cancelled = false;
    setDrillLoading(true);
    fetch(`/api/drills/${openDrillId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load drill"))))
      .then((data) => {
        if (cancelled) return;
        setDrill(data);
      })
      .catch(() => {
        if (cancelled) return;
        setDrill(null);
      })
      .finally(() => {
        if (cancelled) return;
        setDrillLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [openDrillId]);

  if (isLoading) {
    return (
      <div className="h-full">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{sportDisplayNames[exerciseType]}</Badge>
            <h2 className="font-display font-bold text-lg">In-Depth AI Analysis</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Performing comprehensive analysis...
          </p>
        </div>
        <div className="p-4">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-center">
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Info className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg">Ready to Analyze</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Upload a video and select your exercise type to receive in-depth AI coaching feedback.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" data-testid="feedback-panel">
      <div className="p-4 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{sportDisplayNames[exerciseType]}</Badge>
          <h2 className="font-display font-bold text-lg">In-Depth AI Analysis</h2>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <Card data-testid="card-overall-score">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Overall Form Score
                </CardTitle>
                <span className="text-3xl font-display font-bold text-primary">
                  {result.overallScore}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <Progress value={result.overallScore} className="h-2 mb-3" />
              <p className="text-sm text-muted-foreground">{result.summary}</p>
            </CardContent>
          </Card>

          <AnalysisBadges analysisId={result.id} />

          {result.technicalBreakdown && (
            <Accordion type="single" collapsible defaultValue="technical">
              <AccordionItem value="technical" className="border rounded-lg">
                <AccordionTrigger className="px-4 py-3 hover:no-underline" data-testid="accordion-technical">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">Technical Breakdown</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {result.technicalBreakdown}
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {result.strengths.length > 0 && (
            <div className="space-y-2" data-testid="strengths-section">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                What You're Doing Well
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.strengths.map((strength, i) => (
                  <Badge key={i} variant="secondary" className="bg-primary/10 text-primary">
                    {strength}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3" data-testid="feedback-list">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Detailed Coaching Feedback
            </h3>
            {result.feedback.map((item, index) => (
              <FeedbackCard
                key={item.id}
                item={item}
                index={index}
                onDrillClick={(id) => setOpenDrillId(id)}
              />
            ))}
          </div>

          {result.safetyNotes && result.safetyNotes.length > 0 && (
            <Card className="border-chart-2/30 bg-chart-2/5" data-testid="safety-notes">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-5 w-5 text-chart-2" />
                  Safety Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.safetyNotes.map((note, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-chart-2 mt-1">•</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {result.progressionTips && result.progressionTips.length > 0 && (
            <Card className="border-primary/30 bg-primary/5" data-testid="progression-tips">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowUpRight className="h-5 w-5 text-primary" />
                  Next Level Goals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.progressionTips.map((tip, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <Target className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>

      <Dialog open={!!openDrillId} onOpenChange={(o) => (o ? null : setOpenDrillId(null))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {drill?.name || "Drill"}
            </DialogTitle>
          </DialogHeader>

          {drillLoading && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}

          {!drillLoading && drill && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {drill.category && <Badge variant="secondary">{drill.category}</Badge>}
                {drill.difficulty && <Badge variant="outline">{drill.difficulty}</Badge>}
              </div>

              {drill.purpose && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Purpose</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{drill.purpose}</p>
                </div>
              )}

              {drill.howToPerform && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">How to perform</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{drill.howToPerform}</p>
                </div>
              )}

              {drill.repsSets && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Reps / sets</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{drill.repsSets}</p>
                </div>
              )}
            </div>
          )}

          {!drillLoading && !drill && (
            <p className="text-sm text-muted-foreground">Could not load this drill.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
