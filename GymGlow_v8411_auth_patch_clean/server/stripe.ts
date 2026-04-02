import Stripe from "stripe";

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY in environment");
  }

  // Stripe API version pinned for stability.
  return new Stripe(key, {
    apiVersion: "2024-06-20" as any,
  });
}

export type PaidPlan = "coach" | "competition";

export function getPriceIdForPlan(plan: PaidPlan): string {
  if (plan === "coach") {
    const id = process.env.STRIPE_PRICE_COACH;
    if (!id) throw new Error("Missing STRIPE_PRICE_COACH in environment");
    return id;
  }
  const id = process.env.STRIPE_PRICE_COMPETITION;
  if (!id) throw new Error("Missing STRIPE_PRICE_COMPETITION in environment");
  return id;
}

export function planFromPriceId(priceId: string): "coach" | "competition" | "none" {
  const coach = process.env.STRIPE_PRICE_COACH;
  const comp = process.env.STRIPE_PRICE_COMPETITION;
  if (coach && priceId === coach) return "coach";
  if (comp && priceId === comp) return "competition";
  return "none";
}
