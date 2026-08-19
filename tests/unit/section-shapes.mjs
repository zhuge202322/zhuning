import assert from "node:assert/strict";
import test from "node:test";

import { pageSectionFallbacks } from "../../scripts/seed-cms.mjs";
import { validatePageSectionInput } from "../../src/lib/cms-registry-core.mjs";

test("every seeded page section satisfies the strict structured-content schema", () => {
  for (const section of pageSectionFallbacks) {
    const result = validatePageSectionInput(section);
    assert.equal(result.ok, true, `${section.pageKey}.${section.sectionKey}: ${result.error || "invalid"}`);
  }
});

test("strict structured-content schemas reject missing and unknown nested fields", () => {
  assert.equal(validatePageSectionInput({ pageKey: "home", sectionKey: "hero", dataJson: '{"slides":[{}]}' }).ok, false);
  assert.equal(validatePageSectionInput({
    pageKey: "about",
    sectionKey: "presentation",
    dataJson: '{"panels":[{"src":"/panel.webp","alt":"Panel","width":100,"height":100,"unexpected":true}]}',
  }).ok, false);
});
