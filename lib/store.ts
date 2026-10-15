import fs from "node:fs";
import path from "node:path";
import type { Database, Settings } from "@/lib/types";

const dataFile = path.join(process.cwd(), "data", "brief.json");

export function defaultSettings(): Settings {
  return {
    hour: 8,
    minute: 0,
    timezone: "UTC",
    timezoneChosen: false,
    desktopNotifications: false,
    webhookUrl: "",
    lastRunAt: null,
    lastRunNewCount: 0,
    lastRunError: null,
    lastScheduledOn: null,
    lastManualAt: null,
  };
}

export function emptyDb(): Database {
  return {
    version: 1,
    watches: [],
    jobs: [],
    notices: [],
    settings: defaultSettings(),
    feedCache: {},
    feedStatus: {},
  };
}

function readDb(): Database {
  try {
    const raw = fs.readFileSync(dataFile, "utf8");
    const parsed = JSON.parse(raw) as Partial<Database>;
    return {
      ...emptyDb(),
      ...parsed,
      settings: { ...defaultSettings(), ...parsed.settings },
      watches: parsed.watches ?? [],
      jobs: parsed.jobs ?? [],
      notices: parsed.notices ?? [],
      feedCache: parsed.feedCache ?? {},
      feedStatus: parsed.feedStatus ?? {},
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("[brief] could not read the saved desk, starting fresh", error);
    }
    return emptyDb();
  }
}

function writeDb(db: Database) {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  const temporary = `${dataFile}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(db));
  fs.renameSync(temporary, dataFile);
}

let chain: Promise<unknown> = Promise.resolve();

export function withDb<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const db = readDb();
    const result = await fn(db);
    writeDb(db);
    return result;
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
