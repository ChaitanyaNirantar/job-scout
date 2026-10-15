import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseLinkedInHtml } from "./linkedin";
import { parseJobrightReadme, parseLooseDate } from "./jobright";
import { finalizeJob } from "./normalize";
import { detectNewGrad, detectSponsorship } from "./signals";

describe("signals", () => {
  it("tells sponsorship and new-grad language apart", () => {
    assert.equal(detectSponsorship("We provide visa sponsorship for this role."), "explicit");
    assert.equal(detectSponsorship("No sponsorship available. Must be authorized to work."), "none");
    assert.equal(detectSponsorship("No H-1B. Citizens only."), "none");
    assert.equal(detectSponsorship("Backend engineer"), "unknown");
    assert.equal(detectNewGrad("New Grad Software Engineer"), true);
    assert.equal(detectNewGrad("Senior Software Engineer"), false);
    assert.equal(detectNewGrad("Sr. Software Engineer"), false);
    assert.equal(detectNewGrad("Staff+ Software Engineer"), false);
    assert.equal(detectNewGrad("Software Engineer II"), false);
    assert.equal(detectNewGrad("Software Engineer III"), false);
    assert.equal(detectNewGrad("Software Engineer, 2027 New Grad"), true);
    assert.equal(detectNewGrad("Software Engineer"), false);
  });
});

describe("linkedin cards", () => {
  it("reads a guest search card", () => {
    const html = `
      <li>
        <div data-entity-urn="urn:li:jobPosting:99">
          <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/product-designer-99?trk=public"></a>
          <h3 class="base-search-card__title">Product Designer</h3>
          <h4 class="base-search-card__subtitle"><a>Northwind</a></h4>
          <span class="job-search-card__location">New York, NY (Remote)</span>
          <time datetime="2026-10-14">yesterday</time>
        </div>
      </li>`;
    const jobs = parseLinkedInHtml(html, { sponsorship: true, newGrad: true });
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].title, "Product Designer");
    assert.equal(jobs[0].company, "Northwind");
    assert.equal(jobs[0].remote, true);
    assert.equal(jobs[0].url, "https://www.linkedin.com/jobs/view/product-designer-99");
    assert.equal(jobs[0].sponsorship, "likely");
    assert.equal(jobs[0].newGrad, true);
    assert.equal(jobs[0].id, "linkedin:99");
  });

  it("does not keep a leveled title as new grad just because the search was entry-level", () => {
    const html = `
      <li>
        <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/software-engineer-iii-7"></a>
        <h3 class="base-search-card__title">Software Engineer III</h3>
        <h4 class="base-search-card__subtitle">Northwind</h4>
        <span class="job-search-card__location">Columbus, OH</span>
        <time datetime="2026-10-14">yesterday</time>
      </li>`;
    const [draft] = parseLinkedInHtml(html, { sponsorship: false, newGrad: true });
    const job = finalizeJob(draft);
    assert.equal(job.newGrad, false);
  });
});

describe("jobright lists", () => {
  it("reads a new-grad row and an H-1B row", () => {
    const now = new Date("2026-10-15T12:00:00.000Z");
    const fresh = parseJobrightReadme(
      "| **[Roblox](https://corp.roblox.com)** | **[Associate Product Designer, Early Career](https://jobright.ai/jobs/info/abc123?utm_source=1103)** | San Mateo, CA | Hybrid | Oct 15 |",
      "new-grad",
      now,
    );
    assert.equal(fresh.length, 1);
    assert.equal(fresh[0].company, "Roblox");
    assert.equal(fresh[0].title, "Associate Product Designer, Early Career");
    assert.equal(fresh[0].url, "https://jobright.ai/jobs/info/abc123");
    assert.equal(fresh[0].newGrad, true);
    assert.equal(fresh[0].remote, false);

    const sponsored = parseJobrightReadme(
      "| **[Vercel](https://vercel.com)** | Senior Software Engineer | Senior | REMOTE | 🥈 | [apply](https://jobright.ai/jobs/info/def456?utm_source=1008) | 2026-10-14 |",
      "h1b",
      now,
    );
    assert.equal(sponsored.length, 1);
    assert.equal(sponsored[0].sponsorship, "likely");
    assert.equal(sponsored[0].newGrad, false);
    assert.equal(sponsored[0].remote, true);
    assert.equal(parseLooseDate("Oct 15", now), "2026-10-15T00:00:00.000Z");
  });
});
