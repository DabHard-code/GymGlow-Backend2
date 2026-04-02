import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, BookOpen, Sparkles, Trophy, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Drill, DifficultyLevel } from "@shared/schema";

const difficultyColors: Record<DifficultyLevel, string> = {
  beginner: "bg-green-500/20 text-green-700 dark:text-green-400",
  intermediate: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  advanced: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  elite: "bg-red-500/20 text-red-700 dark:text-red-400",
};

function DrillCard({ drill, onClick }: { drill: Drill; onClick: () => void }) {
  return (
    <Card
      className="cursor-pointer hover-elevate active-elevate-2 transition-all"
      onClick={onClick}
      data-testid={`card-drill-${drill.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" />
            <CardTitle className="text-base truncate">{drill.name}</CardTitle>
          </div>
          <Badge variant="secondary" className={`shrink-0 text-xs ${difficultyColors[drill.difficulty]}`}>
            {drill.difficulty}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{drill.description}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {drill.category && (
            <Badge variant="outline" className="text-xs">
              {drill.category}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DrillDetailDialog({
  drill,
  open,
  onOpenChange,
}: {
  drill: Drill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!drill) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-drill-detail">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl">{drill.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={difficultyColors[drill.difficulty]}>{drill.difficulty}</Badge>
                {drill.category && <Badge variant="outline">{drill.category}</Badge>}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div>
            <h4 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wide">Description</h4>
            <p className="text-foreground leading-relaxed">{drill.description}</p>
          </div>

          <div>
            <h4 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wide">How to Perform</h4>
            <p className="text-foreground leading-relaxed">{drill.howToPerform}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-md bg-muted/50">
              <h4 className="font-semibold mb-1 text-sm text-muted-foreground uppercase tracking-wide">Reps / Sets</h4>
              <p className="text-foreground font-medium">{drill.repsSets}</p>
            </div>
            <div className="p-4 rounded-md bg-muted/50">
              <h4 className="font-semibold mb-1 text-sm text-muted-foreground uppercase tracking-wide">Difficulty</h4>
              <p className="text-foreground font-medium capitalize">{drill.difficulty}</p>
            </div>
          </div>

          <div className="p-4 rounded-md bg-primary/5 border border-primary/20">
            <h4 className="font-semibold mb-2 text-sm text-primary uppercase tracking-wide">Purpose</h4>
            <p className="text-foreground leading-relaxed">{drill.purpose}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function DrillsPage() {
  const [selectedDrill, setSelectedDrill] = useState<Drill | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: drills = [], isLoading } = useQuery<Drill[]>({
    queryKey: ["/api/drills"],
  });

  const handleDrillClick = (drill: Drill) => {
    setSelectedDrill(drill);
    setDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back-home">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Drill Library</h1>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container px-4 py-6">
        <section className="mb-6" data-testid="section-weekly-challenges-link">
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/20">
                  <Flame className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    This Week&apos;s Challenge Drills
                    <Badge variant="secondary" className="text-xs">
                      <Trophy className="h-3 w-3 mr-1" />
                      View
                    </Badge>
                  </CardTitle>
                  <CardDescription>Challenge-specific drill recommendations live on the Challenges page.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Link href="/challenges">
                <Button className="w-full">
                  <Trophy className="h-4 w-4 mr-2" />
                  Go to Weekly Challenges
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-5 bg-muted rounded w-3/4" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : drills.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No drills yet</CardTitle>
              <CardDescription>Drills will appear here as your library grows.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="grid-drills">
            {drills.map((drill) => (
              <DrillCard key={drill.id} drill={drill} onClick={() => handleDrillClick(drill)} />
            ))}
          </div>
        )}

        <DrillDetailDialog drill={selectedDrill} open={dialogOpen} onOpenChange={setDialogOpen} />
      </main>
    </div>
  );
}
