import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Ruler, Shield, Scale, Star, TrendingUp, Zap, Wind, Target, Timer, Sparkles, Award, Share2, Copy, Check
} from "lucide-react";
import { badgeInfo, badgeTierColors, badgeTierDisplayNames, type BadgeType, type EarnedBadge } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Ruler,
  Shield,
  Scale,
  Star,
  TrendingUp,
  Zap,
  Wind,
  Target,
  Timer,
  Sparkles,
};

function getBadgeInfoSafe(badgeType: BadgeType | string | undefined) {
  const key = badgeType as BadgeType;
  const fallback = {
    name: String(badgeType || "Badge").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    description: "Badge earned in GymGlow.",
    icon: "Award",
    rarity: "common" as keyof typeof badgeTierDisplayNames,
  };

  if (!badgeType) return fallback;

  return (badgeInfo as Record<string, any>)[key] || fallback;
}


interface BadgeIconProps {
  badgeType: BadgeType;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

export function BadgeIcon({ badgeType, size = "md", showTooltip = true }: BadgeIconProps) {
  const info = getBadgeInfoSafe(badgeType);
  const Icon = iconMap[info.icon] || Award;
  const tierBorder = (badgeTierColors as Record<string, string>)[info.rarity] || badgeTierColors.common || "border-gray-300";
  
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

  const badge = (
    <div 
      className={cn(
        "rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center",
        "border-2 shadow-sm",
        tierBorder,
        sizeClasses[size]
      )}
      data-testid={`badge-icon-${badgeType}`}
    >
      <Icon className={cn(iconSizes[size], info.color)} />
    </div>
  );

  if (!showTooltip) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent>
        <div className="text-center">
          <p className="font-semibold">{info.name}</p>
          <p className="text-xs text-muted-foreground">{(badgeTierDisplayNames as Record<string, string>)[info.rarity] || "Common"}</p>
          <p className="text-xs text-muted-foreground max-w-[200px]">{info.description}</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface BadgeRowProps {
  badges: EarnedBadge[];
  showAll?: boolean;
}

export function BadgeRow({ badges, showAll = false }: BadgeRowProps) {
  const displayBadges = showAll ? badges : badges.slice(0, 5);
  const remaining = badges.length - displayBadges.length;

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 items-center" data-testid="badge-row">
      {displayBadges.map((badge) => (
        <BadgeIcon key={badge.id} badgeType={badge.badgeType} size="sm" />
      ))}
      {remaining > 0 && (
        <Badge variant="secondary" className="text-xs">
          +{remaining} more
        </Badge>
      )}
    </div>
  );
}

interface NewBadgesDisplayProps {
  badges: EarnedBadge[];
}

export function NewBadgesDisplay({ badges }: NewBadgesDisplayProps) {
  if (badges.length === 0) return null;

  return (
    <Card className="bg-gradient-to-r from-primary/5 to-transparent border-primary/20" data-testid="new-badges-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Badges Earned!
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {badges.map((badge) => {
            const info = getBadgeInfoSafe(badge.badgeType);
            return (
              <div key={badge.id} className="flex flex-col items-center gap-1" data-testid={`earned-badge-${badge.badgeType}`}>
                <BadgeIcon badgeType={badge.badgeType} size="md" showTooltip={false} />
                <span className="text-xs font-medium text-center max-w-[80px]">{info.name}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface AthleteBadgeCollectionProps {
  athleteId: string;
}

export function AthleteBadgeCollection({ athleteId }: AthleteBadgeCollectionProps) {
  const { data: badges = [], isLoading } = useQuery<EarnedBadge[]>({
    queryKey: ['/api/athletes', athleteId, 'badges'],
  });

  if (isLoading) {
    return (
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-6 w-6 rounded-full" />
        ))}
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No badges yet</p>
    );
  }

  const uniqueBadges = badges.reduce((acc, badge) => {
    if (!acc.find(b => b.badgeType === badge.badgeType)) {
      acc.push(badge);
    }
    return acc;
  }, [] as EarnedBadge[]);

  return <BadgeRow badges={uniqueBadges} />;
}

interface AnalysisBadgesProps {
  analysisId: string;
}

export function AnalysisBadges({ analysisId }: AnalysisBadgesProps) {
  const { data: badges = [], isLoading } = useQuery<EarnedBadge[]>({
    queryKey: ['/api/analyses', analysisId, 'badges'],
  });

  if (isLoading) {
    return (
      <div className="flex gap-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-10 w-10 rounded-full" />
        ))}
      </div>
    );
  }

  return <NewBadgesDisplay badges={badges} />;
}

interface BadgeShowcaseProps {
  athleteId: string;
  athleteName: string;
}

export function BadgeShowcase({ athleteId, athleteName }: BadgeShowcaseProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  const { data: badges = [], isLoading } = useQuery<EarnedBadge[]>({
    queryKey: ['/api/athletes', athleteId, 'badges'],
    enabled: isOpen,
  });

  const uniqueBadges = badges.reduce((acc, badge) => {
    const existing = acc.find(b => b.badgeType === badge.badgeType);
    if (existing) {
      existing.count = (existing.count || 1) + 1;
    } else {
      acc.push({ ...badge, count: 1 });
    }
    return acc;
  }, [] as (EarnedBadge & { count?: number })[]);

  const badgeText = uniqueBadges.map(b => {
    const info = getBadgeInfoSafe(b.badgeType);
    return `${info.name}${b.count && b.count > 1 ? ` x${b.count}` : ''}`;
  }).join(', ');

  const shareText = `Check out ${athleteName}'s GymGlow badges: ${badgeText || 'No badges yet - keep training!'}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Badge list copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          data-testid={`button-show-badges-${athleteId}`}
        >
          <Share2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            {athleteName}'s Badge Collection
          </DialogTitle>
          <DialogDescription>
            Show off your achievements to friends!
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {isLoading ? (
            <div className="flex flex-wrap gap-4 justify-center">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-16 rounded-full" />
              ))}
            </div>
          ) : uniqueBadges.length === 0 ? (
            <div className="text-center py-8">
              <Award className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No badges earned yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Upload videos to earn your first badge!
              </p>
            </div>
          ) : (
            <>
              <div 
                className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
                data-testid="badge-showcase-grid"
              >
                {uniqueBadges.map((badge) => {
                  const info = getBadgeInfoSafe(badge.badgeType);
                  return (
                    <div 
                      key={badge.badgeType} 
                      className="flex flex-col items-center gap-1"
                      data-testid={`showcase-badge-${badge.badgeType}`}
                    >
                      <div className="relative">
                        <BadgeIcon badgeType={badge.badgeType} size="lg" showTooltip={false} />
                        {badge.count && badge.count > 1 && (
                          <Badge 
                            variant="secondary" 
                            className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs"
                          >
                            {badge.count}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs font-medium text-center leading-tight max-w-[70px]">
                        {info.name}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                <p className="flex-1 text-muted-foreground line-clamp-2">{shareText}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCopy}
                  data-testid="button-copy-badges"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </>
          )}

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Total badges earned: {badges.length}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
