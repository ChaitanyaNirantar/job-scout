"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import type { PublicSettings } from "@/lib/types";

const TIMEZONES = [
  "Pacific/Honolulu",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
];

const MINUTES = [0, 15, 30, 45];

function to12(hour: number) {
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return { h, period };
}

function to24(hour12: number, period: string) {
  if (period === "AM") return hour12 === 12 ? 0 : hour12;
  return hour12 === 12 ? 12 : hour12 + 12;
}

export function SettingsSheet({
  open,
  onOpenChange,
  settings,
  nextRunLabel,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: PublicSettings;
  nextRunLabel: string;
  onSave: (patch: Partial<PublicSettings>) => Promise<void>;
}) {
  const [webhookUrl, setWebhookUrl] = useState(settings.webhookUrl);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [desktopError, setDesktopError] = useState<string | null>(null);
  const clock = to12(settings.hour);
  const zones = TIMEZONES.includes(settings.timezone)
    ? TIMEZONES
    : [settings.timezone, ...TIMEZONES];

  useEffect(() => {
    setWebhookUrl(settings.webhookUrl);
  }, [settings.webhookUrl]);

  async function save(patch: Partial<PublicSettings>) {
    setDesktopError(null);
    try {
      await onSave(patch);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn’t save that.");
    }
  }

  async function enableDesktop(checked: boolean) {
    setDesktopError(null);
    if (checked) {
      if (typeof Notification === "undefined") {
        setDesktopError("This browser doesn’t support desktop alerts.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setDesktopError("Alerts are blocked. Allow notifications for this site, then try again.");
        return;
      }
    }
    await save({ desktopNotifications: checked });
  }

  async function sendTest() {
    setWebhookError(null);
    setTesting(true);
    try {
      await onSave({ webhookUrl });
      const response = await fetch("/api/webhook-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "The test didn’t send.");
      }
      toast.success("Test sent", { description: "Check Slack, Discord, or ntfy." });
    } catch (error) {
      setWebhookError(error instanceof Error ? error.message : "The test didn’t send.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto data-[side=right]:sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-heading text-2xl">Delivery</SheetTitle>
          <SheetDescription>
            Next pass: {nextRunLabel}. The daily check runs while Brief is open, and catches up if it missed the hour.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-4 pb-6">
          <section className="flex flex-col gap-2">
            <Label>Every day at</Label>
            <div className="flex gap-2">
              <select
                aria-label="Hour"
                className="h-10 flex-1 rounded-lg border border-input bg-card px-2 text-sm"
                value={clock.h}
                onChange={(event) =>
                  void save({ hour: to24(Number(event.target.value), clock.period) })
                }
              >
                {Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}
                  </option>
                ))}
              </select>
              <select
                aria-label="Minute"
                className="h-10 rounded-lg border border-input bg-card px-2 text-sm"
                value={settings.minute}
                onChange={(event) => void save({ minute: Number(event.target.value) })}
              >
                {MINUTES.map((minute) => (
                  <option key={minute} value={minute}>
                    :{String(minute).padStart(2, "0")}
                  </option>
                ))}
              </select>
              <select
                aria-label="AM or PM"
                className="h-10 rounded-lg border border-input bg-card px-2 text-sm"
                value={clock.period}
                onChange={(event) =>
                  void save({ hour: to24(clock.h, event.target.value) })
                }
              >
                <option>AM</option>
                <option>PM</option>
              </select>
            </div>
            <select
              aria-label="Timezone"
              className="h-10 rounded-lg border border-input bg-card px-2 text-sm"
              value={settings.timezone}
              onChange={(event) => void save({ timezone: event.target.value })}
            >
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </section>

          <section className="flex items-start justify-between gap-4 rounded-lg border bg-card px-3 py-3">
            <div>
              <p className="text-sm font-medium">Desktop alerts</p>
              <p className="text-xs text-muted-foreground">
                A browser notification when new roles land while this tab is open.
              </p>
              {desktopError && <p className="mt-2 text-xs text-destructive">{desktopError}</p>}
            </div>
            <Switch
              checked={settings.desktopNotifications}
              onCheckedChange={(checked) => void enableDesktop(checked)}
              aria-label="Desktop alerts"
            />
          </section>

          <section className="flex flex-col gap-2">
            <Label htmlFor="webhook">Phone, Slack, or Discord</Label>
            <Input
              id="webhook"
              value={webhookUrl}
              onChange={(event) => setWebhookUrl(event.target.value)}
              onBlur={() => {
                if (webhookUrl !== settings.webhookUrl) void save({ webhookUrl });
              }}
              placeholder="https://ntfy.sh/your-private-topic"
              className="h-10 bg-card"
            />
            <p className="text-xs leading-5 text-muted-foreground">
              Paste a Slack or Discord incoming webhook, or an ntfy topic such as
              https://ntfy.sh/your-private-topic. Pick a topic that isn’t easy to guess.
            </p>
            {webhookError && <p className="text-xs text-destructive">{webhookError}</p>}
            <Button
              type="button"
              variant="outline"
              className="h-9 self-start bg-card"
              disabled={testing || webhookUrl.trim().length === 0}
              onClick={() => void sendTest()}
            >
              {testing ? "Sending…" : "Send a test"}
            </Button>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
