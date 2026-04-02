import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function BillingSuccessPage() {
  const [status, setStatus] = useState<string>("Finalizing your subscription...");

  useEffect(() => {
    // Give Stripe webhook a moment in dev/prod, then refresh user state.
    const t = setTimeout(async () => {
      try {
        const res = await apiRequest("GET", "/api/users/me");
        const data = await res.json();
        if (data?.plan && data.plan !== "none") {
          setStatus(`You're all set! Plan: ${data.plan}`);
        } else {
          setStatus("Payment received. Syncing your plan... (If this doesn't update, refresh in a moment.)");
        }
      } catch {
        setStatus("Payment received. Please refresh the app.");
      }
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="max-w-xl mx-auto p-6">
      <div className="text-2xl font-semibold">✅ Subscription successful</div>
      <p className="mt-2 text-muted-foreground">{status}</p>

      <div className="mt-6 flex gap-3">
        <Link href="/">
          <Button>Go to Home</Button>
        </Link>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </div>
    </div>
  );
}
