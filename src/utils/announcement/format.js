import { formatDate, FULL_DATE_OPTIONS } from "../../i18n/format-date.js";

export const announcementToneLabel = {
  info: "信息",
  warning: "提醒",
  error: "故障",
};

export const formatAnnouncementDate = (value, includeTime = false, locale = "zh-CN") => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || "");

  return formatDate(date, locale, {
    ...FULL_DATE_OPTIONS,
    timeZone: "Asia/Shanghai",
    ...(includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }
      : {}),
  });
};
