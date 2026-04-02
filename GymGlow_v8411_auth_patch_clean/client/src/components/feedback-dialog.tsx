import { useState } from "react";
import { MessageSquare, Send, Bug, Lightbulb, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

type FeedbackType = "bug" | "feature" | "question";

const feedbackTypes: { value: FeedbackType; label: string; icon: typeof Bug }[] = [
  { value: "bug", label: "Bug Report", icon: Bug },
  { value: "feature", label: "Feature Request", icon: Lightbulb },
  { value: "question", label: "Question", icon: HelpCircle },
];

export function FeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("bug");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({
        title: "Message required",
        description: "Please describe your feedback or issue.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    console.log("Feedback submitted:", { type, email, message });
    
    toast({
      title: "Thank you!",
      description: "Your feedback has been submitted. We'll review it soon.",
    });
    
    setType("bug");
    setEmail("");
    setMessage("");
    setOpen(false);
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          data-testid="button-feedback"
        >
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">Feedback</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Send Feedback
          </DialogTitle>
          <DialogDescription>
            Found an issue or have a suggestion? We'd love to hear from you!
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>What type of feedback?</Label>
            <RadioGroup
              value={type}
              onValueChange={(v) => setType(v as FeedbackType)}
              className="flex gap-2"
            >
              {feedbackTypes.map((ft) => {
                const Icon = ft.icon;
                return (
                  <div key={ft.value} className="flex-1">
                    <RadioGroupItem
                      value={ft.value}
                      id={ft.value}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={ft.value}
                      className="flex flex-col items-center gap-1 rounded-md border-2 border-muted bg-transparent p-3 hover-elevate cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                      data-testid={`radio-${ft.value}`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-xs">{ft.label}</span>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="input-feedback-email"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Describe the issue or your suggestion..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              data-testid="input-feedback-message"
            />
          </div>
          
          <Button 
            onClick={handleSubmit} 
            className="w-full"
            disabled={isSubmitting}
            data-testid="button-submit-feedback"
          >
            {isSubmitting ? (
              "Sending..."
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Feedback
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
