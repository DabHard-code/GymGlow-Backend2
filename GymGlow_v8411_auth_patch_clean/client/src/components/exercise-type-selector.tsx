import { Sparkles, Music, Trophy, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SportType } from "@shared/schema";
import { sportDisplayNames } from "@shared/schema";

interface ExerciseTypeSelectorProps {
  selected: SportType;
  onSelect: (type: SportType) => void;
  disabled?: boolean;
}

const exerciseOptions: { type: SportType; label: string; icon: typeof Sparkles }[] = [
  { type: "gymnastics", label: "Gymnastics", icon: Sparkles },
  { type: "dance", label: "Dance", icon: Music },
  { type: "lifting", label: "Weightlifting", icon: Trophy },
  { type: "yoga", label: "Yoga", icon: Heart },
];

export function ExerciseTypeSelector({ selected, onSelect, disabled }: ExerciseTypeSelectorProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3" data-testid="exercise-type-selector">
      {exerciseOptions.map(({ type, label, icon: Icon }) => (
        <button
          key={type}
          onClick={() => onSelect(type)}
          disabled={disabled}
          data-testid={`button-exercise-${type}`}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-200",
            "border",
            selected === type
              ? "bg-primary text-primary-foreground border-primary-border"
              : "bg-card text-card-foreground border-card-border hover-elevate",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
