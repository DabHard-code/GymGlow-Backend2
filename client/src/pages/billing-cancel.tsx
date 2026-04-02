import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function BillingCancelPage() {
  return (
    <div className="max-w-xl mx-auto p-6">
      <div className="text-2xl font-semibold">Payment canceled</div>
      <p className="mt-2 text-muted-foreground">
        No worries — you can upgrade any time when you're ready.
      </p>

      <div className="mt-6 flex gap-3">
        <Link href="/">
          <Button>Go to Home</Button>
        </Link>
        <Link href="/auth">
          <Button variant="outline">Account</Button>
        </Link>
      </div>
    </div>
  );
}
