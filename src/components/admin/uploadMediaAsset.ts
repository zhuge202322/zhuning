import type { MediaAsset } from "@/components/admin/MediaPicker";

export async function uploadMediaAsset(file: File, alt = ""): Promise<MediaAsset> {
  const response = file.type === "video/mp4"
    ? await fetch("/api/admin/media/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "x-filename": encodeURIComponent(file.name),
          "x-mime-type": file.type,
          "x-file-size": String(file.size),
          "x-alt": encodeURIComponent(alt),
        },
        body: file,
      })
    : await fetch("/api/admin/media/assets", { method: "POST", body: mediaForm(file, alt) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.asset?.url) throw new Error(data.error || `上传文件失败：${file.name}`);
  return data.asset;
}

function mediaForm(file: File, alt: string, expectedUpdatedAt?: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("alt", alt);
  if (expectedUpdatedAt) form.append("expectedUpdatedAt", expectedUpdatedAt);
  return form;
}

export async function replaceMediaAsset(asset: MediaAsset, file: File): Promise<{ asset: MediaAsset; cleanupWarning?: string }> {
  const response = file.type === "video/mp4"
    ? await fetch(`/api/admin/media/assets/${asset.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/octet-stream",
          "x-filename": encodeURIComponent(file.name),
          "x-mime-type": file.type,
          "x-file-size": String(file.size),
          "x-alt": encodeURIComponent(asset.alt),
          "x-expected-updated-at": asset.updatedAt,
        },
        body: file,
      })
    : await fetch(`/api/admin/media/assets/${asset.id}`, { method: "PUT", body: mediaForm(file, asset.alt, asset.updatedAt) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.asset?.url) throw new Error(data.error || `替换文件失败：${asset.originalName}`);
  return data;
}
