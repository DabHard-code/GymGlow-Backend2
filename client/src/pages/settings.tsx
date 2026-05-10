import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, CreditCard, LogOut, Plus, Save, Settings, Trash2, UserRound } from "lucide-react";

import { supabase } from "@/supabase";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";

import { type Athlete, type SportProfile, sportTypes, gymnasticsLevels, type SportType } from "@shared/schema";

type MeResponse = {
  id: string;
  username: string;
  plan: "none" | "coach" | "competition";
  trialCredits: number;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: me } = useQuery<MeResponse>({ queryKey: ["/api/users/me"] });
  const { data: athletes = [] } = useQuery<Athlete[]>({ queryKey: ["/api/athletes"] });

  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const selectedAthlete = useMemo(
    () => athletes.find(a => a.id === selectedAthleteId) ?? athletes[0] ?? null,
    [athletes, selectedAthleteId]
  );

  const { data: profiles = [] } = useQuery<SportProfile[]>({
    queryKey: selectedAthlete ? ["/api/athletes", selectedAthlete.id, "profiles"] : ["/api/athletes", "none", "profiles"],
    enabled: !!selectedAthlete,
  });

  // ---------- Billing ----------
  const checkoutMutation = useMutation({
    mutationFn: async (plan: "coach" | "competition") => {
      const res = await apiRequest("POST", "/api/billing/checkout-session", { plan });
      return res.json() as Promise<{ url: string }>;
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (err: any) => toast({ title: "Checkout failed", description: String(err?.message ?? err) }),
  });

 const portalMutation = useMutation({
  mutationFn: async () => {
    const res = await apiRequest("POST", "/api/billing/portal-session", {});
    return res.json() as Promise<{ url: string }>;
  },
  onSuccess: (data) => {
    window.location.href = data.url;
  },
  onError: (err: any) =>
    toast({ title: "Portal failed", description: String(err?.message ?? err) }),
});

  // ---------- Account ----------
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const logout = async () => {
    await supabase.auth.signOut();
    setLocation("/auth");
  };

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/users/me", {
        confirmation: deleteConfirmation,
      });
      return res.json();
    },
    onSuccess: async () => {
      queryClient.clear();
      await supabase.auth.signOut();
      toast({
        title: "Account deleted",
        description: "Your GymGlow account and app data have been deleted.",
      });
      setLocation("/auth");
    },
    onError: (err: any) => {
      toast({
        title: "Account deletion failed",
        description: String(err?.message ?? err),
        variant: "destructive",
      });
    },
  });

  // ---------- Athlete editing ----------
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");

  const updateAthleteMutation = useMutation({
    mutationFn: async (payload: { athleteId: string; name: string; avatarUrl?: string }) => {
      const res = await apiRequest("PUT", `/api/athletes/${payload.athleteId}`, {
        name: payload.name,
        avatarUrl: payload.avatarUrl || undefined,
      });
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/athletes"] });
      toast({ title: "Saved", description: "Athlete updated." });
      setEditOpen(false);
    },
    onError: (err: any) => toast({ title: "Save failed", description: String(err?.message ?? err) }),
  });

  // ---------- Profile management ----------
  const [addProfileOpen, setAddProfileOpen] = useState(false);
  const [newSport, setNewSport] = useState<SportType>("gymnastics");
  const [newLevel, setNewLevel] = useState<string>(gymnasticsLevels[2] ?? "Level 3");

  const createProfileMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAthlete) throw new Error("No athlete selected");
      const res = await apiRequest("POST", "/api/profiles", {
        athleteId: selectedAthlete.id,
        sport: newSport,
        level: newLevel,
        metadata: undefined,
      });
      return res.json();
    },
    onSuccess: async () => {
      if (selectedAthlete) {
        await queryClient.invalidateQueries({ queryKey: ["/api/athletes", selectedAthlete.id, "profiles"] });
      }
      toast({ title: "Added", description: "Profile created." });
      setAddProfileOpen(false);
    },
    onError: (err: any) => toast({ title: "Add failed", description: String(err?.message ?? err) }),
  });

  const deleteProfileMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const res = await apiRequest("DELETE", `/api/profiles/${profileId}`);
      return res.json();
    },
    onSuccess: async () => {
      if (selectedAthlete) {
        await queryClient.invalidateQueries({ queryKey: ["/api/athletes", selectedAthlete.id, "profiles"] });
      }
      toast({ title: "Removed", description: "Profile deleted." });
    },
    onError: (err: any) => toast({ title: "Delete failed", description: String(err?.message ?? err) }),
  });

  // keep edit fields in sync when opening
  const openEdit = () => {
    if (!selectedAthlete) return;
    setEditName(selectedAthlete.name);
    setEditAvatarUrl(selectedAthlete.avatarUrl ?? "");
    setEditOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="h-16 border-b sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="h-full max-w-screen-lg mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="ghost" size="icon" aria-label="Back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <span className="font-display font-bold text-xl">Settings</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-screen-lg mx-auto px-4 py-8 space-y-6">
        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="h-5 w-5" />
              Account
            </CardTitle>
            <CardDescription>Your login + account actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Username</Label>
                <div className="mt-1 text-sm">{me?.username ?? "—"}</div>
              </div>
              <div>
                <Label>User ID</Label>
                <div className="mt-1 text-sm break-all">{me?.id ?? "—"}</div>
              </div>
            </div>

            <Separator />

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Log out
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Account
            </CardTitle>
            <CardDescription>
              Permanently delete your GymGlow account, athlete profiles, results, badges, and app activity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Uploaded videos are already temporary and are not retained after processing. This action removes your saved account data and cannot be undone.
            </p>

            <AlertDialog open={deleteAccountOpen} onOpenChange={(open) => {
              setDeleteAccountOpen(open);
              if (!open) setDeleteConfirmation("");
            }}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" data-testid="button-delete-account">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your GymGlow account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes your athlete profiles, analyses, session history, badges, challenge submissions, and competition points. Active billing is cancelled when possible, but payment records may remain with the payment processor where required by law.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-2">
                  <Label htmlFor="delete-confirmation">Type DELETE MY ACCOUNT to confirm</Label>
                  <Input
                    id="delete-confirmation"
                    value={deleteConfirmation}
                    onChange={(event) => setDeleteConfirmation(event.target.value)}
                    autoComplete="off"
                    data-testid="input-delete-account-confirmation"
                  />
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleteAccountMutation.isPending}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={deleteConfirmation !== "DELETE MY ACCOUNT" || deleteAccountMutation.isPending}
                    onClick={(event) => {
                      event.preventDefault();
                      deleteAccountMutation.mutate();
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-testid="button-confirm-delete-account"
                  >
                    Delete account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Subscription */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <CreditCard className="h-5 w-5" />
      Subscription & Billing
    </CardTitle>
    <CardDescription>Manage your plan and billing.</CardDescription>
  </CardHeader>

  <CardContent className="space-y-4">
    <div className="grid sm:grid-cols-3 gap-4 text-sm">
      <div>
        <div className="text-muted-foreground">Current plan</div>
        <div className="font-medium">{me?.plan ?? "—"}</div>
      </div>
      <div>
        <div className="text-muted-foreground">Status</div>
        <div className="font-medium">{me?.subscriptionStatus ?? "—"}</div>
      </div>
      <div>
        <div className="text-muted-foreground">Next renewal</div>
        <div className="font-medium">{formatDate(me?.currentPeriodEnd ?? null)}</div>
      </div>
    </div>

    <Separator />

    <div className="flex flex-wrap gap-2">
      <Dialog>
        <DialogTrigger asChild>
          <Button>Upgrade</Button>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose a plan</DialogTitle>
            <DialogDescription>
              Coach unlocks coaching tools. Competition unlocks competition mode + premium features.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Button
              className="w-full"
              variant="outline"
              disabled={checkoutMutation.isPending}
              onClick={() => checkoutMutation.mutate("coach")}
            >
              Upgrade to Coach
            </Button>

            <Button
              className="w-full"
              disabled={checkoutMutation.isPending}
              onClick={() => checkoutMutation.mutate("competition")}
            >
              Upgrade to Competition
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Button
  variant="outline"
  disabled={portalMutation.isPending}
  onClick={() => portalMutation.mutate()}
>
  Manage billing
</Button>
    </div>
  </CardContent>
</Card>

        {/* Athletes + Profiles */}
        <Card>
          <CardHeader>
            <CardTitle>Athletes & Profiles</CardTitle>
            <CardDescription>Edit athletes and manage their sport profiles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Select athlete</Label>
                <Select
                  value={selectedAthlete?.id ?? ""}
                  onValueChange={(v) => setSelectedAthleteId(v)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select athlete" />
                  </SelectTrigger>
                  <SelectContent>
                    {athletes.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end gap-2">
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={!selectedAthlete}
                  onClick={openEdit}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Edit athlete
                </Button>

                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit athlete</DialogTitle>
                      <DialogDescription>Update name and avatar URL.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                      <div>
                        <Label>Name</Label>
                        <Input className="mt-1" value={editName} onChange={(e) => setEditName(e.target.value)} />
                      </div>
                      <div>
                        <Label>Avatar URL (optional)</Label>
                        <Input className="mt-1" value={editAvatarUrl} onChange={(e) => setEditAvatarUrl(e.target.value)} />
                      </div>

                      <Button
                        disabled={!selectedAthlete || updateAthleteMutation.isPending}
                        onClick={() => {
                          if (!selectedAthlete) return;
                          updateAthleteMutation.mutate({
                            athleteId: selectedAthlete.id,
                            name: editName.trim(),
                            avatarUrl: editAvatarUrl.trim() || undefined,
                          });
                        }}
                      >
                        Save changes
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Profiles</div>
                <div className="text-sm text-muted-foreground">Sport + level attached to this athlete</div>
              </div>

              <Dialog open={addProfileOpen} onOpenChange={setAddProfileOpen}>
                <DialogTrigger asChild>
                  <Button disabled={!selectedAthlete}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add profile
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add sport profile</DialogTitle>
                    <DialogDescription>GymGlow v1 uses gymnastics, but this is ready for multi-sport.</DialogDescription>
                  </DialogHeader>

                  <div className="space-y-3">
                    <div>
                      <Label>Sport</Label>
                      <Select value={newSport} onValueChange={(v) => setNewSport(v as SportType)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {sportTypes.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Level</Label>
                      <Select value={newLevel} onValueChange={setNewLevel}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {gymnasticsLevels.map((lvl) => (
                            <SelectItem key={lvl} value={lvl}>
                              {lvl}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button disabled={createProfileMutation.isPending} onClick={() => createProfileMutation.mutate()}>
                      Create profile
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {profiles.length === 0 ? (
              <div className="text-sm text-muted-foreground">No profiles yet.</div>
            ) : (
              <div className="space-y-2">
                {profiles.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="text-sm">
                      <div className="font-medium">{p.sport}</div>
                      <div className="text-muted-foreground">{p.level}</div>
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => deleteProfileMutation.mutate(p.id)}
                      disabled={deleteProfileMutation.isPending}
                      aria-label="Delete profile"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Light/dark + placeholders for later.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="font-medium">Theme</div>
                <div className="text-muted-foreground">Toggle light/dark</div>
              </div>
              <ThemeToggle />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <div className="font-medium">Notifications</div>
                <div className="text-muted-foreground">Coming soon</div>
              </div>
              <Button asChild variant="outline">
  <Link href="/notification-settings">Manage</Link>
</Button>
            </div>


          </CardContent>
        </Card>

        {/* Support */}
        <Card>
          <CardHeader>
            <CardTitle>Support</CardTitle>
            <CardDescription>Help, feedback, legal links.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
  <Button
    variant="outline"
    onClick={() => (window.location.href = "mailto:support@gymglow.app?subject=GymGlow%20Bug%20Report")}
  >
    Report a bug
  </Button>

  <Button asChild variant="outline">
    <Link href="/terms">Terms</Link>
  </Button>

  <Button asChild variant="outline">
    <Link href="/privacy">Privacy</Link>
  </Button>

</CardContent>
        </Card>
      </main>
    </div>
  );
}
