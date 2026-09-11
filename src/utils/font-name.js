const SFNT_DIRECTORY_HEADER_SIZE = 12;
const SFNT_TABLE_RECORD_SIZE = 16;
const NAME_RECORD_SIZE = 12;
const SFNT_SIGNATURES = new Set(["\0\x01\0\0", "OTTO", "true", "typ1", "ttcf"]);
const WINDOWS_LANGUAGE_TAGS = new Map([
  [0x0404, "zh-tw"],
  [0x0804, "zh-cn"],
  [0x0c04, "zh-hk"],
  [0x1004, "zh-sg"],
  [0x1404, "zh-mo"],
  [0x0409, "en-us"],
  [0x0411, "ja-jp"],
  [0x0412, "ko-kr"],
]);
const EXPENSIVE_FONT_PATTERNS = [
  /\b(?:variable|variable[\s_-]*font|vf|wght|collection|all[\s_-]*weights?)\b/i,
  /\bsarasa\b/i,
  /更[纱紗]黑[体體]/u,
  /\b(?:source[\s_-]*han|noto[\s_-]*(?:sans|serif)[\s_-]*cjk)\b/i,
];
const LOCAL_FONT_WEIGHT_SUFFIX_PATTERNS = new Map([
  [100, /(?:[\s_-]+thin|\s*极细)$/iu],
  [200, /(?:[\s_-]+(?:extra|ultra)[\s_-]*light|\s*超细)$/iu],
  [300, /(?:[\s_-]+light|\s*细体)$/iu],
  [400, /(?:[\s_-]+(?:regular|normal|roman|book)|\s*(?:常规|正常|标准))$/iu],
  [500, /(?:[\s_-]+medium|\s*中等)$/iu],
  [600, /(?:[\s_-]+(?:semi|demi)[\s_-]*bold|\s*半粗)$/iu],
  [700, /(?:[\s_-]+bold|\s*粗体)$/iu],
  [800, /(?:[\s_-]+(?:extra|ultra)[\s_-]*(?:black|bold)|\s*特粗)$/iu],
  [900, /(?:[\s_-]+(?:black|heavy)|\s*极粗)$/iu],
]);
const LOCAL_FONT_ITALIC_SUFFIX_PATTERN =
  /(?:[\s_-]+(?:italic|oblique)|\s*斜体)$/iu;
const SARASA_LOCALIZED_PREFIXES = [
  [/^sarasa\s+mono\s+slab\b/i, "等距更纱黑体 Slab"],
  [/^sarasa\s+mono\b/i, "等距更纱黑体"],
  [/^sarasa\s+gothic\s+ui\b/i, "更纱黑体 UI"],
  [/^sarasa\s+ui\b/i, "更纱黑体 UI"],
  [/^sarasa\s+gothic\b/i, "更纱黑体"],
  [/^sarasa\s+term\s+slab\b/i, "更纱黑体 Term Slab"],
  [/^sarasa\s+term\b/i, "更纱黑体 Term"],
  [/^sarasa\s+fixed\s+slab\b/i, "更纱黑体 Fixed Slab"],
  [/^sarasa\s+fixed\b/i, "更纱黑体 Fixed"],
  [/^sarasa\b/i, "更纱黑体"],
];
const KNOWN_LOCALIZED_FONT_FAMILIES = new Map(
  [
    ["DengXian", "等线"],
    ["DFKai-SB", "标楷体"],
    ["FangSong", "仿宋"],
    ["FangSong_GB2312", "仿宋_GB2312"],
    ["FZShuTi", "方正舒体"],
    ["FZYaoti", "方正姚体"],
    ["Heiti SC", "黑体-简"],
    ["Hiragino Sans GB", "冬青黑体简体中文"],
    ["KaiTi", "楷体"],
    ["KaiTi_GB2312", "楷体_GB2312"],
    ["Kaiti SC", "楷体-简"],
    ["LiSu", "隶书"],
    ["Microsoft JhengHei", "微软正黑体"],
    ["Microsoft JhengHei UI", "微软正黑体 UI"],
    ["Microsoft YaHei", "微软雅黑"],
    ["Microsoft YaHei UI", "微软雅黑 UI"],
    ["MingLiU", "细明体"],
    ["MingLiU_HKSCS", "细明体_HKSCS"],
    ["NSimSun", "新宋体"],
    ["PingFang HK", "苹方-港"],
    ["PingFang SC", "苹方-简"],
    ["PingFang TC", "苹方-繁"],
    ["PMingLiU", "新细明体"],
    ["SimHei", "黑体"],
    ["SimSun", "宋体"],
    ["Songti SC", "宋体-简"],
    ["Source Han Sans SC", "思源黑体"],
    ["Source Han Serif SC", "思源宋体"],
    ["STCaiyun", "华文彩云"],
    ["STFangsong", "华文仿宋"],
    ["STHeiti", "华文黑体"],
    ["STHupo", "华文琥珀"],
    ["STKaiti", "华文楷体"],
    ["STLiti", "华文隶书"],
    ["STSong", "华文宋体"],
    ["STXihei", "华文细黑"],
    ["STXinwei", "华文新魏"],
    ["YouYuan", "幼圆"],
  ].map(([name, localizedName]) => [normalizeFontFamily(name), localizedName]),
);

