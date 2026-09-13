export function typeColor(type) {
  switch (type) {
    case "feature":
      return "primary";
    case "fix":
      return "error";
    case "improve":
      return "secondary";
    case "performance":
      return "success";
    case "refactor":
      return "warning";
    case "chore":
      return "neutral";
    default:
      return "info";
  }
}

export function typeText(type) {
  switch (type) {
    case "feature":
      return "功能";
    case "fix":
      return "修复";
    case "improve":
      return "改进";
    case "performance":
      return "优化";
    case "refactor":
      return "重构";
    case "chore":
      return "维护";
    default:
      return "其他";
  }
}

export function compareVersions(left, right) {
  const parse = (value) => {
    const [core, prerelease = ""] = String(value || "").split("-", 2);
    return { core: core.split(".").map(Number), prerelease };
  };
  const a = parse(left);
  const b = parse(right);

  for (let index = 0; index < 3; index += 1) {
    const difference = (a.core[index] || 0) - (b.core[index] || 0);
    if (difference !== 0) return difference;
  }
  if (!a.prerelease && b.prerelease) return 1;
  if (a.prerelease && !b.prerelease) return -1;
  return a.prerelease.localeCompare(b.prerelease, "en", { numeric: true });
}
