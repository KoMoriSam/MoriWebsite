import lunar from "lunar-javascript";

const SOLAR_TERM_VARIANTS = [
  ["小寒", "iced"],
  ["大寒", "iced"],
  ["立春", "spring"],
  ["立夏", "summer"],
  ["立秋", "autumn"],
  ["立冬", "winter"],
];
let cachedYear;
let termDays;

export function getSeasonalLogoVariant(date) {
  const year = date.getFullYear();
  if (cachedYear !== year) {
    // June anchors the table to this Gregorian year's solar-term cycle.
    // https://6tail.cn/calendar/lunar.jieqi.html
    const table = lunar.Solar.fromYmd(year, 6, 1).getLunar().getJieQiTable();
    termDays = SOLAR_TERM_VARIANTS.map(([term, variant]) => ({
      day: table[term].getMonth() * 100 + table[term].getDay(),
      variant,
    }));
    cachedYear = year;
  }

  // Use the variant only on the term's Chinese-calendar date.
  const today = (date.getMonth() + 1) * 100 + date.getDate();
  return termDays.find(({ day }) => today === day)?.variant;
}
