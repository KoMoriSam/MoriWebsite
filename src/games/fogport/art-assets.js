const numbered = (prefix, count) =>
  Array.from(
    { length: count },
    (_, i) => `${prefix}-${String(i + 1).padStart(2, "0")}`,
  );
export const ART_ASSETS = [
  {
    id: "map",
    width: 1254,
    height: 1254,
    icon: "ri-map-2-line",
    files: ["map"],
  },
  {
    id: "industry",
    width: 1024,
    height: 1024,
    icon: "ri-building-2-line",
    files: ["cotton", "coal", "iron", "goods", "pottery", "beer"].map(
      (type) => `industry-${type}`,
    ),
  },
  {
    id: "district",
    width: 800,
    height: 1200,
    icon: "ri-landscape-line",
    files: numbered("district", 20),
  },
  {
    id: "wild",
    width: 800,
    height: 1200,
    icon: "ri-compass-3-line",
    files: ["wild-location", "wild-industry"],
  },
  {
    id: "back",
    width: 800,
    height: 1200,
    icon: "ri-stack-line",
    files: ["card-back"],
  },
  {
    id: "merchant",
    width: 800,
    height: 800,
    icon: "ri-store-2-line",
    files: numbered("merchant", 5),
  },
  {
    id: "resource",
    width: 128,
    height: 128,
    icon: "ri-box-3-line",
    files: ["resource-coal", "resource-iron", "resource-beer"],
  },
  {
    id: "route",
    width: 1600,
    height: 128,
    icon: "ri-route-line",
    files: ["route-canal", "route-rail"],
  },
  {
    id: "mark",
    width: 256,
    height: 256,
    icon: "ri-shield-line",
    files: [
      "company-circle",
      "company-triangle",
      "company-square",
      "company-star",
    ],
  },
].map((asset) => ({ ...asset, count: asset.files.length }));

const images = import.meta.glob(
  "/public/assets/images/games/fogport/*.{svg,webp,avif,png,jpg,jpeg}",
  { eager: true, query: "?url", import: "default" },
);
const names = new Set(ART_ASSETS.flatMap((asset) => asset.files));
export function artCandidates(name) {
  if (!names.has(name)) return [];
  return ["svg", "webp", "avif", "png", "jpg", "jpeg"]
    .map(
      (extension) =>
        images[`/public/assets/images/games/fogport/${name}.${extension}`],
    )
    .filter(Boolean);
}
export const companyArtName = (seat) =>
  ART_ASSETS.find((asset) => asset.id === "mark").files[seat];
