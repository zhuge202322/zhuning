const URL_CONTINUATION = /[A-Za-z0-9\-._~:/?#[\]@!$&*+,;=%]/;

function exactOccurrences(value, url) {
  if (typeof value !== "string" || typeof url !== "string" || !url) return [];
  const matches = [];
  let offset = 0;
  while (offset <= value.length - url.length) {
    const index = value.indexOf(url, offset);
    if (index < 0) break;
    const before = index > 0 ? value[index - 1] : "";
    const afterIndex = index + url.length;
    const after = afterIndex < value.length ? value[afterIndex] : "";
    if ((!before || !URL_CONTINUATION.test(before)) && (!after || !URL_CONTINUATION.test(after))) matches.push(index);
    offset = index + Math.max(url.length, 1);
  }
  return matches;
}

export function containsExactMediaUrl(value, url) {
  return exactOccurrences(value, url).length > 0;
}

export function containsMediaReference(value, url) {
  if (containsExactMediaUrl(value, url)) return true;
  if (typeof value !== "string") return false;
  let offset = 0;
  while (offset <= value.length - url.length) {
    const index = value.indexOf(url, offset);
    if (index < 0) return false;
    const before = index > 0 ? value[index - 1] : "";
    const after = value[index + url.length] || "";
    if ((!before || !URL_CONTINUATION.test(before)) && (after === "?" || after === "#")) return true;
    offset = index + url.length;
  }
  return false;
}

export function replaceExactMediaUrl(value, oldUrl, newUrl) {
  const occurrences = exactOccurrences(value, oldUrl);
  if (!occurrences.length) return value;
  let result = "";
  let offset = 0;
  for (const index of occurrences) {
    result += value.slice(offset, index) + newUrl;
    offset = index + oldUrl.length;
  }
  return result + value.slice(offset);
}

export function replaceMediaReferenceUrl(value, oldUrl, newUrl) {
  if (typeof value !== "string" || !containsMediaReference(value, oldUrl)) return value;
  let result = "";
  let offset = 0;
  while (offset < value.length) {
    const index = value.indexOf(oldUrl, offset);
    if (index < 0) return result + value.slice(offset);
    const before = index > 0 ? value[index - 1] : "";
    const after = value[index + oldUrl.length] || "";
    const valid = (!before || !URL_CONTINUATION.test(before)) && (!after || !URL_CONTINUATION.test(after) || after === "?" || after === "#");
    result += value.slice(offset, index) + (valid ? newUrl : oldUrl);
    offset = index + oldUrl.length;
  }
  return result;
}
