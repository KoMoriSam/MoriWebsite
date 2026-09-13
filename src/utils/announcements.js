export const announcementToneLabel = {
  info: "信息",
  warning: "提醒",
  error: "故障",
};

export const formatAnnouncementDate = (value, includeTime = false) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || "");

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    ...(includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }
      : {}),
  }).format(date);
};
