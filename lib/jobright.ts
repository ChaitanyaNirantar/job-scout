import { isSeniorTitle } from "@/lib/signals";
import { stripHtml } from "@/lib/text";
import type { DraftJob } from "@/lib/normalize";

const NEW_GRAD_REPOS = [
  "2026-Software-Engineer-New-Grad",
  "2026-Engineering-New-Grad",
  "2026-Design-New-Grad",
  "2026-Product-Management-New-Grad",
  "2026-Data-Analysis-New-Grad",
  "2026-Marketing-New-Grad",
  "2026-Sales-New-Grad",
  "2026-Business-Analyst-New-Grad",
  "2026-Account-New-Grad",
  "2026-Consultant-New-Grad",
  "2026-Management-New-Grad",
  "2026-HR-New-Grad",
  "2026-Art-New-Grad",
];

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const WORK_MODELS = new Set(["remote", "hybrid", "on site", "onsite"]);

function cellText(cell: string): string {
  const withoutLinks = cell.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  return stripHtml(withoutLinks).replace(/\*/g, "").replace(/\s+/g, " ").trim();
}

function jobHref(cell: string): string | null {
  const matches = [...cell.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)];
  const job = matches.find((match) => match[1].includes("jobright.ai/jobs/"));
  return job?.[1] ?? null;
}

export function parseLooseDate(value: string, now = new Date()): string | null {
  const trimmed = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))).toISOString();
  const monthDay = /^([A-Za-z]{3,9})\s+(\d{1,2})$/.exec(trimmed);
  if (!monthDay) return null;
  const month = MONTHS[monthDay[1].slice(0, 3).toLowerCase()];
  if (!month) return null;
  const day = Number(monthDay[2]);
  let year = now.getUTCFullYear();
  let stamp = Date.UTC(year, month - 1, day);
  if (stamp > now.getTime() + 2 * 24 * 60 * 60 * 1000) {
    year -= 1;
    stamp = Date.UTC(year, month - 1, day);
  }
  return new Date(stamp).toISOString();
}

function isDateCell(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) || /^[A-Za-z]{3,9}\s+\d{1,2}$/.test(value.trim());
}

export function parseJobrightReadme(
  markdown: string,
  list: "new-grad" | "h1b",
  now = new Date(),
): DraftJob[] {
  const jobs: DraftJob[] = [];
  let lastCompany = "";
  for (const line of markdown.split("\n")) {
    if (!line.startsWith("|") || line.includes("---") || /job title/i.test(line)) continue;
    const cells = line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|");
    const hrefCell = cells.find((cell) => jobHref(cell));
    const href = hrefCell ? jobHref(hrefCell) : null;
    if (!href) continue;
    const linkText = cellText(hrefCell ?? "");
    const title = !linkText || /^apply$/i.test(linkText) ? cellText(cells[1] ?? "") : linkText;
    if (!title) continue;
    const dateCell = [...cells].reverse().find((cell) => isDateCell(cellText(cell)));
    const postedAt = dateCell ? parseLooseDate(cellText(dateCell), now) : null;
    if (!postedAt) continue;
    const companyCell = cellText(cells[0] ?? "");
    const company = companyCell && companyCell !== "↳" ? companyCell : lastCompany;
    if (company) lastCompany = company;
    const extras = cells
      .filter((cell) => cell !== hrefCell && cell !== dateCell)
      .map(cellText)
      .filter((text) => text && text !== company && text !== title && text !== "↳");
    const workModel = extras.find((text) => WORK_MODELS.has(text.toLowerCase())) ?? "";
    const level = extras.find((text) => /intern|junior|mid|senior|staff|principal|director|new grad|entry/i.test(text));
    const location =
      extras.find((text) => text !== workModel && text !== level && !/[🏅🥈]/.test(text)) ||
      (workModel.toLowerCase() === "remote" ? "Remote" : "");
    const medal = cells.some((cell) => cell.includes("🏅"));
    const likely = cells.some((cell) => cell.includes("🥈"));
    const idMatch = /jobs\/info\/([a-z0-9]+)/i.exec(href);
    const remote = workModel.toLowerCase() === "remote" || /^remote$/i.test(location);
    const senior = isSeniorTitle(title) || (level ? isSeniorTitle(level) : false);
    jobs.push({
      id: `jobright:${idMatch?.[1] || title}`,
      source: "jobright",
      title,
      company: company || "Company not listed",
      location: location || (list === "h1b" ? "United States" : "Location not listed"),
      url: href.split("?")[0],
      excerpt: "",
      tags: level ? [level] : [],
      salary: null,
      remote,
      postedAt,
      sponsorship: medal ? "explicit" : likely ? "likely" : "unknown",
      newGrad: list === "new-grad" ? !senior : !senior && (mentionsLevel(level) || mentionsLevel(title)),
    });
  }
  return jobs;
}

function mentionsLevel(value: string | undefined): boolean {
  if (!value) return false;
  return /new grad|entry|junior/i.test(value);
}

const PER_LIST_CAP = 200;

function newest(jobs: DraftJob[], limit: number): DraftJob[] {
  return jobs
    .slice()
    .sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt))
    .slice(0, limit);
}

async function fetchReadme(repo: string): Promise<string> {
  const response = await fetch(
    `https://raw.githubusercontent.com/jobright-ai/${repo}/master/README.md`,
    {
      headers: { Accept: "text/plain", "User-Agent": "BriefJobWatch/1.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!response.ok) throw new Error(`${repo} replied ${response.status}`);
  return response.text();
}

export async function fetchJobrightJobs(now = new Date()): Promise<{ jobs: DraftJob[]; error: string | null }> {
  const jobs: DraftJob[] = [];
  const failures: string[] = [];
  const reads = await Promise.all(
    [
      fetchReadme("Daily-H1B-Jobs-In-Tech")
        .then((markdown) => newest(parseJobrightReadme(markdown, "h1b", now), PER_LIST_CAP))
        .catch((error: unknown) => {
          failures.push(error instanceof Error ? error.message : "H1B list didn’t load");
          return [] as DraftJob[];
        }),
      ...NEW_GRAD_REPOS.map((repo) =>
        fetchReadme(repo)
          .then((markdown) => newest(parseJobrightReadme(markdown, "new-grad", now), PER_LIST_CAP))
          .catch(() => [] as DraftJob[]),
      ),
    ],
  );
  for (const batch of reads) jobs.push(...batch);
  const newGradFailed = reads.slice(1).every((batch) => batch.length === 0);
  const error =
    jobs.length === 0 && (failures.length > 0 || newGradFailed)
      ? "Jobright’s published lists didn’t load."
      : null;
  return { jobs, error };
}
