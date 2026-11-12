import { appendFileSync } from "node:fs";

export function buildEvent(stage, task, event, details = {}) {
  const line = JSON.stringify({
    time: new Date().toISOString(),
    stage,
    task,
    event,
    ...details,
  });
  console.log(line);
  if (process.env.SSG_BUILD_PROFILE)
    appendFileSync(process.env.SSG_BUILD_PROFILE, line + "\n");
}

export async function observeBuild(stage, task, action, details = {}) {
  const start = performance.now();
  const status = { ...details };
  const update = (progress) => Object.assign(status, progress);
  const emit = (event, extra = {}) =>
    buildEvent(stage, task, event, {
      ...status,
      ...extra,
      elapsedMs: Math.round(performance.now() - start),
    });
  emit("start");
  const heartbeat = setInterval(() => emit("heartbeat"), 15_000);
  heartbeat.unref();
  try {
    const result = await action(update);
    emit("finish");
    return result;
  } catch (error) {
    emit("error", { code: error.code || error.exitCode || error.name });
    throw error;
  } finally {
    clearInterval(heartbeat);
  }
}
