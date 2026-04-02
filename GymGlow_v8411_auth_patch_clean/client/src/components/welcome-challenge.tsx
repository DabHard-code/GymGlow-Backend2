import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, X, Target, Video, ListChecks, Trophy } from "lucide-react";

const WELCOME_DISMISSED_KEY = "gymglow_welcome_challenge_dismissed";

export function useWelcomeChallenge() {
  const [showWelcome, setShowWelcome] = useState(false);
  
  useEffect(() => {
    const dismissed = localStorage.getItem(WELCOME_DISMISSED_KEY);
    if (!dismissed) {
      setShowWelcome(true);
    }
  }, []);
  
  const dismissWelcome = () => {
    localStorage.setItem(WELCOME_DISMISSED_KEY, "true");
    setShowWelcome(false);
  };
  
  return { showWelcome, dismissWelcome };
}

interface WelcomeChallengeProps {
  onDismiss: () => void;
}

export function WelcomeChallengeCard({ onDismiss }: WelcomeChallengeProps) {
  const tasks = [
    { icon: Target, label: "Create an athlete profile", completed: false },
    { icon: Video, label: "Upload your first video", completed: false },
    { icon: ListChecks, label: "Track a skill in the Skills Library", completed: false },
  ];

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/30 relative overflow-hidden" data-testid="card-welcome-challenge">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={onDismiss}
        data-testid="button-dismiss-welcome"
      >
        <X className="h-4 w-4" />
      </Button>
      
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/20">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Welcome Challenge
              <Badge variant="secondary" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Earn Rising Star
              </Badge>
            </CardTitle>
            <CardDescription>
              Complete these steps to earn your first badge!
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3 mt-2">
          {tasks.map((task, index) => {
            const Icon = task.icon;
            return (
              <div 
                key={index} 
                className="flex items-center gap-3 p-2 rounded-md bg-background/50"
                data-testid={`task-${index}`}
              >
                <div className="p-1.5 rounded-full bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-sm">{task.label}</span>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 p-3 rounded-md bg-primary/10 border border-primary/20">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Tip:</strong> Upload your first training video and our AI coach will analyze your form and award your first badge!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
