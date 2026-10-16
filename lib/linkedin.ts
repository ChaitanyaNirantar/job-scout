import type { BoardSearch } from "@/lib/searches";
import { stripHtml } from "@/lib/text";
import type { DraftJob } from "@/lib/normalize";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

function cleanUrl(href: string): string {
  const decoded = href.replace(/&amp;/g, "&").replace(/&#39;/g, "'");
  try {
    const url = new URL(decoded, "https://www.linkedin.com");
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return decoded;
  }
}

function textOf(html: string): string {
  return stripHtml(html).replace(/\s+/g, " ").trim();
}

export function parseLinkedInHtml(
  html: string,
  search: Pick<BoardSearch, "sponsorship" | "newGrad">,
): DraftJob[] {
  const jobs: DraftJob[] = [];
  const cards = html.split(/<li\b/i).slice(1);
  for (const card of cards) {
    const urn = /jobPosting:(\d+)/.exec(card)?.[1];
    const href =
      /base-card__full-link[^>]*href="([^"]+)"/i.exec(card)?.[1] ??
      /href="(https:\/\/www\.linkedin\.com\/jobs\/view\/[^"]+)"/i.exec(card)?.[1];
    const title = textOf(/base-search-card__title[^>]*>([\s\S]*?)<\/h3>/i.exec(card)?.[1] ?? "");
    const company = textOf(/base-search-card__subtitle[^>]*>([\s\S]*?)<\/h4>/i.exec(card)?.[1] ?? "");
    const location = textOf(/job-search-card__location[^>]*>([\s\S]*?)<\/span>/i.exec(card)?.[1] ?? "");
    const datetime = /<time[^>]*datetime="([^"]+)"/i.exec(card)?.[1];
    if (!title || !href) continue;
    const url = cleanUrl(href);
    const postedAt = datetime ? new Date(datetime).toISOString() : new Date().toISOString();
    jobs.push({
      id: `linkedin:${urn || url.split("/").filter(Boolean).at(-1) || title}`,
      source: "linkedin",
      title,
      company,
      location: location || "Location not listed",
      url,
      excerpt: "",
      tags: [],
      salary: null,
      remote: /remote/i.test(location),
      postedAt: Number.isNaN(new Date(postedAt).getTime()) ? new Date().toISOString() : postedAt,
      sponsorship: search.sponsorship ? "likely" : "unknown",
      newGrad: search.newGrad,
    });
  }
  return jobs;
}

export function linkedInKeywords(search: BoardSearch): string {
  const parts = [search.phrase];
  if (search.gradYear) parts.push("2027");
  if (search.sponsorship) parts.push("visa sponsorship");
  return parts.join(" ");
}

async function fetchPage(search: BoardSearch): Promise<DraftJob[]> {
  const url = new URL("https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search");
  url.searchParams.set("keywords", linkedInKeywords(search));
  if (search.location) url.searchParams.set("location", search.location);
  url.searchParams.set("start", "0");
  url.searchParams.set("f_TPR", "r1814400");
  if (search.newGrad && !search.gradYear) url.searchParams.set("f_E", "2");
  if (search.remoteOnly) url.searchParams.set("f_WT", "2");
  const response = await fetch(url, {
    headers: {
      Accept: "text/html",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": USER_AGENT,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    throw new Error(`replied ${response.status}`);
  }
  return parseLinkedInHtml(await response.text(), search);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchLinkedInJobs(
  searches: BoardSearch[],
): Promise<{ jobs: DraftJob[]; error: string | null; completed: number }> {
  const jobs: DraftJob[] = [];
  let completed = 0;
  let error: string | null = null;
  for (let index = 0; index < searches.length; index += 1) {
    if (index > 0) await sleep(2000);
    try {
      jobs.push(...(await fetchPage(searches[index])));
      completed += 1;
    } catch (caught) {
      const reason = caught instanceof Error ? caught.message : "didn’t respond";
      error = `LinkedIn ${reason}.`;
      break;
    }
  }
  return { jobs, error, completed };
}
