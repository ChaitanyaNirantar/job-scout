import type { Sponsorship } from "@/lib/types";

const NEGATIVE = [
  "no sponsorship",
  "not sponsor",
  "cannot sponsor",
  "can't sponsor",
  "unable to sponsor",
  "will not sponsor",
  "do not sponsor",
  "does not sponsor",
  "sponsorship is not",
  "sponsorship not available",
  "without sponsorship",
  "no visa",
  "visa sponsorship is not",
  "citizens only",
  "us citizens only",
  "must be authorized to work",
  "must be authorised to work",
  "must be legally authorized",
  "no h1b",
  "no h-1b",
];

const POSITIVE = [
  "visa sponsorship",
  "sponsorship available",
  "will sponsor",
  "we sponsor",
  "sponsor visa",
  "h1b sponsor",
  "h-1b sponsor",
  "sponsorship provided",
  "provides sponsorship",
  "open to sponsorship",
];

const NEW_GRAD = [
  "new grad",
  "new graduate",
  "recent graduate",
  "recent grad",
  "entry level",
  "early career",
  "university graduate",
  "college graduate",
  "campus hire",
  "graduate role",
  "class of 2026",
  "class of 2027",
  "class of 2028",
  "2026 grad",
  "2027 grad",
  "2028 grad",
  "2026 start",
  "2027 start",
  "2028 start",
];

const SENIOR = ["senior", "staff", "principal", "director", "head", "sr", "snr"];
const LEVELED = new Set(["ii", "iii", "iv", "v"]);

function hay(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function packed(value: string): string {
  return hay(value).replace(/ /g, "");
}

export function detectSponsorship(text: string): Sponsorship {
  const normalized = hay(text);
  const compact = packed(text);
  if (compact.includes("noh1b") || NEGATIVE.some((phrase) => normalized.includes(hay(phrase)))) {
    return "none";
  }
  if (POSITIVE.some((phrase) => normalized.includes(hay(phrase)))) return "explicit";
  if (compact.includes("h1b")) return "likely";
  return "unknown";
}

function titleWords(title: string): string[] {
  return hay(title)
    .split(" ")
    .map((word) => word.replace(/\++$/g, ""))
    .filter(Boolean);
}

export function isSeniorTitle(title: string): boolean {
  const words = titleWords(title);
  return SENIOR.some((word) => words.includes(word));
}

export function isLeveledTitle(title: string): boolean {
  return titleWords(title).some((word) => LEVELED.has(word));
}

export function mentionsNewGrad(text: string): boolean {
  const normalized = hay(text);
  if (NEW_GRAD.some((phrase) => normalized.includes(hay(phrase)))) return true;
  const words = normalized.split(" ");
  if (words.includes("junior")) return true;
  const title = hay(text.split("\n")[0] ?? text);
  return /\b20(26|27|28)\b/.test(title);
}

export function detectNewGrad(text: string): boolean {
  const title = text.split("\n")[0] ?? text;
  if ((isSeniorTitle(title) || isLeveledTitle(title)) && !mentionsNewGrad(title)) return false;
  return mentionsNewGrad(text);
}
