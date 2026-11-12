export const FULL_DATE_OPTIONS = Object.freeze({
  year: "numeric",
  month: "long",
  day: "numeric",
});

const SINHALA_GREGORIAN_MONTHS = [
  "ජනවාරි",
  "පෙබරවාරි",
  "මාර්තු",
  "අප්‍රේල්",
  "මැයි",
  "ජූනි",
  "ජූලි",
  "අගෝස්තු",
  "සැප්තැම්බර්",
  "ඔක්තෝබර්",
  "නොවැම්බර්",
  "දෙසැම්බර්",
];

export function formatDate(date, locale, options) {
  const language = new Intl.Locale(locale).language;
  // Keep the fallback predictable when the browser lacks Sinhala locale data.
  const formatter = new Intl.DateTimeFormat(
    language === "si" ? [locale, "en-GB"] : locale,
    options,
  );
  const { locale: resolvedLocale, calendar, month, dateStyle, timeZone } =
    formatter.resolvedOptions();

  if (language === "zh") {
    return formatter
      .format(date)
      .replace(/(\p{Nd})(?=[年月日])|([年月日])(?=\p{Nd})/gu, "$1$2 ");
  }

  if (
    language !== "si" ||
    calendar !== "gregory" ||
    !(["long", "short", "narrow"].includes(month) ||
      (dateStyle && dateStyle !== "short"))
  ) {
    return formatter.format(date);
  }

  const monthNumber = new Intl.DateTimeFormat("en", {
    month: "numeric",
    timeZone,
  }).format(date);
  const monthName = SINHALA_GREGORIAN_MONTHS[Number(monthNumber) - 1];
  const monthLabel =
    month === "narrow"
      ? new Intl.Segmenter("si").segment(monthName).containing(0).segment
      : monthName;

  const parts = formatter.formatToParts(date);
  if (resolvedLocale === "en-GB" && month === "long") {
    const fields = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    const dateLabel = [fields.year, monthLabel, fields.day].filter(Boolean).join(" ");
    const timeStart = parts.findIndex(({ type }) => type === "hour");
    if (timeStart === -1) return dateLabel;
    const timeLabel = parts.slice(timeStart).map(({ value }) => value).join("");
    return `${dateLabel} ${timeLabel}`;
  }

  return parts.map((part) => (part.type === "month" ? monthLabel : part.value)).join("");
}

const relativeDateUnits = [
  ["year", 365 * 24 * 60],
  ["month", 30 * 24 * 60],
  ["day", 24 * 60],
  ["hour", 60],
  ["minute", 1],
];
const relativeDateFormatters = new Map();

export function formatRelativeDate(date, locale, now) {
  const elapsedMinutes = Math.trunc((now - new Date(date).getTime()) / 60_000);
  if (!Number.isFinite(elapsedMinutes)) return "";
  if (!relativeDateFormatters.has(locale))
    relativeDateFormatters.set(locale, new Intl.RelativeTimeFormat([locale, "en-GB"], { numeric: "auto" }));
  const formatter = relativeDateFormatters.get(locale);
  const unit = relativeDateUnits.find(([, size]) => Math.abs(elapsedMinutes) >= size);
  return unit
    ? formatter.format(-Math.trunc(elapsedMinutes / unit[1]), unit[0])
    : formatter.format(0, "second");
}
