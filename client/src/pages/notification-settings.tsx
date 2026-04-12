import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

type NotificationPrefs = {
  weekly_results: boolean;
  challenge_reminders: boolean;
  product_updates: boolean;
};

const STORAGE_KEY = "gymglow.notification-preferences";
const DEFAULT_PREFS: NotificationPrefs = {
  weekly_results: true,
  challenge_reminders: true,
  product_updates: false,
};

export default function NotificationSettingsPage() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
      }
    } catch {
      setPrefs(DEFAULT_PREFS);
    } finally {
      setHydrated(true);
    }
  }, []);

  const handleSave = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    toast({
      title: "Preferences saved",
      description: "Your notification settings were updated on this device.",
    });
  };

  if (!hydrated) return null;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(prefs).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <span>{key.replace(/_/g, " ")}</span>
              <Switch
                checked={value}
                onCheckedChange={(val) => setPrefs((prev) => ({ ...prev, [key]: val }))}
              />
            </div>
          ))}

          <Button onClick={handleSave}>Save Preferences</Button>
        </CardContent>
      </Card>
    </div>
  );
}
