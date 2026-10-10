import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const fontDirectory = path.join(root, "src/assets/font");
const remixFontUrl = path.relative(fontDirectory, require.resolve("remixicon/fonts/remixicon.woff2"))
  .split(path.sep).join("/");

export async function listFogportArt(directory) {
  try {
    return (await readdir(directory, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && /^[a-z0-9-]+\.(svg|webp|avif|png|jpg|jpeg)$/.test(entry.name))
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

export function createIconStyles(source) {
  const css = postcss.parse(source);
  const faces = [];
  css.walkAtRules("font-face", (face) => faces.push(face));
  if (faces.length !== 1) throw new Error("Unexpected Remix Icon font-face structure");
  const face = faces[0];
  const family = face.nodes.find((node) => node.prop === "font-family");
  if (family?.value.replace(/["']/g, "") !== "remixicon") {
    throw new Error("Unexpected Remix Icon font family");
  }
  const sources = face.nodes.filter((node) => node.prop === "src");
  const woff2 = sources.flatMap((node) => [...node.value.matchAll(
    /url\(\s*["']?remixicon\.woff2(?:\?[^"')\s]*)?["']?\s*\)\s*format\(\s*["']woff2["']\s*\)/g,
  )]);
  if (woff2.length !== 1) throw new Error("Expected exactly one Remix Icon WOFF2 source");
  sources.forEach((node) => node.remove());
  face.append({ prop: "src", value: `url("${remixFontUrl}") format("woff2")` });
  return css.toString();
}

export function createWoff2FontStyles(source, packageName) {
  const css = postcss.parse(source);
  let faceCount = 0;
  css.walkAtRules("font-face", (face) => {
    faceCount++;
    const sources = face.nodes.filter((node) => node.prop === "src");
    const woff2 = sources.flatMap((node) => postcss.list.comma(node.value))
      .map((value) => value.match(/^url\(\s*["']?\.\/files\/([\w-]+\.woff2)["']?\s*\)\s*format\(\s*["']woff2["']\s*\)$/))
      .filter(Boolean);
    if (sources.length !== 1 || woff2.length !== 1) {
      throw new Error(`Expected exactly one WOFF2 source per ${packageName} font face`);
    }
    sources[0].value = `url("${packageName}/files/${woff2[0][1]}") format("woff2")`;
  });
  if (!faceCount) throw new Error(`No font faces found in ${packageName}`);
  return css.toString();
}

export async function generateStaticAssets() {
  const files = await listFogportArt(path.join(root, "public/assets/images/games/fogport"));
  const css = createIconStyles(await readFile(require.resolve("remixicon/fonts/remixicon.css"), "utf8"));
  const scriptFont = createWoff2FontStyles(
    await readFile(require.resolve("@fontsource/zhi-mang-xing/index.css"), "utf8"),
    "@fontsource/zhi-mang-xing",
  );
  await mkdir(path.join(root, "src/games/fogport"), { recursive: true });
  await mkdir(path.join(root, "src/assets/font"), { recursive: true });
  await writeFile(path.join(root, "src/games/fogport/art-manifest.generated.json"), `${JSON.stringify(files)}\n`);
  await writeFile(path.join(root, "src/assets/font/remixicon.generated.css"), css);
  await writeFile(path.join(root, "src/assets/font/zhi-mang-xing.generated.css"), scriptFont);
  console.log(`Generated ${files.length} Fogport asset paths and WOFF2-only Remix Icon / Zhi Mang Xing styles.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generateStaticAssets();
}
