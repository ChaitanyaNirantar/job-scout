import { splitList } from "@/lib/text";
import type { Watch } from "@/lib/types";

export type BoardSearch = {
  phrase: string;
  location: string;
  remoteOnly: boolean;
  sponsorship: boolean;
  newGrad: boolean;
  /** Search the class-of-2027 wording in addition to LinkedIn's entry-level filter. */
  gradYear: boolean;
};

function groupedPhrase(phrases: string[]): string {
  if (phrases.length === 1) return phrases[0];
  return phrases.map((phrase) => `"${phrase}"`).join(" OR ");
}

function priority(search: BoardSearch): number {
  return (search.sponsorship ? 2 : 0) + (search.newGrad ? 2 : 0) + (search.gradYear ? 0 : 1);
}

export function searchesFromWatches(watches: Watch[], limit = 4): BoardSearch[] {
  const drafted: BoardSearch[] = [];
  for (const watch of watches) {
    if (!watch.enabled) continue;
    const phrases = splitList(watch.keywords);
    if (phrases.length === 0) continue;
    const phrase = groupedPhrase(phrases);
    const places = splitList(watch.location).slice(0, 3);
    const locations = places.length > 0 ? places : [""];
    for (const location of locations) {
      const base = {
        phrase,
        location,
        remoteOnly: watch.remoteOnly,
        sponsorship: watch.sponsorship === "required",
      };
      if (watch.newGradOnly) {
        drafted.push({ ...base, newGrad: true, gradYear: false });
        drafted.push({ ...base, newGrad: true, gradYear: true });
      } else {
        drafted.push({ ...base, newGrad: false, gradYear: false });
      }
    }
  }
  const ranked = drafted
    .map((search, index) => ({ search, index }))
    .sort((a, b) => priority(b.search) - priority(a.search) || a.index - b.index);
  const seen = new Set<string>();
  const searches: BoardSearch[] = [];
  for (const item of ranked) {
    const key = JSON.stringify(item.search);
    if (seen.has(key)) continue;
    seen.add(key);
    searches.push(item.search);
    if (searches.length >= limit) break;
  }
  return searches;
}

export function searchKey(searches: BoardSearch[]): string {
  return JSON.stringify(searches);
}

export function completedSearches(queryKey: string | undefined): BoardSearch[] {
  if (!queryKey) return [];
  try {
    const parsed = JSON.parse(queryKey) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const record = item as Partial<BoardSearch>;
      if (typeof record.phrase !== "string" || typeof record.location !== "string") return [];
      return [
        {
          phrase: record.phrase,
          location: record.location,
          remoteOnly: record.remoteOnly === true,
          sponsorship: record.sponsorship === true,
          newGrad: record.newGrad === true,
          gradYear: record.gradYear === true,
        },
      ];
    });
  } catch {
    return [];
  }
}

export function remainingSearches(desired: BoardSearch[], completed: BoardSearch[]): BoardSearch[] {
  const done = new Set(completed.map((search) => JSON.stringify(search)));
  return desired.filter((search) => !done.has(JSON.stringify(search)));
}
