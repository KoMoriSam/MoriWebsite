export const messageLoaders = import.meta.glob([
  "./messages/*/*.json",
  "!./messages/zh-CN/common.json",
], {
  import: "default",
});

export function getRouteMessageGroups(route) {
  return [...new Set(["common", ...(route.meta?.localeGroups || [])])];
}
