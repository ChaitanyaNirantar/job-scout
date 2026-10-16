import { fetchJobrightJobs } from "@/lib/jobright";
import { fetchLinkedInJobs } from "@/lib/linkedin";
import { keepJobs, type DraftJob } from "@/lib/normalize";
import { completedSearches, remainingSearches, searchesFromWatches, type BoardSearch } from "@/lib/searches";
import { sourceLabel, SOURCES } from "@/lib/sources";
import { excerpt } from "@/lib/text";
import type { Database, FeedJob, SourceId } from "@/lib/types";

const USER_AGENT = "Mozilla/5.0 (compatible; BriefJobWatch/1.0)";
export const FEED_TTL_MS = 6 * 60 * 60 * 1000;

type SourceFetcher = {
  id: SourceId;
  fetch: () => Promise<FeedJob[]>;
};

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    throw new Error(`replied ${response.status}`);
  }
  return response.json();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function tagsOf(value: unknown): string[] {
  return asArray(value)
    .map((item) => str(item))
    .filter(Boolean)
    .slice(0, 8);
}

function fromUnix(value: unknown): string | null {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  const ms = numeric > 10_000_000_000 ? numeric : numeric * 1000;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function fromIso(value: unknown): string | null {
  const text = str(value);
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function money(min: number | null, max: number | null, currency = "USD"): string | null {
  const lower = min && min > 0 ? min : null;
  const upper = max && max > 0 ? max : null;
  if (!lower && !upper) return null;
  let format: (amount: number) => string;
  try {
    format = (amount) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD",
        maximumFractionDigits: 0,
      }).format(amount);
  } catch {
    format = (amount) => `$${Math.round(amount).toLocaleString("en-US")}`;
  }
  if (lower && upper && lower !== upper) return `${format(lower)}–${format(upper)}`;
  return format(lower ?? upper ?? 0);
}

async function fetchHimalayas(): Promise<FeedJob[]> {
  const jobs: DraftJob[] = [];
  let cursor = "";
  for (let page = 0; page < 3; page += 1) {
    const url = new URL("https://himalayas.app/jobs/api");
    url.searchParams.set("limit", "20");
    if (cursor) url.searchParams.set("cursor", cursor);
    const data = asRecord(await fetchJson(url.toString()));
    for (const item of asArray(data?.jobs)) {
      const record = asRecord(item);
      if (!record) continue;
      const title = str(record.title);
      const link = str(record.applicationLink) || str(record.guid);
      const min = typeof record.minSalary === "number" ? record.minSalary : null;
      const max = typeof record.maxSalary === "number" ? record.maxSalary : null;
      const places = asArray(record.locationRestrictions).map((place) => str(place)).filter(Boolean);
      jobs.push({
        id: `himalayas:${(link || title).split("/").filter(Boolean).slice(-2).join("-")}`,
        source: "himalayas",
        title,
        company: str(record.companyName),
        location: places.join(", ") || "Remote",
        url: link,
        excerpt: excerpt(str(record.excerpt) || str(record.description)),
        tags: tagsOf(record.parentCategories).concat(tagsOf(record.categories)).slice(0, 8),
        salary: money(min, max, str(record.currency) || "USD"),
        remote: true,
        postedAt: fromUnix(record.pubDate) ?? new Date().toISOString(),
      });
    }
    cursor = str(data?.nextCursor);
    if (!cursor) break;
  }
  return keepJobs(jobs);
}

async function fetchRemoteOk(): Promise<FeedJob[]> {
  const data = await fetchJson("https://remoteok.com/api");
  const jobs = asArray(data).flatMap((item) => {
    const record = asRecord(item);
    if (!record || !str(record.position)) return [];
    const id = str(record.id) || str(record.slug);
    const min = typeof record.salary_min === "number" ? record.salary_min : null;
    const max = typeof record.salary_max === "number" ? record.salary_max : null;
    const job: DraftJob = {
      id: `remoteok:${id}`,
      source: "remoteok",
      title: str(record.position),
      company: str(record.company),
      location: str(record.location) || "Remote",
      url: str(record.url) || str(record.apply_url),
      excerpt: excerpt(str(record.description)),
      tags: tagsOf(record.tags),
      salary: money(min, max),
      remote: true,
      postedAt: fromIso(record.date) ?? fromUnix(record.epoch) ?? new Date().toISOString(),
    };
    return [job];
  });
  return keepJobs(jobs);
}

