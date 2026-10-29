import CONFIG from "./config";

export const NOVEL_COVER_URL = `${String(import.meta.env.VITE_NOVEL_RAW || CONFIG.BASE_URL).replace(/\/+$/, "")}/images/covers/theHorizon.webp`;

export const NOVEL_HORIZONTAL_COVER_URL = `${String(import.meta.env.VITE_NOVEL_RAW || CONFIG.BASE_URL).replace(/\/+$/, "")}/images/covers/theHorizon_horizontal.webp`;
