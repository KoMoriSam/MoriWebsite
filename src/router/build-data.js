export async function readBuildData(name) {
  if (import.meta.env.SSR) {
    const { readFile } = process.getBuiltinModule("node:fs/promises");
    return JSON.parse(
      await readFile(`${process.env.SSG_DATA_DIR}/${name}.json`, "utf8"),
    );
  }
  const response = await fetch(
    `${import.meta.env.BASE_URL}site-data/${name}.json`,
    {
      cache: "no-cache",
    },
  );
  if (!response.ok) throw new Error(`Missing site data: ${name}`);
  return response.json();
}