export function localizeKnownFontFamily(family) {
  const value = String(family || "").trim();
  const knownName = KNOWN_LOCALIZED_FONT_FAMILIES.get(
    normalizeFontFamily(value),
  );
  if (knownName) return knownName;
  for (const [pattern, localizedPrefix] of SARASA_LOCALIZED_PREFIXES) {
    if (!pattern.test(value)) continue;
    return value.replace(pattern, localizedPrefix);
  }
  return value;
}

export function shouldAvoidLocalFontPreview(fontData) {
  const metadata = getFontMetadataText(fontData);
  return EXPENSIVE_FONT_PATTERNS.some((pattern) => pattern.test(metadata));
}

export function localFontFamilySupportsWeight(fontFaces) {
  const weights = new Set();
  for (const font of fontFaces || []) {
    if (/\b(?:variable(?:[\s_-]*font)?|vf|wght)\b/i.test(getFontMetadataText(font)))
      return true;
    const weight = readLocalFontFaceWeight(font?.style);
    if (weight) weights.add(weight);
  }
  return weights.size > 1;
}

export function stripLocalFontStyleSuffix(name, fontData) {
  const original = String(name || "").trim();
  const style = String(fontData?.style || "").trim();
  if (!original || !style) return original;
  let value = original;
  if (/\b(?:italic|oblique)\b|斜体/iu.test(style))
    value = value.replace(LOCAL_FONT_ITALIC_SUFFIX_PATTERN, "").trim();
  const weightPattern = LOCAL_FONT_WEIGHT_SUFFIX_PATTERNS.get(
    readLocalFontFaceWeight(style),
  );
  if (weightPattern) value = value.replace(weightPattern, "").trim();
  return value || original;
}

export async function readLocalizedFontFamily(
  fontData,
  preferredLanguages = globalThis.navigator?.languages || [],
) {
  const blob = await fontData.blob();
  return readLocalizedFontFamilyBlob(blob, preferredLanguages);
}

export async function readLocalizedFontFamilyBlob(
  blob,
  preferredLanguages = [],
) {
  const table = await readSfntTable(blob, "name");
  if (!table) return null;
  return parseLocalizedFontFamily(table, preferredLanguages);
}

export function parseLocalizedFontFamily(buffer, preferredLanguages = []) {
  const view = new DataView(buffer);
  if (view.byteLength < 6) return null;
  const format = view.getUint16(0);
  const count = view.getUint16(2);
  const stringOffset = view.getUint16(4);
  if (6 + count * NAME_RECORD_SIZE > view.byteLength) return null;
  const languageTags =
    format === 1 ? parseLanguageTags(view, count, stringOffset) : [];
  const candidates = [];
  for (let index = 0; index < count; index += 1) {
    const offset = 6 + index * NAME_RECORD_SIZE;
    const platformId = view.getUint16(offset);
    const languageId = view.getUint16(offset + 4);
    const nameId = view.getUint16(offset + 6);
    if (nameId !== 1 && nameId !== 16) continue;
    const length = view.getUint16(offset + 8);
    const valueOffset = stringOffset + view.getUint16(offset + 10);
    if (valueOffset + length > view.byteLength) continue;
    const value = decodeName(
      new Uint8Array(buffer, valueOffset, length),
      platformId,
    );
    if (!value) continue;
    candidates.push({
      value,
      languageRank: getLanguageRank(
        platformId,
        languageId,
        languageTags,
        preferredLanguages,
      ),
      nameRank: nameId === 16 ? 0 : 1,
      platformRank: platformId === 0 ? 0 : platformId === 3 ? 1 : 2,
    });
  }
  candidates.sort(
    (a, b) =>
      a.languageRank - b.languageRank ||
      a.nameRank - b.nameRank ||
      a.platformRank - b.platformRank,
  );
  return candidates[0]?.value || null;
}

