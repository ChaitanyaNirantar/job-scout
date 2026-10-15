import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatNextRun, isScheduleDue, nextRunDate } from "./time";

describe("daily schedule", () => {
  const zone = "America/New_York";

  it("waits until the chosen local time", () => {
    const before = new Date("2026-10-15T11:30:00.000Z");
    assert.equal(
      isScheduleDue({ hour: 8, minute: 0, timezone: zone, lastScheduledOn: null }, before),
      false,
    );
  });

  it("is due after the slot if it has not run today", () => {
    const after = new Date("2026-10-15T12:05:00.000Z");
    assert.equal(
      isScheduleDue({ hour: 8, minute: 0, timezone: zone, lastScheduledOn: null }, after),
      true,
    );
    assert.equal(
      isScheduleDue({ hour: 8, minute: 0, timezone: zone, lastScheduledOn: "2026-10-15" }, after),
      false,
    );
  });

  it("names the next run in the watcher’s timezone", () => {
    const morning = new Date("2026-10-15T11:30:00.000Z");
    const next = nextRunDate({ hour: 8, minute: 0, timezone: zone, lastScheduledOn: null }, morning);
    assert.equal(next.toISOString(), "2026-10-15T12:00:00.000Z");
    assert.equal(formatNextRun(next, zone, morning), "Today at 8:00 AM");
  });
});