async function fetchJobicy(): Promise<FeedJob[]> {
  const data = asRecord(await fetchJson("https://jobicy.com/api/v2/remote-jobs?count=50"));
  const jobs = asArray(data?.jobs).flatMap((item) => {
    const record = asRecord(item);
    if (!record) return [];
    const id = String(record.id ?? "");
    const job: DraftJob = {
      id: `jobicy:${id}`,
      source: "jobicy",
      title: str(record.jobTitle),
      company: str(record.companyName),
      location: str(record.jobGeo) || "Remote",
      url: str(record.url),
      excerpt: excerpt(str(record.jobExcerpt) || str(record.jobDescription)),
      tags: tagsOf(record.jobIndustry),
      salary: null,
      remote: true,
      postedAt: fromIso(record.pubDate) ?? new Date().toISOString(),
    };
    return [job];
  });
  return keepJobs(jobs);
}

async function fetchArbeitnow(): Promise<FeedJob[]> {
  const data = asRecord(await fetchJson("https://www.arbeitnow.com/api/job-board-api"));
  const jobs = asArray(data?.data).flatMap((item) => {
    const record = asRecord(item);
    if (!record) return [];
    const slug = str(record.slug);
    const job: DraftJob = {
      id: `arbeitnow:${slug}`,
      source: "arbeitnow",
      title: str(record.title),
      company: str(record.company_name),
      location: str(record.location),
      url: str(record.url),
      excerpt: excerpt(str(record.description)),
      tags: tagsOf(record.tags),
      salary: null,
      remote: record.remote === true,
      postedAt: fromUnix(record.created_at) ?? new Date().toISOString(),
    };
    return [job];
  });
  return keepJobs(jobs);
}

async function fetchRemotive(): Promise<FeedJob[]> {
  const data = asRecord(await fetchJson("https://remotive.com/api/remote-jobs"));
  const jobs = asArray(data?.jobs).flatMap((item) => {
    const record = asRecord(item);
    if (!record) return [];
    const id = String(record.id ?? "");
    const salary = str(record.salary);
    const job: DraftJob = {
      id: `remotive:${id}`,
      source: "remotive",
      title: str(record.title),
      company: str(record.company_name),
      location: str(record.candidate_required_location) || "Remote",
      url: str(record.url),
      excerpt: excerpt(str(record.description)),
      tags: tagsOf(record.tags),
      salary: salary || null,
      remote: true,
      postedAt: fromIso(record.publication_date) ?? new Date().toISOString(),
    };
    return [job];
  });
  return keepJobs(jobs);
}

const FETCHERS: SourceFetcher[] = [
  { id: "himalayas", fetch: fetchHimalayas },
  { id: "remoteok", fetch: fetchRemoteOk },
  { id: "jobicy", fetch: fetchJobicy },
  { id: "arbeitnow", fetch: fetchArbeitnow },
  { id: "remotive", fetch: fetchRemotive },
];

async function refreshCached(
  db: Database,
  id: SourceId,
  queryKey: string,
  load: () => Promise<{ jobs: DraftJob[]; error: string | null }>,
) {
  const cached = db.feedCache[id];
  const fetchedAt = cached ? new Date(cached.fetchedAt).getTime() : 0;
  if (cached && cached.queryKey === queryKey && Date.now() - fetchedAt < FEED_TTL_MS) {
    db.feedStatus[id] = { fetchedAt: cached.fetchedAt, count: cached.jobs.length, error: null };
    return;
  }
  const result = await load();
  // An empty failure must not become a six-hour cache, or a 429 hides the source until the TTL expires.
  if (result.jobs.length === 0 && result.error) {
    db.feedStatus[id] = {
      fetchedAt: cached?.fetchedAt ?? null,
      count: cached?.jobs.length ?? 0,
      error: result.error,
    };
    return;
  }
  const stamp = new Date().toISOString();
  const jobs = keepJobs(result.jobs);
  db.feedCache[id] = {
    fetchedAt: stamp,
    jobs,
    // A partial reply, such as a LinkedIn 429 after the first page, should be tried again.
    queryKey: result.error ? undefined : queryKey,
  };
  db.feedStatus[id] = { fetchedAt: stamp, count: jobs.length, error: result.error };
}

