"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { relativeTime } from "@/lib/time";
import type { Notice } from "@/lib/types";
import { cn } from "@/lib/utils";

export function NoticesSheet({
  open,
  onOpenChange,
  notices,
  onMarkAll,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notices: Notice[];
  onMarkAll: () => void;
}) {
  const unread = notices.some((notice) => !notice.read);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto data-[side=right]:sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-heading text-2xl">Notifications</SheetTitle>
          <SheetDescription>A note each time Brief finds roles that fit.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-3 px-4 pb-6">
          {unread && (
            <Button type="button" variant="outline" className="h-8 self-start bg-card" onClick={onMarkAll}>
              Mark all read
            </Button>
          )}
          {notices.length === 0 && (
            <p className="rounded-xl border border-dashed bg-card px-4 py-8 text-sm text-muted-foreground">
              Nothing yet. When a posting matches, it will land here and, if you turned them on, on your desktop or webhook.
            </p>
          )}
          {notices.map((notice) => (
            <article
              key={notice.id}
              className={cn("rounded-xl border bg-card px-3 py-3", !notice.read && "border-l-4 border-l-primary")}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-sm font-medium">{notice.title}</h3>
                <time className="shrink-0 text-xs text-muted-foreground">
                  {relativeTime(notice.createdAt)}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{notice.body}</p>
              {notice.webhook === "sent" && (
                <p className="mt-2 text-xs text-muted-foreground">Also sent to your webhook.</p>
              )}
              {notice.webhook === "failed" && (
                <p className="mt-2 text-xs text-destructive">
                  Webhook didn’t send. {notice.webhookError}
                </p>
              )}
            </article>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
