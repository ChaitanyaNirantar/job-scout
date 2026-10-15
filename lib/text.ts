export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function compact(value: string): string {
  return normalize(value).replace(/ /g, "");
}

export function splitList(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function excerpt(value: string, max = 220): string {
  const text = stripHtml(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function includesPhrase(haystack: string, phrase: string): boolean {
  const needle = normalize(phrase);
  if (!needle) return false;
  const hay = normalize(haystack);
  if (!hay) return false;
  if (needle.length <= 3) {
    return hay.split(" ").includes(needle);
  }
  if (hay.includes(needle)) return true;
  return compact(hay).includes(compact(needle));
}

export function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\r\n]+/g, " ").replace(/[ \t]+/g, " ").trim().slice(0, max);
}
