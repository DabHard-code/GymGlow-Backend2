import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, UserPlus, Video, ChevronLeft, ChevronRight, X, Shield } from "lucide-react";

const ONBOARDING_KEY = "gymglow_onboarding_complete";

interface OnboardingStep {
  icon: typeof Sparkles;
  title: string;
  description: string;
  color: string;
}

const steps: OnboardingStep[] = [
  {
    icon: Sparkles,
    title: "Welcome to GymGlow!",
    description: "Upload a skill video and get clear coaching feedback, progress tracking, and weekly challenges built for youth athletes.",
    color: "text-primary",
  },
  {
    icon: UserPlus,
    title: "Private Names, Safe Rankings",
    description: "Athlete names stay inside your account. Public leaderboards use safe display aliases that you can edit anytime.",
    color: "text-green-500",
  },
  {
    icon: Video,
    title: "Temporary Video Processing",
    description: "Videos are used for analysis and deleted after processing. GymGlow keeps the feedback, scores, badges, and progress history.",
    color: "text-blue-500",
  },
  {
    icon: Shield,
    title: "Coaching Support, Not Official Judging",
    description: "AI feedback is a practice tool. It is not medical advice, safety clearance, or an official competition score.",
    color: "text-amber-500",
  },
];

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed) {
      setShowOnboarding(true);
    }
  }, []);
  
  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setShowOnboarding(false);
  };
  
  return { showOnboarding, completeOnboarding };
}

interface OnboardingProps {
  onComplete: () => void;
}

export function OnboardingCarousel({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const goNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };
  
  const goPrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const skip = () => {
    onComplete();
  };
  
  const step = steps[currentStep];
  const StepIcon = step.icon;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4" data-testid="onboarding-overlay">
      <Card className="w-full max-w-md relative overflow-hidden">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-2 right-2 z-10"
          onClick={skip}
          data-testid="button-skip-onboarding"
        >
          <X className="h-4 w-4" />
        </Button>
        
        <CardContent className="pt-12 pb-8 px-6">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className={`p-4 rounded-full bg-muted ${step.color}`}>
              <StepIcon className="h-12 w-12" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold" data-testid="text-onboarding-title">
                {step.title}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
            
            <div className="flex items-center gap-2 pt-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep 
                      ? "w-8 bg-primary" 
                      : "w-2 bg-muted-foreground/30"
                  }`}
                  data-testid={`indicator-step-${index}`}
                />
              ))}
            </div>
            
            <div className="flex items-center gap-3 pt-4 w-full">
              <Button
                variant="outline"
                onClick={goPrev}
                disabled={currentStep === 0}
                className="flex-1"
                data-testid="button-onboarding-prev"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              
              <Button
                onClick={goNext}
                className="flex-1"
                data-testid="button-onboarding-next"
              >
                {currentStep === steps.length - 1 ? (
                  "Get Started"
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
            
            {currentStep < steps.length - 1 && (
              <Button 
                variant="ghost" 
                className="text-muted-foreground text-sm"
                onClick={skip}
                data-testid="button-skip-link"
              >
                Skip tutorial
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
