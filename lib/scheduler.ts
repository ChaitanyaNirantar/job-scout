import { schedule } from "node-cron";
import { runScheduledCheck } from "@/lib/service";

let started = false;

async function tick() {
  try {
    await runScheduledCheck();
  } catch (error) {
    console.error("[brief] daily check failed", error);
  }
}

export function startScheduler() {
  if (started) return;
  started = true;
  const globalState = globalThis as typeof globalThis & { __briefScheduler?: boolean };
  if (globalState.__briefScheduler) return;
  globalState.__briefScheduler = true;

  schedule("* * * * *", () => tick(), {
    name: "brief-daily",
    noOverlap: true,
  });

  setTimeout(() => {
    void tick();
  }, 5000);
}
