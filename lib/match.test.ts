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
    sponsorship: "any",
    newGradOnly: false,
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

  it("does not match a longer word that merely contains one of the terms", () => {
    const hit = jobMatchesWatch(
      {
        title: "Graphic Designer (Promo)",
        company: "Neo Group",
        location: "Serbia",
        tags: ["Promotional-Products-Designer", "Graphic-Designer"],
        remote: true,
      },
      watch({ keywords: "product designer" }),
    );
    assert.equal(hit, false);
  });

  it("treats United States as US cities and states", () => {
    const places = watch({ keywords: "software engineer", location: "United States" });
    assert.equal(
      jobMatchesWatch(
        {
          title: "Software Engineer",
          company: "Northwind",
          location: "San Francisco, CA",
          tags: [],
          remote: false,
        },
        places,
      ),
      true,
    );
    assert.equal(
      jobMatchesWatch(
        {
          title: "Software Engineer",
          company: "Northwind",
          location: "Berlin, Germany",
          tags: [],
          remote: false,
        },
        places,
      ),
      false,
    );
    assert.equal(
      jobMatchesWatch(
        {
          title: "Software Engineer",
          company: "Northwind",
          location: "Remote",
          tags: [],
          remote: true,
        },
        places,
      ),
      false,
    );
  });

  it("matches a sponsored 2027 data role in a chosen place", () => {
    const data = watch({
      keywords: "data analyst, data scientist, data engineer",
      location: "Austin, Seattle",
      sponsorship: "required",
      newGradOnly: true,
    });
    assert.equal(
      jobMatchesWatch(
        {
          title: "Data Analyst, 2027",
          company: "Northwind",
          location: "Austin, TX",
          tags: [],
          remote: false,
          sponsorship: "likely",
          newGrad: true,
        },
        data,
      ),
      true,
    );
    assert.equal(
      jobMatchesWatch(
        {
          title: "Data Analyst (Ads & Sponsorships)",
          company: "Northwind",
          location: "Austin, TX",
          tags: [],
          remote: false,
          sponsorship: "unknown",
          newGrad: true,
        },
        data,
      ),
      false,
    );
    assert.equal(
      jobMatchesWatch(
        {
          title: "Senior Data Scientist",
          company: "Northwind",
          location: "Seattle, WA",
          tags: [],
          remote: false,
          sponsorship: "likely",
          newGrad: false,
        },
        data,
      ),
      false,
    );
  });

  it("keeps visa sponsorship and new-grad filters independent of the role words", () => {
    const role = {
      title: "New Grad Product Designer",
      company: "Northwind",
      location: "Remote",
      tags: [],
      remote: true,
      sponsorship: "explicit" as const,
      newGrad: true,
    };
    assert.equal(jobMatchesWatch(role, watch({ sponsorship: "required", newGradOnly: true })), true);
    assert.equal(
      jobMatchesWatch(
        { ...role, sponsorship: "unknown", newGrad: true },
        watch({ sponsorship: "required" }),
      ),
      false,
    );
    assert.equal(
      jobMatchesWatch(
        { title: "Senior Product Designer", company: "Northwind", location: "Remote", tags: [], remote: true, newGrad: false },
        watch({ newGradOnly: true }),
      ),
      false,
    );
  });
});
