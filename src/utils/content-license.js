export const DEFAULT_BLOG_LICENSE = "CC BY-NC-SA 4.0";
export const ALL_RIGHTS_RESERVED = "All Rights Reserved";

export function normalizeContentLicense(value, fallback = DEFAULT_BLOG_LICENSE) {
  if (value == null) return fallback;
  if (typeof value !== "string" || !value.trim()) throw new Error("Content license must be a non-empty string");
  return value.trim();
}

export function resolveContentLicense(value, fallback = DEFAULT_BLOG_LICENSE) {
  const label = normalizeContentLicense(value, fallback);
  const cc = /^CC (BY(?:-NC)?(?:-SA|-ND)?) 4\.0$/i.exec(label);
  if (cc) return {
    label: `CC ${cc[1].toUpperCase()} 4.0`,
    url: `https://creativecommons.org/licenses/${cc[1].toLowerCase()}/4.0/`,
    type: "cc",
  };
  if (/^CC0(?: 1\.0)?$/i.test(label)) return {
    label: "CC0 1.0", url: "https://creativecommons.org/publicdomain/zero/1.0/", type: "cc0",
  };
  if (/^(?:all rights reserved|all-rights-reserved|保留所有权利)$/i.test(label)) return {
    label: ALL_RIGHTS_RESERVED, url: "", type: "reserved",
  };
  return { label, url: "", type: "custom" };
}
