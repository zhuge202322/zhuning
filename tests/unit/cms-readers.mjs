import assert from "node:assert/strict";
import test from "node:test";

import { normalizePageSections, normalizeSiteSettings } from "../../src/lib/cms-readers-core.mjs";

test("site settings retain non-empty defaults for missing and empty database values", () => {
  const defaults = [
    { key: "site.name", value: "Muxcor", type: "text", group: "brand" },
    { key: "support.phone", value: "", type: "text", group: "support" },
  ];
  const registry = {
    "site.name": { label: "Website name", type: "text", group: "brand" },
    "support.phone": { label: "Phone", type: "text", group: "support" },
  };
  const normalized = normalizeSiteSettings(defaults, registry, [
    { id: 7, key: "site.name", value: "   ", type: "text", group: "brand" },
  ]);

  assert.equal(normalized[0].value, "Muxcor");
  assert.equal(normalized[0].id, 7);
  assert.equal(normalized[1].value, "");
  assert.equal(normalized[1].id, null);
});

test("page sections merge missing and empty fields with the seed fallback", () => {
  const defaults = [{
    pageKey: "home", sectionKey: "hero", sectionType: "text-media", eyebrow: "Default eyebrow",
    title: "Default title", body: "Default body", buttonLabel: "Browse", buttonHref: "/products",
    mediaUrl: "/hero.webp", mediaAlt: "Hero", dataJson: '{"slides":[1]}', sortOrder: 0, enabled: true,
  }];
  const registry = { sections: { hero: ["slides"] } };
  const normalized = normalizePageSections("home", defaults, registry, [{
    id: 9, pageKey: "home", sectionKey: "hero", sectionType: "text-media", eyebrow: "",
    title: "Database title", body: " ", buttonLabel: "", buttonHref: "", mediaUrl: "", mediaAlt: "",
    dataJson: "{}", sortOrder: 30, enabled: false,
  }]);

  assert.equal(normalized[0].title, "Database title");
  assert.equal(normalized[0].body, "Default body");
  assert.equal(normalized[0].mediaUrl, "/hero.webp");
  assert.equal(normalized[0].dataJson, '{"slides":[1]}');
  assert.equal(normalized[0].sortOrder, 30);
  assert.equal(normalized[0].enabled, false);
});

test("page sections deeply merge partial dataJson while database arrays replace defaults", () => {
  const defaults = [{
    pageKey: "home", sectionKey: "craft", sectionType: "text-media", eyebrow: "", title: "", body: "",
    buttonLabel: "", buttonHref: "", mediaUrl: "", mediaAlt: "",
    dataJson: JSON.stringify({
      video: { src: "/default.mp4", poster: "/default.webp" },
      steps: ["one", "two"],
      limit: 8,
    }),
    sortOrder: 0, enabled: true,
  }];
  const registry = { sections: { craft: ["video", "steps", "limit"] } };
  const normalized = normalizePageSections("home", defaults, registry, [{
    pageKey: "home", sectionKey: "craft",
    dataJson: JSON.stringify({
      video: { poster: "/edited.webp" },
      steps: [],
      limit: 4,
    }),
  }]);

  assert.deepEqual(JSON.parse(normalized[0].dataJson), {
    video: { src: "/default.mp4", poster: "/edited.webp" },
    steps: [],
    limit: 4,
  });
});