const LINKEDIN_BATCH = 2;

async function refreshLinkedIn(db: Database, desired: BoardSearch[]) {
  const cached = db.feedCache.linkedin;
  const fetchedAt = cached ? new Date(cached.fetchedAt).getTime() : 0;
  const fresh = Boolean(cached) && Date.now() - fetchedAt < FEED_TTL_MS;
  const done = fresh ? completedSearches(cached?.queryKey) : [];
  const pending = remainingSearches(desired, done);
  if (pending.length === 0) {
    db.feedStatus.linkedin = {
      fetchedAt: cached?.fetchedAt ?? null,
      count: cached?.jobs.length ?? 0,
      error: null,
    };
    return;
  }
  const batch = pending.slice(0, LINKEDIN_BATCH);
  const result = await fetchLinkedInJobs(batch);
  if (result.completed === 0 && result.error) {
    db.feedStatus.linkedin = {
      fetchedAt: cached?.fetchedAt ?? null,
      count: cached?.jobs.length ?? 0,
      error: result.error,
    };
    return;
  }
  const finished = [...done, ...batch.slice(0, result.completed)];
  const jobs = keepJobs([...(cached?.jobs ?? []), ...result.jobs])
    .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
    .slice(0, 80);
  const stamp = new Date().toISOString();
  db.feedCache.linkedin = { fetchedAt: stamp, jobs, queryKey: JSON.stringify(finished) };
  db.feedStatus.linkedin = { fetchedAt: stamp, count: jobs.length, error: result.error };
}

export async function refreshFeeds(db: Database): Promise<void> {
  const searches = searchesFromWatches(db.watches);
  await Promise.all([
    ...FETCHERS.map(async (source) => {
      const cached = db.feedCache[source.id];
      const fetchedAt = cached ? new Date(cached.fetchedAt).getTime() : 0;
      if (cached && Date.now() - fetchedAt < FEED_TTL_MS) {
        db.feedStatus[source.id] = {
          fetchedAt: cached.fetchedAt,
          count: cached.jobs.length,
          error: null,
        };
        return;
      }
      try {
        const jobs = await source.fetch();
        const stamp = new Date().toISOString();
        db.feedCache[source.id] = { fetchedAt: stamp, jobs };
        db.feedStatus[source.id] = { fetchedAt: stamp, count: jobs.length, error: null };
      } catch (error) {
        const reason = error instanceof Error ? error.message : "didn’t respond";
        db.feedStatus[source.id] = {
          fetchedAt: cached?.fetchedAt ?? null,
          count: cached?.jobs.length ?? 0,
          error: `${sourceLabel(source.id)} ${reason}.`,
        };
      }
    }),
    refreshLinkedIn(db, searches),
    refreshCached(db, "jobright", "published-lists", () => fetchJobrightJobs()),
  ]);
}

export function cachedJobs(db: Database): FeedJob[] {
  const seenUrls = new Set<string>();
  const seenLoose = new Set<string>();
  const jobs: FeedJob[] = [];
  for (const source of SOURCES) {
    for (const job of db.feedCache[source.id]?.jobs ?? []) {
      const hydrated: FeedJob = {
        ...job,
        sponsorship: job.sponsorship ?? "unknown",
        newGrad: job.newGrad ?? false,
      };
      const urlKey = hydrated.url.toLowerCase();
      const loose = `${hydrated.company.toLowerCase()}|${hydrated.title.toLowerCase()}`;
      if (seenUrls.has(urlKey) || seenLoose.has(loose)) continue;
      seenUrls.add(urlKey);
      seenLoose.add(loose);
      jobs.push(hydrated);
    }
  }
  return jobs;
}
