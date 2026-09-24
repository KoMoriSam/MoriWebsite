import { unicodeToFm } from "./converter.js";

export const sinhalaFontPreviewText = "සිංහල 123";
export const legacyFontPreviewText = unicodeToFm(sinhalaFontPreviewText);
export const unicodeWebsiteFonts = [
  {
    id: "abhaya",
    label: "Abhaya Libre",
    cssVariable: "--font-abhaya",
    previewFontFamily: '"Abhaya Libre", serif',
    supportsFontWeight: true,
  },
  {
    id: "gemunu",
    label: "Gemunu Libre",
    cssVariable: "--font-gemunu",
    previewFontFamily: '"Gemunu Libre", sans-serif',
    supportsFontWeight: true,
  },
  {
    id: "noto-sans-sinhala",
    label: "Noto Sans Sinhala",
    cssVariable: "--font-noto-sans-sinhala",
    inputFontFamily:
      '"Noto Sans Sinhala Variable", "Noto Sans Sinhala Input Latin"',
    previewFontFamily: '"Noto Sans Sinhala Preview", sans-serif',
    supportsFontWeight: true,
  },
  {
    id: "noto-serif-sinhala",
    label: "Noto Serif Sinhala",
    cssVariable: "--font-noto-serif-sinhala",
    inputFontFamily:
      '"Noto Serif Sinhala Variable", "Noto Serif Sinhala Input Latin"',
    previewFontFamily: '"Noto Serif Sinhala Preview", serif',
    supportsFontWeight: true,
  },
  {
    id: "maname",
    label: "Maname",
    cssVariable: "--font-maname",
    inputFontFamily: '"Maname", "Maname Input Latin"',
    previewFontFamily: '"Maname Preview", serif',
  },
].map((font) => ({
  ...font,
  previewText: sinhalaFontPreviewText,
  previewLanguage: "si",
}));
export const legacyWebsiteFonts = [
  {
    id: "abhaya-legacy",
    label: "Abhaya Legacy",
    cssVariable: "--font-abhaya-legacy",
    previewFontFamily: '"XITS for Abhaya", serif',
  },
  {
    id: "gemunu-legacy",
    label: "Gemunu Legacy",
    cssVariable: "--font-gemunu-legacy",
    previewFontFamily: '"Gemunu Libre", sans-serif',
  },
].map((font) => ({
  ...font,
  previewText: legacyFontPreviewText,
  previewLanguage: "si",
}));
