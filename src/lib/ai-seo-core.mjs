import { createCipheriv, createDecipheriv, createHash, randomBytes as cryptoRandomBytes } from "node:crypto";
import { isSafePublicUrl } from "./seo-core.mjs";

const TITLE_MAX = 70;
const DESCRIPTION_MAX = 170;
const KEYWORD_MAX = 12;

function encryptionKey(secret) {
  if (typeof secret !== "string" || secret.trim().length < 12) throw new Error("AI encryption secret is not configured");
  return createHash("sha256").update(secret).digest();
}

export function encryptApiKey(apiKey, secret, randomBytes = cryptoRandomBytes) {
  if (typeof apiKey !== "string" || !apiKey.trim() || apiKey.length > 4096) throw new Error("Invalid API key");
  const iv = randomBytes(12);
  if (!Buffer.isBuffer(iv) || iv.length !== 12) throw new Error("Invalid encryption nonce");
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(apiKey.trim(), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptApiKey(payload, secret) {
  const [version, ivValue, tagValue, encryptedValue] = String(payload || "").split(".");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) throw new Error("Invalid encrypted API key");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(secret), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
}

export function maskApiKey(apiKey) {
  const value = String(apiKey || "");
  return value ? `••••${value.slice(-4)}` : "";
}

export function validateAiConfig(input) {
  if (!input || typeof input !== "object") return { ok: false, error: "AI 配置格式无效" };
  const endpoint = typeof input.endpoint === "string" ? input.endpoint.trim() : "";
  const model = typeof input.model === "string" ? input.model.trim() : "";
  let url;
  try {
    url = new URL(endpoint);
  } catch {
    return { ok: false, error: "API 地址格式无效" };
  }
  if (url.protocol !== "https:" || url.username || url.password || endpoint.length > 500) {
    return { ok: false, error: "API 地址必须是 HTTPS 地址" };
  }
  if (!model || model.length > 120 || !/^[\w./:-]+$/.test(model)) return { ok: false, error: "模型名称无效" };
  if (typeof input.enabled !== "boolean") return { ok: false, error: "启用状态无效" };
  if (input.apiKey !== undefined && (typeof input.apiKey !== "string" || input.apiKey.length > 4096)) {
    return { ok: false, error: "API Key 无效" };
  }
  return { ok: true, value: { endpoint: url.toString(), model, enabled: input.enabled, apiKey: input.apiKey?.trim() || "" } };
}

function normalizeKeywords(value) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return [...new Set(values.filter((item) => typeof item === "string").map((item) => item.trim()).filter(Boolean))].slice(0, KEYWORD_MAX);
}

function parseJsonObject(text) {
  const source = String(text || "").trim();
  const fenced = source.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  for (const candidate of [fenced, source]) {
    if (!candidate) continue;
    try {
      const value = JSON.parse(candidate.trim());
      if (value && typeof value === "object" && !Array.isArray(value)) return value;
    } catch {
      // Try a bounded object embedded in provider text.
    }
  }
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const value = JSON.parse(source.slice(start, end + 1));
      if (value && typeof value === "object" && !Array.isArray(value)) return value;
    } catch {
      return null;
    }
  }
  return null;
}

export function parseAiSeoResponse(text) {
  if (String(text || "").length > 100_000) return { ok: false, error: "AI 返回内容过大" };
  const value = parseJsonObject(text);
  if (!value) return { ok: false, error: "AI 未返回有效 JSON" };
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const description = typeof value.description === "string" ? value.description.trim() : "";
  if (!title || title.length > TITLE_MAX) return { ok: false, error: `SEO 标题必须为 1-${TITLE_MAX} 个字符` };
  if (!description || description.length > DESCRIPTION_MAX) return { ok: false, error: `SEO 描述必须为 1-${DESCRIPTION_MAX} 个字符` };
  const ogImage = typeof value.ogImage === "string" && isSafePublicUrl(value.ogImage) ? value.ogImage.trim() : "";
  return {
    ok: true,
    draft: {
      title,
      description,
      keywords: normalizeKeywords(value.keywords),
      canonicalUrl: "",
      ogImage,
      robots: "index,follow",
    },
  };
}

export function extractChatCompletionContent(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("AI 响应缺少文本内容");
  return content;
}
