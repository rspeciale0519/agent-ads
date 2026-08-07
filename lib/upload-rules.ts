export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_FILES = 8;

export const ACCEPTED_UPLOAD_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".txt",
  ".csv",
  ".tsv",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".mp4",
  ".mov",
  ".webm",
] as const;

export const ACCEPTED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
  "text/tab-separated-values",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;

export const ACCEPT_ATTRIBUTE = ACCEPTED_UPLOAD_EXTENSIONS.join(",");

export function getFileExtension(fileName: string) {
  const lastDot = fileName.lastIndexOf(".");
  return lastDot >= 0 ? fileName.slice(lastDot).toLowerCase() : "";
}

export function isAllowedUpload(fileName: string, contentType: string) {
  const extensionAllowed = ACCEPTED_UPLOAD_EXTENSIONS.includes(getFileExtension(fileName) as (typeof ACCEPTED_UPLOAD_EXTENSIONS)[number]);
  const typeAllowed = !contentType || ACCEPTED_UPLOAD_MIME_TYPES.includes(contentType as (typeof ACCEPTED_UPLOAD_MIME_TYPES)[number]);
  return extensionAllowed && typeAllowed;
}
