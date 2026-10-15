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

const US_COUNTRY = new Set(["united states", "united states of america", "usa", "us", "u s", "u s a"]);

const US_STATE_NAMES = [
  "alabama",
  "alaska",
  "arizona",
  "arkansas",
  "california",
  "colorado",
  "connecticut",
  "delaware",
  "florida",
  "georgia",
  "hawaii",
  "idaho",
  "illinois",
  "indiana",
  "iowa",
  "kansas",
  "kentucky",
  "louisiana",
  "maine",
  "maryland",
  "massachusetts",
  "michigan",
  "minnesota",
  "mississippi",
  "missouri",
  "montana",
  "nebraska",
  "nevada",
  "new hampshire",
  "new jersey",
  "new mexico",
  "new york",
  "north carolina",
  "north dakota",
  "ohio",
  "oklahoma",
  "oregon",
  "pennsylvania",
  "rhode island",
  "south carolina",
  "south dakota",
  "tennessee",
  "texas",
  "utah",
  "vermont",
  "virginia",
  "washington",
  "west virginia",
  "wisconsin",
  "wyoming",
  "district of columbia",
];

const US_STATE_CODES = [
  "al",
  "ak",
  "az",
  "ar",
  "ca",
  "co",
  "ct",
  "dc",
  "fl",
  "ga",
  "hi",
  "ia",
  "id",
  "il",
  "in",
  "ks",
  "ky",
  "la",
  "ma",
  "md",
  "me",
  "mi",
  "mn",
  "mo",
  "ms",
  "mt",
  "nc",
  "nd",
  "ne",
  "nh",
  "nj",
  "nm",
  "nv",
  "ny",
  "oh",
  "ok",
  "or",
  "pa",
  "ri",
  "sc",
  "sd",
  "tn",
  "tx",
  "ut",
  "va",
  "vt",
  "wa",
  "wi",
  "wv",
  "wy",
];

function isUnitedStates(place: string): boolean {
  return US_COUNTRY.has(normalize(place));
}

function inUnitedStates(location: string): boolean {
  const hay = normalize(location);
  if (!hay) return false;
  if (hay.includes("united states") || hay.split(" ").includes("usa")) return true;
  if (US_STATE_NAMES.some((state) => hay.includes(state))) return true;
  const words = new Set(hay.split(" ").filter(Boolean));
  return US_STATE_CODES.some((code) => words.has(code));
}

function placeHits(location: string, place: string): boolean {
  if (locationSynonyms(place).some((synonym) => includesPhrase(location, synonym))) return true;
  return isUnitedStates(place) && inUnitedStates(location);
}

export type MatchableJob = Pick<
  FeedJob,
  "title" | "company" | "location" | "tags" | "remote"
> &
  Partial<Pick<FeedJob, "sponsorship" | "newGrad">>;

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
  if (watch.sponsorship === "required") {
    const sponsorship = job.sponsorship ?? "unknown";
    if (sponsorship !== "explicit" && sponsorship !== "likely") return false;
  }
  if (watch.newGradOnly && !job.newGrad) return false;

  const places = splitList(watch.location);
  if (places.length > 0) {
    const matched = places.some((place) => placeHits(job.location, place));
    if (!matched) return false;
  }

  const excluded = splitList(watch.exclude);
  if (excluded.some((phrase) => phraseHits(job, phrase))) return false;

  return phrases.some((phrase) => phraseHits(job, phrase));
}

export function matchingWatchIds(job: MatchableJob, watches: Watch[]): string[] {
  return watches.filter((watch) => jobMatchesWatch(job, watch)).map((watch) => watch.id);
}
