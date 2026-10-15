import type { FeedJob, Watch } from "@/lib/types";
import { compact, includesPhrase, normalize, splitList } from "@/lib/text";

const PLACE_ALIASES: Record<string, string[]> = {
  munich: ["munchen", "muenchen"],
  cologne: ["koln", "koeln"],
  nuremberg: ["nurnberg", "nuernberg"],
  vienna: ["wien"],
  prague: ["praha"],
  lisbon: ["lisboa"],
  brussels: ["bruxelles", "brussel"],
  geneva: ["geneve"],
  zurich: ["zuerich"],
  milan: ["milano"],
  rome: ["roma"],
  florence: ["firenze"],
  naples: ["napoli"],
  venice: ["venezia"],
  seville: ["sevilla"],
};

function locationSynonyms(place: string): string[] {
  const normalized = normalize(place);
  return [place, ...(PLACE_ALIASES[normalized] ?? [])];
}

export type MatchableJob = Pick<
  FeedJob,
  "title" | "company" | "location" | "tags" | "remote"
>;

function includesWord(haystack: string, word: string): boolean {
  const needle = normalize(word);
  if (!needle) return false;
  const words = normalize(haystack).split(" ").filter(Boolean);
  if (words.includes(needle)) return true;
  const packed = compact(word);
  return words.some((entry) => compact(entry) === packed);
}

function phraseHits(job: MatchableJob, phrase: string): boolean {
  if (includesPhrase(job.title, phrase)) return true;
  if (job.tags.some((tag) => includesPhrase(tag, phrase))) return true;
  const words = normalize(phrase).split(" ").filter(Boolean);
  if (words.length < 2) return false;
  const blob = `${job.title} ${job.tags.join(" ")}`;
  return words.every((word) => includesWord(blob, word));
}

export function jobMatchesWatch(job: MatchableJob, watch: Watch): boolean {
  const phrases = splitList(watch.keywords);
  if (phrases.length === 0) return false;
  if (watch.remoteOnly && !job.remote) return false;

  const places = splitList(watch.location);
  if (places.length > 0) {
    const matched = places.some((place) =>
      locationSynonyms(place).some((synonym) => includesPhrase(job.location, synonym)),
    );
    if (!matched) return false;
  }

  const excluded = splitList(watch.exclude);
  if (excluded.some((phrase) => phraseHits(job, phrase))) return false;

  return phrases.some((phrase) => phraseHits(job, phrase));
}

export function matchingWatchIds(job: MatchableJob, watches: Watch[]): string[] {
  return watches.filter((watch) => jobMatchesWatch(job, watch)).map((watch) => watch.id);
}
