import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import {
  Plus, Zap, User, Sparkles, Music, Trophy, Heart, Trash2, Pencil,
  Award, BookOpen, Star, ListChecks, MessageSquare, Medal, Settings
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AthleteBadgeCollection, BadgeShowcase } from "@/components/badge-display";
import { OnboardingCarousel, useOnboarding } from "@/components/onboarding";
import { FeedbackDialog } from "@/components/feedback-dialog";
import { CompWeekCallout } from "@/components/comp-week-callout";
import WelcomeChallengeCard from "@/components/welcome-challenge";
import { useToast } from "@/hooks/use-toast";
import { 
  type Athlete, type SportProfile, sportDisplayNames, sportTypes, skillLevels, 
  type SportType, type SkillLevel, gymnasticsLevels, danceStyles, danceLevels,
  type DanceStyle, type DanceLevel, type DanceMetadata, getLevelDisplayForSport
} from "@shared/schema";

const sportIcons: Record<SportType, typeof Sparkles> = {
  gymnastics: Sparkles,
  dance: Music,
  cheer: Star,
  lifting: Trophy,
  yoga: Heart,
};

const availableSports: SportType[] = ["gymnastics"]; // GymGlow v1: gymnastics only

function AthleteCard({ athlete }: { athlete: Athlete }) {
  const { data: profiles = [] } = useQuery<SportProfile[]>({
    queryKey: ["/api/athletes", athlete.id, "profiles"],
  });
  const primaryProfileId = profiles[0]?.id;

  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [newSport, setNewSport] = useState<SportType>("gymnastics");
  const [newLevel, setNewLevel] = useState<string>("Level 1");
  const [newDanceStyle, setNewDanceStyle] = useState<DanceStyle>("Ballet");
  const [newDanceLevel, setNewDanceLevel] = useState<DanceLevel>("Beginner");

  const [editingProfile, setEditingProfile] = useState<SportProfile | null>(null);
  const [editLevel, setEditLevel] = useState<string>("");
  const [editDanceStyle, setEditDanceStyle] = useState<DanceStyle>("Ballet");
  const [editDanceLevel, setEditDanceLevel] = useState<DanceLevel>("Beginner");

  const addProfileMutation = useMutation({
    mutationFn: async (data: { athleteId: string; sport: SportType; level: string; metadata?: unknown }) => {
      const res = await apiRequest("POST", "/api/profiles", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/athletes", athlete.id, "profiles"] });
      setIsAddingProfile(false);
    },
  });

  const deleteAthleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/athletes/${athlete.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/athletes"] });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { id: string; level: string; metadata?: unknown }) => {
      const res = await apiRequest("PATCH", `/api/profiles/${data.id}`, {
        level: data.level,
        metadata: data.metadata,
      });
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/athletes", athlete.id, "profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", variables.id] });
      setEditingProfile(null);
    },
  });

  const openEditDialog = (profile: SportProfile) => {
    setEditingProfile(profile);
    setEditLevel(profile.level);
    if (profile.sport === "dance" && profile.metadata) {
      const meta = profile.metadata as DanceMetadata;
      setEditDanceStyle(meta.style);
      setEditDanceLevel(meta.level);
    } else if (profile.sport === "dance") {
      setEditDanceStyle("Ballet");
      setEditDanceLevel("Beginner");
    }
  };

  const handleUpdateProfile = () => {
    if (!editingProfile) return;

    let level = editLevel;
    let metadata = editingProfile.metadata;

    if (editingProfile.sport === "dance") {
      level = editDanceLevel;
      metadata = { style: editDanceStyle, level: editDanceLevel };
    }

    updateProfileMutation.mutate({
      id: editingProfile.id,
      level,
      metadata,
    });
  };

  const handleAddProfile = () => {
    let level = newLevel;
    let metadata = null;

    if (newSport === "dance") {
      level = newDanceLevel;
      metadata = { style: newDanceStyle, level: newDanceLevel };
    } else if (newSport === "gymnastics") {
      level = newLevel;
    } else {
      level = newLevel;
    }

    addProfileMutation.mutate({
      athleteId: athlete.id,
      sport: newSport,
      level,
      metadata,
    });
  };

  const handleSportChange = (sport: SportType) => {
    setNewSport(sport);
    if (sport === "gymnastics") {
      setNewLevel("Level 1");
    } else if (sport === "dance") {
      setNewDanceStyle("Ballet");
      setNewDanceLevel("Beginner");
    } else {
      setNewLevel("beginner");
    }
  };

  return (
    <Card className="overflow-visible" data-testid={`card-athlete-${athlete.id}`}>
      <CardHeader className="flex flex-row items-center gap-3 pb-3">
        <Avatar>
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
            {athlete.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <CardTitle className="text-lg truncate">{athlete.name}</CardTitle>
          {athlete.publicDisplayName && (
            <p className="text-xs text-muted-foreground truncate">
              Leaderboard: {athlete.publicDisplayName}
            </p>
          )}
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground"
              data-testid={`button-delete-athlete-${athlete.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {athlete.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this athlete and all their sport profiles. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteAthleteMutation.mutate()}
                className="bg-destructive text-destructive-foreground"
                data-testid="button-confirm-delete"
              >
                {deleteAthleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardHeader>
      <CardContent className="space-y-3">
        {profiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sport profiles yet</p>
        ) : (
          <div className="flex flex-col gap-2">
            {profiles.map((profile) => {
              const Icon = sportIcons[profile.sport as SportType] || Sparkles;
              return (
                <div key={profile.id} className="flex items-center gap-2">
                  <Link href={`/profile/${profile.id}`} className="flex-1">
                    <div 
                      className="flex items-center gap-3 p-3 rounded-md bg-muted/50 hover-elevate cursor-pointer"
                      data-testid={`link-profile-${profile.id}`}
                    >
                      <div className="p-2 rounded-md bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {sportDisplayNames[profile.sport as SportType]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getLevelDisplayForSport(profile.sport as SportType, profile.level, profile.metadata)}
                        </p>
                      </div>
                    </div>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(profile)}
                    data-testid={`button-edit-profile-${profile.id}`}
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1" data-testid={`athlete-badges-${athlete.id}`}>
          <Award className="h-4 w-4 text-muted-foreground" />
          <AthleteBadgeCollection athleteId={athlete.id} />
          <div className="flex-1" />
          <BadgeShowcase athleteId={athlete.id} athleteName={athlete.name} />
        </div>

        <CompWeekCallout profileId={primaryProfileId} compact showWhenInactive={false} />


        <Link href={`/meet-scores/${athlete.id}`}>
          <Button variant="outline" size="sm" className="w-full" data-testid={`button-meet-scores-${athlete.id}`}>
            <Trophy className="h-4 w-4 mr-2" />
            Meet Scores
          </Button>
        </Link>

        <Link href={`/competition-results/${athlete.id}`}>
          <Button variant="outline" size="sm" className="w-full" data-testid={`button-competition-results-${athlete.id}`}>
            <Trophy className="h-4 w-4 mr-2" />
            End of Week Results
          </Button>
        </Link>

        <Link href={`/badges/${athlete.id}`}>
          <Button variant="outline" size="sm" className="w-full" data-testid={`button-badges-${athlete.id}`}>
            <Award className="h-4 w-4 mr-2" />
            View All Badges
          </Button>
        </Link>

        <Dialog open={isAddingProfile} onOpenChange={setIsAddingProfile}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full" data-testid={`button-add-profile-${athlete.id}`}>
              <Plus className="h-4 w-4 mr-2" />
              Add Sport Profile
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Sport Profile for {athlete.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Sport</Label>
                <Select value={newSport} onValueChange={(v) => handleSportChange(v as SportType)}>
                  <SelectTrigger data-testid="select-sport">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSports.map((sport) => (
                      <SelectItem key={sport} value={sport}>
                        {sportDisplayNames[sport]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {newSport === "gymnastics" && (
                <div className="space-y-2">
                  <Label>USAG Level</Label>
                  <Select value={newLevel} onValueChange={setNewLevel}>
                    <SelectTrigger data-testid="select-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {gymnasticsLevels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {newSport === "dance" && (
                <>
                  <div className="space-y-2">
                    <Label>Dance Style</Label>
                    <Select value={newDanceStyle} onValueChange={(v) => setNewDanceStyle(v as DanceStyle)}>
                      <SelectTrigger data-testid="select-dance-style">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {danceStyles.map((style) => (
                          <SelectItem key={style} value={style}>
                            {style}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Skill Level</Label>
                    <Select value={newDanceLevel} onValueChange={(v) => setNewDanceLevel(v as DanceLevel)}>
                      <SelectTrigger data-testid="select-dance-level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {danceLevels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {(newSport === "lifting" || newSport === "yoga") && (
                <div className="space-y-2">
                  <Label>Skill Level</Label>
                  <Select value={newLevel} onValueChange={setNewLevel}>
                    <SelectTrigger data-testid="select-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {skillLevels.map((level) => (
                        <SelectItem key={level} value={level} className="capitalize">
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button 
                onClick={handleAddProfile} 
                className="w-full"
                disabled={addProfileMutation.isPending}
                data-testid="button-save-profile"
              >
                {addProfileMutation.isPending ? "Adding..." : "Add Profile"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingProfile} onOpenChange={(open) => !open && setEditingProfile(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Edit {editingProfile ? sportDisplayNames[editingProfile.sport as SportType] : ""} Profile
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {editingProfile?.sport === "gymnastics" && (
                <div className="space-y-2">
                  <Label>USAG Level</Label>
                  <Select value={editLevel} onValueChange={setEditLevel}>
                    <SelectTrigger data-testid="select-edit-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {gymnasticsLevels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {editingProfile?.sport === "dance" && (
                <>
                  <div className="space-y-2">
                    <Label>Dance Style</Label>
                    <Select value={editDanceStyle} onValueChange={(v) => setEditDanceStyle(v as DanceStyle)}>
                      <SelectTrigger data-testid="select-edit-dance-style">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {danceStyles.map((style) => (
                          <SelectItem key={style} value={style}>
                            {style}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Skill Level</Label>
                    <Select value={editDanceLevel} onValueChange={(v) => setEditDanceLevel(v as DanceLevel)}>
                      <SelectTrigger data-testid="select-edit-dance-level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {danceLevels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {(editingProfile?.sport === "lifting" || editingProfile?.sport === "yoga") && (
                <div className="space-y-2">
                  <Label>Skill Level</Label>
                  <Select value={editLevel} onValueChange={setEditLevel}>
                    <SelectTrigger data-testid="select-edit-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {skillLevels.map((level) => (
                        <SelectItem key={level} value={level} className="capitalize">
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button 
                onClick={handleUpdateProfile} 
                className="w-full"
                disabled={updateProfileMutation.isPending}
                data-testid="button-update-profile"
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function AddAthleteCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");

  const addAthleteMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await apiRequest("POST", "/api/athletes", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/athletes"] });
      setIsOpen(false);
      setName("");
    },
  });

  const handleAdd = () => {
    if (name.trim()) {
      addAthleteMutation.mutate({ name: name.trim() });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Card className="border-dashed hover-elevate cursor-pointer min-h-[200px] flex items-center justify-center" data-testid="card-add-athlete">
          <CardContent className="flex flex-col items-center gap-2 py-8">
            <div className="p-3 rounded-full bg-muted">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Add Athlete</p>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Athlete</DialogTitle>
          <DialogDescription>
            Athlete names are private to your account. Public leaderboards use a safe alias that you can edit in Settings.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Private athlete name</Label>
            <Input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First name or nickname"
              data-testid="input-athlete-name"
            />
            <p className="text-xs text-muted-foreground">
              This name is not shown on public rankings.
            </p>
          </div>
          <Button 
            onClick={handleAdd} 
            className="w-full"
            disabled={!name.trim() || addAthleteMutation.isPending}
            data-testid="button-save-athlete"
          >
            {addAthleteMutation.isPending ? "Adding..." : "Add Athlete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Home() {
  const { data: athletes = [], isLoading } = useQuery<Athlete[]>({
    queryKey: ["/api/athletes"],
  });

  const { showOnboarding, completeOnboarding } = useOnboarding();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {showOnboarding && <OnboardingCarousel onComplete={completeOnboarding} />}

      <header className="h-16 border-b flex-shrink-0 sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="h-full max-w-screen-2xl mx-auto px-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl" data-testid="text-brand">
              GymGlow
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/challenges">
              <Button variant="outline" size="icon" className="sm:w-auto sm:px-3" data-testid="button-challenges">
                <Trophy className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Challenges</span>
              </Button>
            </Link>
            <Link href="/leaderboard">
              <Button variant="outline" size="icon" className="sm:w-auto sm:px-3" data-testid="button-leaderboard">
                <Medal className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Leaderboard</span>
              </Button>
            </Link>
            <Link href="/drills">
              <Button variant="outline" size="icon" className="sm:w-auto sm:px-3" data-testid="button-drill-library">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Drills</span>
              </Button>
            </Link>
            <Link href="/skills">
              <Button variant="outline" size="icon" className="sm:w-auto sm:px-3" data-testid="button-skills-library">
                <ListChecks className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Skills</span>
              </Button>
            </Link>
            <Link href="/settings">
  <Button
    variant="outline"
    size="icon"
    className="sm:w-auto sm:px-3"
    data-testid="button-settings"
  >
    <Settings className="h-4 w-4" />
    <span className="hidden sm:inline ml-2">Settings</span>
  </Button>
</Link>

<ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 py-8 px-4">
        <div className="max-w-screen-xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold mb-2" data-testid="text-page-title">
              Your Athletes
            </h1>
            <p className="text-muted-foreground">
              Select an athlete and sport profile to start analyzing form
            </p>
          </div>

          <div className="mb-6">
            <WelcomeChallengeCard />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="flex flex-row items-center gap-3 pb-3">
                    <div className="h-10 w-10 rounded-full bg-muted" />
                    <div className="h-5 w-24 bg-muted rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-16 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {athletes.map((athlete) => (
                <AthleteCard key={athlete.id} athlete={athlete} />
              ))}
              <AddAthleteCard />
            </div>
          )}
        </div>
      </main>

      <footer className="border-t py-4 flex-shrink-0">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FeedbackDialog />
              <span className="text-xs text-muted-foreground" data-testid="text-version">
                GymGlow v1.0
              </span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Powered by AI vision technology. Your videos are analyzed securely and not stored.
            </p>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            More features rolling out soon!
          </p>
        </div>
      </footer>
    </div>
  );
}