async function readSfntTable(blob, requestedTag) {
  const fileHeader = await blob.slice(0, 16).arrayBuffer();
  if (fileHeader.byteLength < SFNT_DIRECTORY_HEADER_SIZE) return null;
  const fileView = new DataView(fileHeader);
  const signature = readTag(fileView, 0);
  if (!SFNT_SIGNATURES.has(signature)) return null;
  const directoryOffset = signature === "ttcf" ? fileView.getUint32(12) : 0;
  const directoryHeader = await blob
    .slice(directoryOffset, directoryOffset + SFNT_DIRECTORY_HEADER_SIZE)
    .arrayBuffer();
  if (directoryHeader.byteLength < SFNT_DIRECTORY_HEADER_SIZE) return null;
  const tableCount = new DataView(directoryHeader).getUint16(4);
  if (tableCount > 256) return null;
  const records = await blob
    .slice(
      directoryOffset + SFNT_DIRECTORY_HEADER_SIZE,
      directoryOffset +
        SFNT_DIRECTORY_HEADER_SIZE +
        tableCount * SFNT_TABLE_RECORD_SIZE,
    )
    .arrayBuffer();
  const recordsView = new DataView(records);
  for (let index = 0; index < tableCount; index += 1) {
    const offset = index * SFNT_TABLE_RECORD_SIZE;
    if (offset + SFNT_TABLE_RECORD_SIZE > recordsView.byteLength) break;
    if (readTag(recordsView, offset) !== requestedTag) continue;
    const tableOffset = recordsView.getUint32(offset + 8);
    const tableLength = recordsView.getUint32(offset + 12);
    if (tableOffset + tableLength > blob.size) return null;
    return blob.slice(tableOffset, tableOffset + tableLength).arrayBuffer();
  }
  return null;
}

function parseLanguageTags(view, nameCount, stringOffset) {
  const tags = [];
  const countOffset = 6 + nameCount * NAME_RECORD_SIZE;
  if (countOffset + 2 > view.byteLength) return tags;
  const count = view.getUint16(countOffset);
  for (let index = 0; index < count; index += 1) {
    const offset = countOffset + 2 + index * 4;
    if (offset + 4 > view.byteLength) break;
    const length = view.getUint16(offset);
    const valueOffset = stringOffset + view.getUint16(offset + 2);
    if (valueOffset + length > view.byteLength) continue;
    tags.push(
      decodeUtf16Be(new Uint8Array(view.buffer, valueOffset, length)).toLowerCase(),
    );
  }
  return tags;
}

function decodeName(bytes, platformId) {
  let value = "";
  if (platformId === 0 || platformId === 3) value = decodeUtf16Be(bytes);
  else if (platformId === 1) {
    try {
      value = new TextDecoder("macintosh").decode(bytes);
    } catch {
      value = new TextDecoder().decode(bytes);
    }
  } else value = new TextDecoder().decode(bytes);
  return value.replaceAll("\0", "").trim();
}

function decodeUtf16Be(bytes) {
  const units = new Uint16Array(Math.floor(bytes.byteLength / 2));
  for (let index = 0; index < units.length; index += 1)
    units[index] = (bytes[index * 2] << 8) | bytes[index * 2 + 1];
  return String.fromCharCode(...units);
}

function getLanguageRank(
  platformId,
  languageId,
  languageTags,
  preferredLanguages,
) {
  const preferred = preferredLanguages.map((language) => language.toLowerCase());
  const preferredRoots = preferred.map((language) => language.split("-")[0]);
  if (platformId === 0 && languageId >= 0x8000) {
    const tag = languageTags[languageId - 0x8000];
    if (tag) {
      const exactIndex = preferred.indexOf(tag);
      if (exactIndex >= 0) return exactIndex;
      const rootIndex = preferredRoots.indexOf(tag.split("-")[0]);
      if (rootIndex >= 0) return rootIndex + 0.5;
    }
  }
  if (platformId === 3) {
    const tag = WINDOWS_LANGUAGE_TAGS.get(languageId);
    if (tag) {
      const exactIndex = preferred.indexOf(tag);
      if (exactIndex >= 0) return exactIndex;
      const rootIndex = preferredRoots.indexOf(tag.split("-")[0]);
      if (rootIndex >= 0) return rootIndex + 0.5;
      if (tag.startsWith("zh-")) return preferred.length * 2;
      if (tag === "en-us") return preferred.length * 2 + 1;
    }
  }
  if (platformId === 0 && languageId === 0) return 1;
  return 4;
}

function readTag(view, offset) {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}

function normalizeFontFamily(family) {
  return String(family).trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function getFontMetadataText(fontData) {
  return [
    fontData?.family,
    fontData?.fullName,
    fontData?.postscriptName,
    fontData?.style,
  ]
    .filter(Boolean)
    .join(" ");
}

function readLocalFontFaceWeight(style) {
  const value = String(style || "").trim();
  if (!value) return 400;
  for (const [pattern, weight] of [
    [/(?:extra|ultra)[\s_-]*(?:black|bold)|特粗/iu, 800],
    [/(?:semi|demi)[\s_-]*bold|半粗/iu, 600],
    [/(?:extra|ultra)[\s_-]*light|超细/iu, 200],
    [/\b(?:black|heavy)\b|极粗/iu, 900],
    [/\bbold\b|粗体/iu, 700],
    [/\bmedium\b|中等/iu, 500],
    [/\blight\b|细体/iu, 300],
    [/\bthin\b|极细/iu, 100],
    [/\b(?:regular|normal|roman|book)\b|常规|正常|标准/iu, 400],
  ]) {
    if (pattern.test(value)) return weight;
  }
  return null;
}
