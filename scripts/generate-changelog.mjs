import { writeStaticChangelog } from "./changelog-content.mjs";

const payload = await writeStaticChangelog();
console.log(`Generated changelog data: ${payload.items.length} released versions.`);
