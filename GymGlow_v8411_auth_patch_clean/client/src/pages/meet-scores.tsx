import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { format } from "date-fns";
import { 
  ArrowLeft, Plus, Trophy, Calendar, MapPin, Sparkles, Music, Star, 
  Dumbbell, Heart, ChevronRight, Trash2, Edit2, Medal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { 
  Athlete, Season, Meet, MeetScore, SportType,
  GymnasticsEvent, DanceCategory, CheerCategory
} from "@shared/schema";
import { 
  sportDisplayNames, gymnasticsEventNames, danceCategoryNames, cheerCategoryNames,
  gymnasticsEvents, danceCategories, cheerCategories
} from "@shared/schema";

const sportIcons: Record<SportType, typeof Sparkles> = {
  gymnastics: Sparkles,
  dance: Music,
  cheer: Star,
  lifting: Dumbbell,
  yoga: Heart,
};

function getScoringCategories(sport: SportType): { key: string; name: string }[] {
  switch (sport) {
    case "gymnastics":
      return gymnasticsEvents.map(e => ({ key: e, name: gymnasticsEventNames[e] }));
    case "dance":
      return danceCategories.map(c => ({ key: c, name: danceCategoryNames[c] }));
    case "cheer":
      return cheerCategories.map(c => ({ key: c, name: cheerCategoryNames[c] }));
    default:
      return [{ key: "overall", name: "Overall Score" }];
  }
}

interface MeetWithScores extends Meet {
  scores: MeetScore[];
}

function AddSeasonDialog({
  open,
  onOpenChange,
  athleteId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteId: string;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [sport, setSport] = useState<SportType>("gymnastics");
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/athletes/${athleteId}/seasons`, { name, year, sport });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/athletes", athleteId, "seasons"] });
      toast({ title: "Season created successfully" });
      onOpenChange(false);
      setName("");
      onSuccess();
    },
    onError: () => {
      toast({ title: "Failed to create season", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-add-season">
        <DialogHeader>
          <DialogTitle>Add New Season</DialogTitle>
          <DialogDescription>Create a new competition season to track meet scores.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="season-name">Season Name</Label>
            <Input
              id="season-name"
              placeholder="e.g., Fall 2025"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-season-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="season-year">Year</Label>
            <Input
              id="season-year"
              type="number"
              value={year}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) setYear(val);
              }}
              data-testid="input-season-year"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="season-sport">Sport</Label>
            <Select value={sport} onValueChange={(v) => setSport(v as SportType)}>
              <SelectTrigger data-testid="select-season-sport">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gymnastics">Gymnastics</SelectItem>
                <SelectItem value="dance">Dance</SelectItem>
                <SelectItem value="cheer">Cheer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={() => createMutation.mutate()} 
            disabled={!name || createMutation.isPending}
            data-testid="button-create-season"
          >
            {createMutation.isPending ? "Creating..." : "Create Season"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddMeetDialog({
  open,
  onOpenChange,
  seasonId,
  sport,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seasonId: string;
  sport: SportType;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [meetDate, setMeetDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [scores, setScores] = useState<Record<string, { score: string; placement: string }>>({});
  const { toast } = useToast();

  const categories = getScoringCategories(sport);

  const createMutation = useMutation({
    mutationFn: async () => {
      const meetRes = await apiRequest("POST", `/api/seasons/${seasonId}/meets`, { name, location, meetDate });
      const meet = await meetRes.json();
      
      const scoreData = Object.entries(scores)
        .filter(([_, v]) => v.score || v.placement)
        .map(([category, v]) => ({
          category,
          score: v.score || undefined,
          placement: v.placement ? parseInt(v.placement) : undefined,
        }));
      
      if (scoreData.length > 0) {
        await apiRequest("POST", `/api/meets/${meet.id}/scores`, { scores: scoreData });
      }
      
      return meet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seasons", seasonId, "meets"] });
      toast({ title: "Meet added successfully" });
      onOpenChange(false);
      setName("");
      setLocation("");
      setScores({});
      onSuccess();
    },
    onError: () => {
      toast({ title: "Failed to add meet", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-add-meet">
        <DialogHeader>
          <DialogTitle>Add Competition/Meet</DialogTitle>
          <DialogDescription>Record scores from a competition.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="meet-name">Meet Name</Label>
              <Input
                id="meet-name"
                placeholder="e.g., State Championships"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-meet-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meet-date">Date</Label>
              <Input
                id="meet-date"
                type="date"
                value={meetDate}
                onChange={(e) => setMeetDate(e.target.value)}
                data-testid="input-meet-date"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="meet-location">Location (optional)</Label>
            <Input
              id="meet-location"
              placeholder="e.g., Denver, CO"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              data-testid="input-meet-location"
            />
          </div>
          
          <div className="space-y-3 pt-4">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Scores
            </h4>
            <div className="grid gap-3">
              {categories.map((cat) => (
                <div key={cat.key} className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <span className="min-w-[140px] font-medium text-sm">{cat.name}</span>
                  <Input
                    placeholder="Score"
                    value={scores[cat.key]?.score || ""}
                    onChange={(e) => setScores(prev => ({
                      ...prev,
                      [cat.key]: { ...prev[cat.key], score: e.target.value }
                    }))}
                    className="w-24"
                    data-testid={`input-score-${cat.key}`}
                  />
                  <Input
                    placeholder="Place"
                    type="number"
                    value={scores[cat.key]?.placement || ""}
                    onChange={(e) => setScores(prev => ({
                      ...prev,
                      [cat.key]: { ...prev[cat.key], placement: e.target.value }
                    }))}
                    className="w-20"
                    data-testid={`input-placement-${cat.key}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={() => createMutation.mutate()} 
            disabled={!name || createMutation.isPending}
            data-testid="button-create-meet"
          >
            {createMutation.isPending ? "Saving..." : "Save Meet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MeetCard({ meet, sport, seasonId }: { meet: MeetWithScores; sport: SportType; seasonId: string }) {
  const categories = getScoringCategories(sport);
  const categoryNames = sport === "gymnastics" ? gymnasticsEventNames 
    : sport === "dance" ? danceCategoryNames 
    : sport === "cheer" ? cheerCategoryNames 
    : {};
  const { toast } = useToast();
  
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/meets/${meet.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/seasons", seasonId, "meets"] });
      toast({ title: "Meet deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete meet", variant: "destructive" });
    },
  });
  
  return (
    <Card className="mb-3" data-testid={`card-meet-${meet.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-base">{meet.name}</CardTitle>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(meet.meetDate), "MMM d, yyyy")}
              </span>
              {meet.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {meet.location}
                </span>
              )}
            </div>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" data-testid={`button-delete-meet-${meet.id}`}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Meet?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{meet.name}" and all its scores. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-destructive-foreground"
                  data-testid={`button-confirm-delete-meet-${meet.id}`}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {meet.scores.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {meet.scores.map((score) => (
              <div 
                key={score.id} 
                className="p-2 rounded-md bg-muted/50 text-center"
              >
                <div className="text-xs text-muted-foreground mb-1">
                  {(categoryNames as any)[score.category] || score.category}
                </div>
                <div className="font-semibold text-lg">{score.score || "-"}</div>
                {score.placement && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    <Medal className="h-3 w-3 mr-1" />
                    #{score.placement}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">No scores recorded</p>
        )}
      </CardContent>
    </Card>
  );
}

function SeasonSection({ 
  season, 
  athleteId,
  defaultOpen = false 
}: { 
  season: Season; 
  athleteId: string;
  defaultOpen?: boolean;
}) {
  const [addMeetOpen, setAddMeetOpen] = useState(false);
  const SportIcon = sportIcons[season.sport];
  const { toast } = useToast();
  
  const { data: meets = [], isLoading } = useQuery<MeetWithScores[]>({
    queryKey: ["/api/seasons", season.id, "meets"],
  });

  const deleteSeasonMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/seasons/${season.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/athletes", athleteId, "seasons"] });
      toast({ title: "Season deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete season", variant: "destructive" });
    },
  });

  return (
    <>
      <AccordionItem value={season.id} className="border rounded-lg mb-3 overflow-hidden">
        <AccordionTrigger className="px-4 py-3 hover:no-underline hover-elevate" data-testid={`accordion-season-${season.id}`}>
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 rounded-md bg-primary/10">
              <SportIcon className="h-4 w-4 text-primary" />
            </div>
            <div className="text-left">
              <div className="font-semibold">{season.name}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{sportDisplayNames[season.sport]}</Badge>
                <span>{season.year}</span>
                <span>•</span>
                <span>{meets.length} meet{meets.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="pt-2">
            <div className="flex justify-between items-center mb-3 gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" data-testid={`button-delete-season-${season.id}`}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Season
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Season?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{season.name}" and all its meets and scores. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => deleteSeasonMutation.mutate()}
                      className="bg-destructive text-destructive-foreground"
                      data-testid={`button-confirm-delete-season-${season.id}`}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button 
                size="sm" 
                onClick={() => setAddMeetOpen(true)}
                data-testid={`button-add-meet-${season.id}`}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Meet
              </Button>
            </div>
            
            {isLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading meets...</div>
            ) : meets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No meets recorded yet.</p>
                <p className="text-sm">Add your first competition!</p>
              </div>
            ) : (
              <div>
                {meets.map((meet) => (
                  <MeetCard key={meet.id} meet={meet} sport={season.sport} seasonId={season.id} />
                ))}
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
      
      <AddMeetDialog
        open={addMeetOpen}
        onOpenChange={setAddMeetOpen}
        seasonId={season.id}
        sport={season.sport}
        onSuccess={() => {}}
      />
    </>
  );
}

export default function MeetScoresPage() {
  const [, params] = useRoute("/meet-scores/:athleteId");
  const athleteId = params?.athleteId || "";
  const [addSeasonOpen, setAddSeasonOpen] = useState(false);
  
  const { data: athlete } = useQuery<Athlete>({
    queryKey: ["/api/athletes", athleteId],
    enabled: !!athleteId,
  });
  
  const { data: seasonsData = [], isLoading } = useQuery<Season[]>({
    queryKey: ["/api/athletes", athleteId, "seasons"],
    enabled: !!athleteId,
  });

  const groupedSeasons = seasonsData.reduce((acc, season) => {
    if (!acc[season.sport]) acc[season.sport] = [];
    acc[season.sport].push(season);
    return acc;
  }, {} as Record<SportType, Season[]>);

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
              <Trophy className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Meet Scores</h1>
              {athlete && (
                <Badge variant="outline" className="ml-2">{athlete.name}</Badge>
              )}
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">Competition History</h2>
            <p className="text-sm text-muted-foreground">
              Track scores from meets and competitions
            </p>
          </div>
          <Button onClick={() => setAddSeasonOpen(true)} data-testid="button-add-season">
            <Plus className="h-4 w-4 mr-2" />
            Add Season
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading seasons...</div>
        ) : seasonsData.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="font-semibold text-lg mb-2">No Seasons Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first season to start tracking competition scores.
              </p>
              <Button onClick={() => setAddSeasonOpen(true)} data-testid="button-add-first-season">
                <Plus className="h-4 w-4 mr-2" />
                Add First Season
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue={Object.keys(groupedSeasons)[0] || "gymnastics"}>
            <TabsList className="mb-4">
              {Object.keys(groupedSeasons).map((sport) => {
                const SportIcon = sportIcons[sport as SportType];
                return (
                  <TabsTrigger key={sport} value={sport} data-testid={`tab-${sport}`}>
                    <SportIcon className="h-4 w-4 mr-1" />
                    {sportDisplayNames[sport as SportType]}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            
            {Object.entries(groupedSeasons).map(([sport, sportSeasons]) => (
              <TabsContent key={sport} value={sport}>
                <Accordion type="multiple" defaultValue={[sportSeasons[0]?.id]}>
                  {sportSeasons.map((season, index) => (
                    <SeasonSection 
                      key={season.id} 
                      season={season}
                      athleteId={athleteId}
                      defaultOpen={index === 0}
                    />
                  ))}
                </Accordion>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </main>

      <AddSeasonDialog
        open={addSeasonOpen}
        onOpenChange={setAddSeasonOpen}
        athleteId={athleteId}
        onSuccess={() => {}}
      />
    </div>
  );
}
