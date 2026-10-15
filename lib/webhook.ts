import type { SavedJob } from "@/lib/types";
import { sourceLabel } from "@/lib/sources";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
]);

export function assertPublicWebhook(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("Enter a full https:// webhook URL.");
  }
  if (url.username || url.password) {
    throw new Error("Webhook URL can’t include a username or password.");
  }
  if (url.protocol !== "https:") {
    throw new Error("Webhook URL must start with https://.");
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    BLOCKED_HOSTS.has(host) ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localhost")
  ) {
    throw new Error("That webhook address isn’t allowed.");
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const [a, b] = host.split(".").map(Number);
    const blocked =
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168);
    if (blocked) throw new Error("That webhook address isn’t allowed.");
  }
  return url;
}

export function webhookMessage(jobs: SavedJob[], intro?: string): string {
  const head =
    intro ??
    (jobs.length === 1 ? "Brief found 1 new role." : `Brief found ${jobs.length} new roles.`);
  const lines = jobs.slice(0, 8).map((job) => {
    const where = job.location || (job.remote ? "Remote" : "Location not listed");
    return `• ${job.title} — ${job.company} · ${where} · via ${sourceLabel(job.source)}\n  ${job.url}`;
  });
  const extra = jobs.length > 8 ? `\n…and ${jobs.length - 8} more in Brief.` : "";
  return `${head}\n\n${lines.join("\n")}${extra}`;
}

function payloadFor(url: URL, text: string, jobs: SavedJob[]): { body: string; headers: Record<string, string> } {
  const host = url.hostname.toLowerCase();
  if (host === "discord.com" || host === "discordapp.com" || host.endsWith(".discord.com")) {
    return {
      body: JSON.stringify({ content: text.slice(0, 1900) }),
      headers: { "Content-Type": "application/json" },
    };
  }
  if (host === "hooks.slack.com" || host.endsWith(".slack.com")) {
    return {
      body: JSON.stringify({ text: text.slice(0, 3500) }),
      headers: { "Content-Type": "application/json" },
    };
  }
  if (host === "ntfy.sh" || host.endsWith(".ntfy.sh")) {
    return {
      body: text,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        Title: "Brief",
        Tags: "briefcase",
      },
    };
  }
  return {
    body: JSON.stringify({
      source: "brief",
      text,
      jobs: jobs.slice(0, 8).map((job) => ({
        title: job.title,
        company: job.company,
        location: job.location,
        url: job.url,
        source: sourceLabel(job.source),
      })),
    }),
    headers: { "Content-Type": "application/json" },
  };
}

export async function deliverWebhook(
  rawUrl: string,
  text: string,
  jobs: SavedJob[] = [],
): Promise<{ ok: true } | { ok: false; error: string }> {
  let url: URL;
  try {
    url = assertPublicWebhook(rawUrl);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid webhook." };
  }
  const payload = payloadFor(url, text, jobs);
  try {
    const response = await fetch(url, {
      method: "POST",
      redirect: "manual",
      headers: {
        "User-Agent": "BriefJobWatch/1.0",
        ...payload.headers,
      },
      body: payload.body,
      signal: AbortSignal.timeout(8000),
    });
    if (response.status >= 300 && response.status < 400) {
      return { ok: false, error: "The webhook tried to redirect, so Brief stopped." };
    }
    if (!response.ok) {
      return { ok: false, error: `The webhook replied ${response.status}.` };
    }
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The webhook didn’t respond.";
    return { ok: false, error: message };
  }
}
