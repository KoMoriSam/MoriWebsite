import { useStorage } from "@vueuse/core";
import { useGlobalStorage } from "@/utils/storage/use-global-storage";
import { useReaderSettingsStorage } from "@/utils/storage/use-reader-settings-storage";
import { useReadingStateStorage } from "@/utils/storage/use-reading-state-storage";

export function useStorageMigration() {
  // 检查并执行迁移
  const migrateStorage = () => {
    const migrationFlag = useStorage("STORAGE_MIGRATION_V2", false);

    if (migrationFlag.value) {
      console.log("迁移已完成，跳过");
      return;
    }

    console.log("开始迁移 localStorage...");

    // 迁移网页全局信息
    migrateGlobalSettings();

    // 迁移小说阅读器设置
    migrateReaderSettings();

    // 迁移阅读状态信息
    migrateReadingState();

    // 清理旧键名
    cleanupOldKeys();

    migrationFlag.value = true;
    console.log("迁移完成");
  };

  const migrateGlobalSettings = () => {
    const { GLOBAL_INFO } = useGlobalStorage();
    const keys = ["APP_VERSION", "SET_THEME"];

    keys.forEach((oldKey) => {
      const raw = localStorage.getItem(oldKey);
      if (raw === null) return;

      let value;
      try {
        // 优先尝试 JSON 解析（对象/数组）
        if (/^[\[{]/.test(raw)) {
          value = JSON.parse(raw);
        } else if (/^-?\d+(\.\d+)?$/.test(raw)) {
          // 完全是数字（整数或小数）则转为 Number
          value = raw.includes(".") ? parseFloat(raw) : Number(raw);
        } else {
          value = raw;
        }
      } catch (e) {
        value = raw;
      }

      GLOBAL_INFO.value[oldKey] = value;
      console.log(
        `migrateGlobalSettings: ${oldKey} -> GLOBAL_INFO.${oldKey}`,
        value,
      );
    });
  };

  const migrateReaderSettings = () => {
    const { READER_SETTINGS } = useReaderSettingsStorage();

    const mapping = {
      STYLE_FONT: "STYLE_FONT",
      STYLE_FONT_GAP: "STYLE_FONT_GAP",
      STYLE_FONT_SIZE: "STYLE_FONT_SIZE",
      NOVEL_CURRENT_COMPONENT: "NOVEL_CURRENT_COMPONENT",
      NOVEL_SIDE_CURRENT_COMPONENT: "NOVEL_SIDE_CURRENT_COMPONENT",
      CONTENT_LINE_HEIGHT: "STYLE_LINE_HEIGHT",
      CONTENT_PARA_HEIGHT: "STYLE_PARA_HEIGHT",
    };

    const numberKeys = [
      "STYLE_FONT_GAP",
      "STYLE_FONT_SIZE",
      "CONTENT_LINE_HEIGHT",
      "CONTENT_PARA_HEIGHT",
    ];

    Object.keys(mapping).forEach((oldKey) => {
      const newKey = mapping[oldKey];
      const raw = localStorage.getItem(oldKey);
      if (raw === null) return;

      let value;
      try {
        if (/^[\[{]/.test(raw)) {
          value = JSON.parse(raw);
        } else if (numberKeys.includes(oldKey)) {
          // 对数值键做更精确的转换（LINE/PARA 用 float）
          if (oldKey.includes("LINE") || oldKey.includes("PARA")) {
            value = parseFloat(raw);
          } else {
            value = Number(raw);
          }
        } else if (/^-?\d+(\.\d+)?$/.test(raw)) {
          // 不是声明为数值键但内容是纯数字，也转换为 Number
          value = raw.includes(".") ? parseFloat(raw) : Number(raw);
        } else {
          value = raw;
        }
      } catch (e) {
        value = raw;
      }

      READER_SETTINGS.value[newKey] = value;
      console.log(
        `migrateReaderSettings: ${oldKey} -> READER_SETTINGS.${newKey}`,
        value,
      );
    });
  };

  const migrateReadingState = () => {
    const { READING_STATE } = useReadingStateStorage();

    const mapping = {
      CHAPTER_LIST: "CHAPTER_LIST",
      CHAPTER_LIST_UPDATED_AT: "CHAPTER_LIST_UPDATED_AT",
      CHAPTERS_CONTENT: "CHAPTERS_CONTENT",
      READ_CHS: "READ_CHS",
      READ_CH_ID: "READ_CH_ID",
      READ_PAGE: "READ_PAGE",
      READ_POS: "READ_POS",
    };

    Object.keys(mapping).forEach((oldKey) => {
      const newKey = mapping[oldKey];
      const raw = localStorage.getItem(oldKey);
      if (raw === null) return;

      let value;
      try {
        if (/^[\[{]/.test(raw)) {
          value = JSON.parse(raw);
        } else if (/^-?\d+(\.\d+)?$/.test(raw)) {
          value = raw.includes(".") ? parseFloat(raw) : Number(raw);
        } else {
          value = raw;
        }
      } catch (e) {
        value = raw;
      }

      READING_STATE.value[newKey] = value;
      console.log(
        `migrateReadingState: ${oldKey} -> READING_STATE.${newKey}`,
        value,
      );
    });

    // 另外迁移以 chapter_ 开头的章节缓存（如有）
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("chapter_")) {
        const raw = localStorage.getItem(key);
        if (raw === null) return;
        try {
          READING_STATE.value[key] = /^[\[{]/.test(raw) ? JSON.parse(raw) : raw;
        } catch (e) {
          READING_STATE.value[key] = raw;
        }
        console.log(`migrateReadingState: ${key} -> READING_STATE.${key}`);
      }
    });
  };

  const cleanupOldKeys = () => {
    // 迁移稳定后再取消注释
    const keysToClear = [
      "APP_VERSION",
      "SET_THEME",
      "STYLE_FONT",
      "STYLE_FONT_GAP",
      "STYLE_FONT_SIZE",
      "CONTENT_LINE_HEIGHT",
      "CONTENT_PARA_HEIGHT",
      "NOVEL_CURRENT_COMPONENT",
      "NOVEL_SIDE_CURRENT_COMPONENT",
      "CHAPTERS_CONTENT",
      "CHAPTER_LIST",
      "CHAPTER_LIST_UPDATED_AT",
      "READ_CHS",
      "READ_CH_ID",
      "READ_PAGE",
      "READ_POS",
    ];

    keysToClear.forEach((key) => {
      localStorage.removeItem(key);
    });

    // 清除所有 chapter_XXX 格式的键
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("chapter_")) {
        localStorage.removeItem(key);
      }
    });
  };

  return {
    migrateStorage,
  };
}
