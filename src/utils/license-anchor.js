const normalizeAnchorPart = (value) =>
  String(value || "")
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const createLicenseAnchor = (prefix, ...parts) =>
  [prefix, ...parts]
    .map(normalizeAnchorPart)
    .filter(Boolean)
    .join("-");
