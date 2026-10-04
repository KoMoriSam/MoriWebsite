import {
  PLACE_BY_ID,
  TILE_BY_ID,
  linkKind,
} from "../../../shared/games/fogport/data.js";
export const TRANSPORT_ICONS = {
  canal: "ri-ship-line",
  railway: "ri-train-line",
};
export function routeName(link, era, t) {
  return (
    t("fogport.transport." + linkKind(link, era)) +
    " · " +
    link.nodes.map((id) => placeName(id, t)).join(" / ")
  );
}
export const ACTIONS = [
  "build",
  "network",
  "develop",
  "sell",
  "loan",
  "scout",
  "pass",
];
export const PLAYER_ICONS = [
  "ri-circle-fill",
  "ri-triangle-fill",
  "ri-square-fill",
  "ri-star-fill",
];
export const INDUSTRY_ICONS = {
  cotton: "ri-t-shirt-line",
  coal: "ri-hexagon-line",
  iron: "ri-hammer-line",
  goods: "ri-archive-2-line",
  pottery: "ri-flask-line",
  beer: "ri-goblet-line",
};
export const ACTION_ICONS = {
  build: "ri-building-2-line",
  network: "ri-route-line",
  develop: "ri-tools-line",
  sell: "ri-store-2-line",
  loan: "ri-bank-line",
  scout: "ri-compass-3-line",
  pass: "ri-skip-forward-line",
  liquidate: "ri-auction-line",
};
export { ART_ASSETS } from "./art-assets.js";
export function placeName(id, t) {
  const place = PLACE_BY_ID[id];
  if (!place) return id;
  return t(`fogport.places.${id}`);
}
export function cardName(card, t) {
  return card.kind === "location"
    ? placeName(card.location, t)
    : card.kind.startsWith("wild_")
      ? t(`fogport.${card.kind}`)
      : card.industries
          .map((type) => t(`fogport.industries.${type}`))
          .join(" / ");
}
export function tileName(id, t) {
  const tile = TILE_BY_ID[id];
  return tile ? `${t(`fogport.industries.${tile.type}`)} ${tile.level}` : id;
}

export function cardArtNames(card) {
  if (card.kind === "location")
    return [
      "district-" + String(PLACE_BY_ID[card.location].number).padStart(2, "0"),
    ];
  if (card.kind.startsWith("wild_")) return ["wild-" + card.kind.slice(5)];
  return card.industries.map((type) => "industry-" + type);
}
