import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";

export default function NotificationSettingsPage() {
  const { data } = useQuery({
    queryKey: ["/api/notification-preferences"],
  });

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      await apiRequest("PUT", "/api/notification-preferences", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/notification-preferences"],
      });
    },
  });

  const [prefs, setPrefs] = useState<any>(null);

  useEffect(() => {
    if (data) setPrefs(data);
  }, [data]);

  if (!prefs) return null;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.keys(prefs).map((key) => (
            <div key={key} className="flex items-center justify-between">
              <span>{key.replace("_", " ")}</span>
              <Switch
                checked={prefs[key]}
                onCheckedChange={(val) =>
                  setPrefs({ ...prefs, [key]: val })
                }
              />
            </div>
          ))}

          <Button onClick={() => mutation.mutate(prefs)}>
            Save Preferences
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}