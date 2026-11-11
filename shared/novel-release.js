export const novelVersionPattern = /^[a-f0-9]{64}$/u;
export const publicCovers = [
  "covers/theHorizon.webp",
  "covers/theHorizon_horizontal.webp",
  "covers/theHorizon_old.webp",
];
export const releaseFile = "site-data/novel-release.json";

export function resourcePath(path) {
  return typeof path === "string" && path.length <= 900 &&
    path.split("/").every((part) => part && part !== "." && part !== ".." &&
      !/[\\%?#\u0000-\u001f\u007f]/u.test(part));
}

export function publicCoverManifest(full) {
  return {
    version: 1,
    images: Object.fromEntries(publicCovers.flatMap((name) => {
      const entry = full.images[name];
      return entry ? [[name, entry]] : [];
    })),
  };
}
