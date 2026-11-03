import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export const digest = (value) =>
  createHash("sha256").update(value).digest("hex");

async function read(file) {
  try {
    return await readFile(file);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function buildCache(directory) {
  directory = resolve(directory);
  await mkdir(directory, { recursive: true });
  return async (key, generate) => {
    const file = resolve(directory, digest(JSON.stringify(key)));
    const cached = await read(file);
    if (
      cached &&
      cached.length >= 64 &&
      cached.subarray(0, 64).toString() === digest(cached.subarray(64))
    ) {
      return { value: JSON.parse(cached.subarray(64)), hit: true };
    }
    const value = await generate();
    const data = JSON.stringify(value);
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, digest(data) + data);
      await rename(temporary, file);
    } finally {
      await rm(temporary, { force: true });
    }
    return { value, hit: false };
  };
}
