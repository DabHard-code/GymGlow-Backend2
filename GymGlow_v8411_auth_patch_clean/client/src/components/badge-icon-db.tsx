import React from "react";
import {
  Award,
  Eye,
  Target,
  Shield,
  Star,
  Crown,
  Trophy,
  Flame,
  Zap,
  Hammer,
  ArrowUp,
  Feather,
  Leaf,
  Waves,
  Dumbbell,
  Scale,
  Footprints,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DbTier = "common" | "rare" | "epic" | "legendary" | "crimson";

const tierBorder: Record<DbTier, string> = {
  common: "border-zinc-300 dark:border-zinc-700",
  rare: "border-sky-400",
  epic: "border-yellow-400",
  legendary: "border-purple-500",
  crimson: "border-red-600",
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  eye: Eye,
  target: Target,
  shield: Shield,
  star: Star,
  crown: Crown,
  trophy: Trophy,
  flame: Flame,
  bolt: Zap,
  hammer: Hammer,
  "arrow-up": ArrowUp,
  feather: Feather,
  leaf: Leaf,
  wave: Waves,
  balance: Scale,
  bar: Dumbbell,
  arm: Dumbbell,
  core: Shield,
  boot: Footprints,
  spark: Star,
};

export function BadgeIconDb({
  tier,
  icon,
  size = "md",
}: {
  tier: DbTier;
  icon?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = (icon ? iconMap[String(icon).toLowerCase()] : null) || Award;

  const sizeClasses = {
    sm: "h-6 w-6 p-1",
    md: "h-10 w-10 p-2",
    lg: "h-14 w-14 p-3",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center",
        "border-2 shadow-sm",
        tierBorder[tier],
        sizeClasses[size],
      )}
    >
      <Icon className={cn(iconSizes[size], "text-primary")} />
    </div>
  );
}
