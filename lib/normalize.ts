import { detectNewGrad, detectSponsorship, isLeveledTitle, isSeniorTitle, mentionsNewGrad } from "@/lib/signals";
import type { FeedJob, Sponsorship } from "@/lib/types";

export type DraftJob = Omit<FeedJob, "sponsorship" | "newGrad"> & {
  sponsorship?: Sponsorship;
  newGrad?: boolean;
};

export function finalizeJob(job: DraftJob): FeedJob {
  const text = [job.title, job.tags.join(" "), job.location, job.excerpt].join("\n");
  const detected = detectSponsorship(text);
  let sponsorship: Sponsorship = job.sponsorship ?? "unknown";
  if (detected === "none" || detected === "explicit") sponsorship = detected;
  else if (sponsorship === "unknown") sponsorship = detected;

  let newGrad = job.newGrad ?? false;
  if ((isSeniorTitle(job.title) || isLeveledTitle(job.title)) && !mentionsNewGrad(job.title)) newGrad = false;
  else if (!newGrad) newGrad = detectNewGrad(text);

  return { ...job, sponsorship, newGrad };
}

export function isRecent(postedAt: string, now = Date.now()): boolean {
  const posted = new Date(postedAt).getTime();
  if (Number.isNaN(posted)) return false;
  const maxAge = 21 * 24 * 60 * 60 * 1000;
  return now - posted <= maxAge && posted <= now + 60 * 60 * 1000;
}

export function keepJobs(jobs: DraftJob[], now = Date.now()): FeedJob[] {
  const seen = new Set<string>();
  const kept: FeedJob[] = [];
  for (const job of jobs) {
    if (!job.title || !job.url || !job.id) continue;
    if (!isRecent(job.postedAt, now)) continue;
    if (seen.has(job.id)) continue;
    seen.add(job.id);
    kept.push(finalizeJob(job));
  }
  return kept;
}
