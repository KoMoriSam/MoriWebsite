import {
  access,
  copyFile,
  mkdir,
  readFile,
  readdir,
  realpath,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_ROOT = resolve(ROOT, "dist", "legal");
const GENERATED_DATA_FILE = resolve(
  ROOT,
  "src",
  "router",
  "license-data.generated.js",
);
const LICENSE_FILE_PATTERN = /^(?:licen[cs]e|copying|notice|ofl)(?:\..*)?$/i;

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

const repositoryUrl = (repository) => {
  const value = typeof repository === "string" ? repository : repository?.url;
  return value?.replace(/^git\+/, "").replace(/\.git$/, "") ?? "not declared";
};

const locatePackageManifest = async (name, fromDirectory) => {
  let current = await realpath(fromDirectory);

  while (true) {
    const candidate = resolve(
      current,
      "node_modules",
      ...name.split("/"),
      "package.json",
    );

    try {
      await access(candidate);
      return candidate;
    } catch (error) {
      if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error;
    }

    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
};

const collectRuntimeDependencies = async (rootDependencyNames) => {
  const pending = [];
  const packages = new Map();

  for (const name of rootDependencyNames) {
    const manifestPath = await locatePackageManifest(name, ROOT);
    if (!manifestPath) throw new Error(`Installed dependency not found: ${name}`);
    pending.push(manifestPath);
  }

  while (pending.length) {
    const manifestPath = pending.pop();
    const directory = await realpath(dirname(manifestPath));
    if (packages.has(directory)) continue;

    const manifest = await readJson(resolve(directory, "package.json"));
    packages.set(directory, { directory, manifest });

    for (const name of Object.keys(manifest.dependencies ?? {})) {
      const childManifest = await locatePackageManifest(name, directory);
      if (!childManifest) {
        throw new Error(
          `Installed dependency not found: ${manifest.name} -> ${name}`,
        );
      }
      pending.push(childManifest);
    }

    for (const name of Object.keys(manifest.optionalDependencies ?? {})) {
      const childManifest = await locatePackageManifest(name, directory);
      if (childManifest) pending.push(childManifest);
    }
  }

  return [...packages.values()].sort((left, right) => {
    const byName = left.manifest.name.localeCompare(right.manifest.name);
    return byName || left.manifest.version.localeCompare(right.manifest.version);
  });
};

const collectDependencyNotice = async ({ directory, manifest }) => {
  const files = (await readdir(directory))
    .filter((file) => LICENSE_FILE_PATTERN.test(file))
    .sort((left, right) => left.localeCompare(right));

  const licenseFiles = await Promise.all(
    files.map(async (file) => {
      const text = await readFile(resolve(directory, file), "utf8");
      return { name: file, text: text.trim() };
    }),
  );

  return {
    name: manifest.name,
    version: manifest.version,
    declaredLicense: manifest.license ?? "not declared",
    source: repositoryUrl(manifest.repository),
    licenseFiles,
  };
};

const formatDependencyNotice = (dependency) => {
  const header = [
    "=".repeat(78),
    `${dependency.name}@${dependency.version}`,
    `Declared license: ${dependency.declaredLicense}`,
    `Source: ${dependency.source}`,
    "=".repeat(78),
  ].join("\n");

  if (!dependency.licenseFiles.length) {
    return `${header}\n\nNo top-level license file was included in this package.\n`;
  }

  const contents = dependency.licenseFiles.map(
    ({ name, text }) => `--- ${name} ---\n${text}\n`,
  );

  return `${header}\n\n${contents.join("\n")}`;
};

const readSupplementalLicenses = async () => {
  const directory = resolve(ROOT, "licenses");
  const files = (await readdir(directory)).sort((left, right) =>
    left.localeCompare(right),
  );

  return Promise.all(
    files.map(async (name) => ({
      name,
      text: (await readFile(resolve(directory, name), "utf8")).trim(),
    })),
  );
};

const writeGeneratedData = async (data) => {
  const source = `// AUTO GENERATED\n// DO NOT EDIT\n\nexport default ${JSON.stringify(
    data,
    null,
    2,
  )};\n`;

  await writeFile(GENERATED_DATA_FILE, source, "utf8");
};

const writeDistributionFiles = async ({
  dependencyNotices,
  supplementalLicenses,
}) => {
  await mkdir(resolve(OUTPUT_ROOT, "licenses"), { recursive: true });
  await writeFile(
    resolve(OUTPUT_ROOT, "THIRD_PARTY_LICENSES.txt"),
    `${dependencyNotices.map(formatDependencyNotice).join("\n")}\n`,
    "utf8",
  );
  await copyFile(
    resolve(ROOT, "THIRD_PARTY_NOTICES.md"),
    resolve(OUTPUT_ROOT, "THIRD_PARTY_NOTICES.txt"),
  );
  await copyFile(
    resolve(ROOT, "THIRD_PARTY_NOTICES.zh-CN.md"),
    resolve(OUTPUT_ROOT, "THIRD_PARTY_NOTICES.zh-CN.txt"),
  );
  await copyFile(resolve(ROOT, "LICENSE"), resolve(OUTPUT_ROOT, "LICENSE"));

  for (const license of supplementalLicenses) {
    await copyFile(
      resolve(ROOT, "licenses", license.name),
      resolve(OUTPUT_ROOT, "licenses", license.name),
    );
  }

  const flatPrerenderedPage = resolve(ROOT, "dist", "licenses.html");
  try {
    await access(flatPrerenderedPage);
    await mkdir(resolve(ROOT, "dist", "licenses"), { recursive: true });
    await copyFile(
      flatPrerenderedPage,
      resolve(ROOT, "dist", "licenses", "index.html"),
    );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
};

const main = async () => {
  const modes = new Set(process.argv.slice(2));
  const sourceOnly = modes.has("--source");
  const distributionOnly = modes.has("--dist");

  if (sourceOnly && distributionOnly) {
    throw new Error("Use either --source or --dist, not both.");
  }

  const project = await readJson(resolve(ROOT, "package.json"));
  const rootDependencyNames = Object.keys(project.dependencies ?? {}).sort(
    (left, right) => left.localeCompare(right),
  );
  const dependencies = await collectRuntimeDependencies(rootDependencyNames);

  const dependencyNotices = [];
  for (const dependency of dependencies) {
    dependencyNotices.push(await collectDependencyNotice(dependency));
  }

  const supplementalLicenses = await readSupplementalLicenses();
  const data = {
    projectLicense: (await readFile(resolve(ROOT, "LICENSE"), "utf8")).trim(),
    noticesMarkdownEn: (
      await readFile(resolve(ROOT, "THIRD_PARTY_NOTICES.md"), "utf8")
    ).trim(),
    noticesMarkdownZh: (
      await readFile(resolve(ROOT, "THIRD_PARTY_NOTICES.zh-CN.md"), "utf8")
    ).trim(),
    dependencyCount: dependencyNotices.length,
    missingLicenseFileCount: dependencyNotices.filter(
      (dependency) => !dependency.licenseFiles.length,
    ).length,
    dependencyNotices,
    supplementalLicenses,
  };

  if (!distributionOnly) {
    await writeGeneratedData(data);
  }

  if (!sourceOnly) {
    await writeDistributionFiles({ dependencyNotices, supplementalLicenses });
  }

  console.log(
    `Collected license data for ${dependencies.length} installed runtime dependency versions.`,
  );
};

await main();
