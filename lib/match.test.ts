import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { jobMatchesWatch } from "./match";
import type { Watch } from "./types";

function watch(overrides: Partial<Watch> = {}): Watch {
  return {
    id: "w1",
    name: "Design",
    keywords: "product designer",
    location: "",
    exclude: "",
    remoteOnly: false,
    enabled: true,
    createdAt: "2026-10-15T00:00:00.000Z",
    ...overrides,
  };
}

describe("jobMatchesWatch", () => {
  it("matches a phrase in the title, including hyphenated spellings", () => {
    const hit = jobMatchesWatch(
      {
        title: "Senior Front-End Engineer",
        company: "Northwind",
        location: "Remote",
        tags: ["react"],
        remote: true,
      },
      watch({ keywords: "frontend engineer" }),
    );
    assert.equal(hit, true);
  });

  it("matches when the words are split across the title and tags", () => {
    const hit = jobMatchesWatch(
      {
        title: "Staff Software Engineer",
        company: "Northwind",
        location: "Remote",
        tags: ["frontend"],
        remote: true,
      },
      watch({ keywords: "frontend engineer" }),
    );
    assert.equal(hit, true);
  });

  it("does not treat a short keyword as a substring", () => {
    const hit = jobMatchesWatch(
      {
        title: "Google Engineer",
        company: "Google",
        location: "Remote",
        tags: [],
        remote: true,
      },
      watch({ keywords: "go" }),
    );
    assert.equal(hit, false);
  });

  it("accepts any comma-separated role and skips excluded titles", () => {
    const roles = watch({ keywords: "product designer, brand designer", exclude: "intern, unpaid" });
    assert.equal(
      jobMatchesWatch(
        { title: "Brand Designer", company: "Kelp", location: "Remote", tags: [], remote: true },
        roles,
      ),
      true,
    );
    assert.equal(
      jobMatchesWatch(
        { title: "Product Design Intern", company: "Kelp", location: "Remote", tags: [], remote: true },
        roles,
      ),
      false,
    );
  });

  it("treats comma-separated places as alternatives", () => {
    const places = watch({ keywords: "engineer", location: "Berlin, London" });
    assert.equal(
      jobMatchesWatch(
        { title: "Backend Engineer", company: "Apaleo", location: "London, UK", tags: [], remote: false },
        places,
      ),
      true,
    );
    assert.equal(
      jobMatchesWatch(
        { title: "Backend Engineer", company: "Apaleo", location: "Munich, Germany", tags: [], remote: false },
        places,
      ),
      false,
    );
  });

  it("skips office roles when the watch is remote only", () => {
    const remote = watch({ keywords: "engineer", remoteOnly: true });
    assert.equal(
      jobMatchesWatch(
        { title: "Backend Engineer", company: "Apaleo", location: "Munich", tags: [], remote: false },
        remote,
      ),
      false,
    );
  });
});
