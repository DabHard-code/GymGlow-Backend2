import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Dumbbell, Music, Sparkles, Heart, Star, CheckCircle, AlertCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Skill, SkillProgress, Athlete, SportType, Drill } from "@shared/schema";
import { skillStatusDisplayNames, skillStatusColors, type SkillStatus } from "@shared/schema";

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

const statusIcons: Record<SkillStatus, typeof CheckCircle> = {
  consistent: CheckCircle,
  working_on: Clock,
  needs_help: AlertCircle,
};

function SkillCard({ 
  skill, 
  progress,
  selectedAthlete,
  onUpdateProgress 
}: { 
  skill: Skill; 
  progress?: SkillProgress;
  selectedAthlete: Athlete | null;
  onUpdateProgress: (skillId: string, status: SkillStatus, notes?: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [notes, setNotes] = useState(progress?.notes || "");
  
  useEffect(() => {
    setNotes(progress?.notes || "");
    setIsExpanded(false);
  }, [progress?.notes, selectedAthlete?.id]);
  
  const currentStatus = progress?.status as SkillStatus | undefined;
  const StatusIcon = currentStatus ? statusIcons[currentStatus] : null;
  const { data: linkedDrills = [] } = useQuery<Drill[]>({
    queryKey: ["/api/skills", skill.id, "drills"],
    enabled: isExpanded,
  });

  return (
    <Card 
      className="transition-all"
      data-testid={`card-skill-${skill.id}`}
    >
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              {skill.name}
              {StatusIcon && currentStatus && (
                <Badge 
                  variant="secondary" 
                  className={`shrink-0 text-xs ${skillStatusColors[currentStatus]}`}
                >
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {skillStatusDisplayNames[currentStatus]}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-xs">
                Level {skill.level}
              </Badge>
              {skill.category && (
                <Badge variant="outline" className="text-xs">
                  {skill.category}
                </Badge>
              )}
            </div>
          </div>
          {selectedAthlete && (
            <Button 
              size="icon" 
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              data-testid={`button-expand-skill-${skill.id}`}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </CardHeader>
      
      {isExpanded && selectedAthlete && (
        <CardContent className="pt-0 space-y-3">
          {(skill as any).description || (skill as any).keyPoints?.length ? (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
              {(skill as any).description ? (
                <div className="text-sm text-foreground">
                  <span className="font-medium">Coach Notes:</span> {(skill as any).description}
                </div>
              ) : null}
              {(skill as any).keyPoints?.length ? (
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {(skill as any).keyPoints.slice(0, 5).map((kp: string, i: number) => (
                    <li key={i}>{kp}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="flex gap-2 flex-wrap">
            {(["working_on", "consistent", "needs_help"] as SkillStatus[]).map((status) => {
              const Icon = statusIcons[status];
              const isSelected = currentStatus === status;
              return (
                <Button
                  key={status}
                  size="sm"
                  variant={isSelected ? "default" : "outline"}
                  className={isSelected ? "" : ""}
                  onClick={() => onUpdateProgress(skill.id, status, notes)}
                  data-testid={`button-status-${status}-${skill.id}`}
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {skillStatusDisplayNames[status]}
                </Button>
              );
            })}
          </div>
          {linkedDrills.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Drills to help with this skill</div>
              <div className="space-y-2">
                {linkedDrills.slice(0, 5).map((d) => (
                  <div key={d.id} className="rounded-md border p-2">
                    <div className="text-sm font-semibold">{d.name}</div>
                    <div className="text-xs text-muted-foreground">{d.purpose}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Textarea
            placeholder="Add notes about this skill..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="text-sm resize-none"
            rows={2}
            data-testid={`input-notes-${skill.id}`}
          />
          {notes !== (progress?.notes || "") && (
            <Button
              size="sm"
              onClick={() => onUpdateProgress(skill.id, currentStatus || "working_on", notes)}
              data-testid={`button-save-notes-${skill.id}`}
            >
              Save Notes
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function SkillsPage() {
  const [selectedSport, setSelectedSport] = useState<SportType>("gymnastics");
  const [selectedLevel, setSelectedLevel] = useState<number | "all">("all");
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: skills = [], isLoading: skillsLoading } = useQuery<Skill[]>({
    queryKey: ["/api/skills"],
  });

  const { data: athletes = [] } = useQuery<Athlete[]>({
    queryKey: ["/api/athletes"],
  });

  const selectedAthlete = athletes.find(a => a.id === selectedAthleteId) || null;

  const { data: athleteProgress = [] } = useQuery<SkillProgress[]>({
    queryKey: ["/api/athletes", selectedAthleteId, "skills"],
    enabled: !!selectedAthleteId,
  });

  const updateProgressMutation = useMutation({
    mutationFn: async (data: { athleteId: string; skillId: string; status: SkillStatus; notes?: string }) => {
      const res = await apiRequest("POST", `/api/athletes/${data.athleteId}/skills`, {
        skillId: data.skillId,
        status: data.status,
        notes: data.notes,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/athletes", selectedAthleteId, "skills"] });
      toast({
        title: "Progress Updated",
        description: "Skill status has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update skill progress.",
        variant: "destructive",
      });
    },
  });

  const handleUpdateProgress = (skillId: string, status: SkillStatus, notes?: string) => {
    if (!selectedAthleteId) return;
    updateProgressMutation.mutate({
      athleteId: selectedAthleteId,
      skillId,
      status,
      notes,
    });
  };

  const filteredSkills = skills.filter(skill => {
    if (skill.sport !== selectedSport) return false;
    if (selectedLevel !== "all" && skill.level !== selectedLevel) return false;
    return true;
  });

  const progressMap = new Map(athleteProgress.map(p => [p.skillId, p]));

  const levels = [3, 4, 5, 6, 7, 8, 9, 10];
  const sports: SportType[] = ["gymnastics"];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between gap-2 p-3">
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/">
              <Button size="icon" variant="ghost" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold truncate">Skills Library</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="p-3 space-y-4 pb-20">
        <div className="space-y-3">
          <Select
            value={selectedAthleteId || "none"}
            onValueChange={(val) => setSelectedAthleteId(val === "none" ? null : val)}
          >
            <SelectTrigger data-testid="select-athlete">
              <SelectValue placeholder="Select an athlete to track progress" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No athlete selected</SelectItem>
              {athletes.map((athlete) => (
                <SelectItem key={athlete.id} value={athlete.id}>
                  {athlete.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tabs value={selectedSport} onValueChange={(val) => setSelectedSport(val as SportType)}>
            <TabsList className="w-full grid grid-cols-1">
              {sports.map((sport) => {
                const Icon = sportIcons[sport];
                return (
                  <TabsTrigger 
                    key={sport} 
                    value={sport}
                    className="flex items-center gap-1 text-xs sm:text-sm"
                    data-testid={`tab-sport-${sport}`}
                  >
                    <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">{sportLabels[sport]}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          <Select
            value={selectedLevel === "all" ? "all" : String(selectedLevel)}
            onValueChange={(val) => setSelectedLevel(val === "all" ? "all" : parseInt(val))}
          >
            <SelectTrigger data-testid="select-level">
              <SelectValue placeholder="Filter by level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {levels.map((level) => (
                <SelectItem key={level} value={String(level)}>
                  Level {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedAthlete && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-3">
              <p className="text-sm">
                Tracking progress for <span className="font-semibold">{selectedAthlete.name}</span>. 
                Tap a skill to set its status.
              </p>
            </CardContent>
          </Card>
        )}

        {skillsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-5 bg-muted rounded w-1/3" />
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="h-4 bg-muted rounded w-1/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredSkills.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No skills found for this sport and level.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredSkills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                progress={progressMap.get(skill.id)}
                selectedAthlete={selectedAthlete}
                onUpdateProgress={handleUpdateProgress}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
