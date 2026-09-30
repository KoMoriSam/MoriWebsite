import { useStorage } from "@vueuse/core";

export function useDiscardStorage() {
  const discardDone = useStorage("DISCARD_STORAGE_V1", false);
  if (discardDone.value) {
    return;
  }

  const keysToClear = [
    "READ_CHAPTER",
    "READ_CH",
    "IS_NOT_UPDATED",
    "READ_HEADING",
    "nowChapter",
    "auto",
    "mode",
    "sidebarState",
  ];

  // 清除指定键
  keysToClear.forEach((key) => {
    localStorage.removeItem(key);
  });

  // 清除所有 chapter_XXX 格式的键
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("chapter_")) {
      localStorage.removeItem(key);
    }
  });

  discardDone.value = true;
  console.log("旧键清理完成");
}
