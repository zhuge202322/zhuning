const CANONICAL_LOCAL_ASSET = /^\/uploads\/[A-Za-z0-9][A-Za-z0-9._-]*\.(?:jpg|jpeg|png|webp|avif|mp4)$/i;
const TARGET_PATTERN = /\/uploads(?:\/|\\)[^\s"'<>)]*/gi;
const START_BOUNDARY = /["'(\s=>]/;

export function inspectLocalMediaUrls(input) {
  const urls = new Set();
  const invalid = new Set();
  const legacyBases = new Set();
  const visit = (value) => {
    if (typeof value === "string") {
      TARGET_PATTERN.lastIndex = 0;
      for (const match of value.matchAll(TARGET_PATTERN)) {
        const candidate = match[0];
        const index = match.index ?? 0;
        const startsCleanly = index === 0 || START_BOUNDARY.test(value[index - 1]);
        const queryIndex = candidate.search(/[?#]/);
        if (queryIndex > 0) {
          const base = candidate.slice(0, queryIndex);
          if (CANONICAL_LOCAL_ASSET.test(base)) legacyBases.add(base);
        }
        if (startsCleanly && CANONICAL_LOCAL_ASSET.test(candidate) && !candidate.includes("%") && !candidate.includes("\\") && !candidate.includes("..")) urls.add(candidate);
        else invalid.add(candidate);
      }
    } else if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (value && typeof value === "object") {
      Object.values(value).forEach(visit);
    }
  };
  visit(input);
  return { urls: [...urls], invalid: [...invalid], legacyBases: [...legacyBases] };
}

export function collectLocalMediaUrls(input) {
  return inspectLocalMediaUrls(input).urls;
}
