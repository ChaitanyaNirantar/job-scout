import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { linkedInKeywords } from "./linkedin";
import { remainingSearches, searchesFromWatches } from "./searches";
import type { Watch } from "./types";

function watch(overrides: Partial<Watch> = {}): Watch {
  return {
    id: "w1",
    name: "Data roles",
    keywords: "data analyst, data scientist, data engineer",
    location: "United States",
    exclude: "",
    remoteOnly: false,
    sponsorship: "required",
    newGradOnly: true,
    enabled: true,
    createdAt: "2026-10-16T00:00:00.000Z",
    ...overrides,
  };
}

describe("searchesFromWatches", () => {
  it("covers every data title and asks LinkedIn for entry level and the class of 2027", () => {
    const searches = searchesFromWatches([watch()], 4);
    assert.equal(searches.length, 2);
    assert.equal(searches[0].phrase, '"data analyst" OR "data scientist" OR "data engineer"');
    assert.equal(searches[0].location, "United States");
    assert.equal(searches[0].sponsorship, true);
    assert.equal(searches[0].newGrad, true);
    assert.equal(searches[0].gradYear, false);
    assert.equal(searches[1].gradYear, true);
    assert.match(linkedInKeywords(searches[0]), /visa sponsorship/);
    assert.match(linkedInKeywords(searches[1]), /2027/);
    assert.equal(linkedInKeywords(searches[0]).includes("2027"), false);
  });

  it("remembers finished LinkedIn searches and leaves the rest for the next pass", () => {
    const desired = searchesFromWatches([watch({ location: "Austin, Seattle" })], 4);
    const done = desired.slice(0, 2);
    const pending = remainingSearches(desired, done);
    assert.equal(pending.length, desired.length - 2);
    assert.equal(pending.some((search) => JSON.stringify(search) === JSON.stringify(done[0])), false);
  });

  it("searches each chosen place", () => {
    const searches = searchesFromWatches([watch({ newGradOnly: false, location: "Austin, Seattle" })]);
    assert.deepEqual(
      searches.map((search) => search.location),
      ["Austin", "Seattle"],
    );
  });
});
