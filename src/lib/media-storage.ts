import * as core from "@/lib/media-storage-core.mjs";

export type StoredMedia = {
  originalName: string;
  fileName: string;
  url: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
};

export type StoreMediaInput = {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  uploadDir?: string;
  randomUUID?: () => string;
};

export const MediaStorageError = core.MediaStorageError as typeof core.MediaStorageError;
export const configuredUploadDirectory = core.configuredUploadDirectory as () => string;
export const resolveStoredMediaPath = core.resolveStoredMediaPath as (url: string, uploadDir?: string) => string;
export const inspectMediaBuffer = core.inspectMediaBuffer as (input: Pick<StoreMediaInput, "buffer" | "originalName" | "mimeType">) => Promise<Omit<StoredMedia, "originalName" | "fileName" | "url" | "mimeType"> & { type: unknown }>;
export const storeMediaBuffer = core.storeMediaBuffer as (input: StoreMediaInput) => Promise<StoredMedia>;
export const storeMediaStream = core.storeMediaStream as (input: Omit<StoreMediaInput, "buffer"> & { stream: NodeJS.ReadableStream; declaredFileSize: number }) => Promise<StoredMedia>;
export const removeStoredMedia = core.removeStoredMedia as (url: string, uploadDir?: string) => Promise<boolean>;
