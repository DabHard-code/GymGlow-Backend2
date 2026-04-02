import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type Plan = "coach" | "competition";

export function PlanRequiredDialog({
  open,
  onOpenChange,
  message,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message?: string;
}) {
  const [loading, setLoading] = useState<Plan | null>(null);

  async function startCheckout(plan: Plan) {
    try {
      setLoading(plan);
      const res = await apiRequest("POST", "/api/billing/checkout-session", { plan });
      const data = await res.json();
      if (!data?.url) throw new Error("Missing checkout URL");
      window.location.href = data.url;
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Choose a plan to continue</AlertDialogTitle>
          <AlertDialogDescription>
            {message ??
              "This feature requires an active GymGlow plan. Coach Mode unlocks AI analysis + challenges. Competition Mode adds spotlight features and elite badges."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-3 mt-2">
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Coach Mode</div>
                <div className="text-sm text-muted-foreground">
                  AI analysis, weekly challenges, badges, leaderboard participation
                </div>
              </div>
              <Button
                onClick={() => startCheckout("coach")}
                disabled={loading !== null}
                data-testid="choose-plan-coach"
              >
                {loading === "coach" ? "Setting..." : "$10/mo"}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Competition Mode</div>
                <div className="text-sm text-muted-foreground">
                  Everything in Coach + spotlight eligibility + Crimson badges
                </div>
              </div>
              <Button
                onClick={() => startCheckout("competition")}
                disabled={loading !== null}
                data-testid="choose-plan-competition"
              >
                {loading === "competition" ? "Setting..." : "$15/mo"}
              </Button>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel data-testid="plan-cancel">Not now</AlertDialogCancel>
          <AlertDialogAction asChild>
            <a href="/auth">
              <Button variant="ghost">Account</Button>
            </a>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
