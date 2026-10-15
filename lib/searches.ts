import { splitList } from "@/lib/text";
import type { Watch } from "@/lib/types";

export type BoardSearch = {
  phrase: string;
  location: string;
  remoteOnly: boolean;
  sponsorship: boolean;
  newGrad: boolean;
};

export function searchesFromWatches(watches: Watch[], limit = 4): BoardSearch[] {
  const searches: BoardSearch[] = [];
  const seen = new Set<string>();
  for (const watch of watches) {
    if (!watch.enabled) continue;
    const location = splitList(watch.location)[0] ?? "";
    for (const phrase of splitList(watch.keywords)) {
      const search: BoardSearch = {
        phrase,
        location,
        remoteOnly: watch.remoteOnly,
        sponsorship: watch.sponsorship === "required",
        newGrad: watch.newGradOnly,
      };
      const key = JSON.stringify(search);
      if (seen.has(key)) continue;
      seen.add(key);
      searches.push(search);
      if (searches.length >= limit) return searches;
    }
  }
  return searches;
}

export function searchKey(searches: BoardSearch[]): string {
  return JSON.stringify(searches);
}
