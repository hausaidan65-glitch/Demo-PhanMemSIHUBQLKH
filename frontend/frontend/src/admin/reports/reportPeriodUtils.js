function toDateOnlyUtc(date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function isoWeekParts(date = new Date()) {
  const value = toDateOnlyUtc(date);
  const isoDay = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() + 4 - isoDay);
  const year = value.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((value - yearStart) / 86400000 + 1) / 7);
  return { year, week };
}

export function getIsoWeekRange(year, week) {
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const firstMonday = new Date(januaryFourth);
  firstMonday.setUTCDate(
    januaryFourth.getUTCDate() - (januaryFourth.getUTCDay() || 7) + 1,
  );
  const start = new Date(firstMonday);
  start.setUTCDate(firstMonday.getUTCDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start, end };
}

export function getWeeksInIsoYear(year) {
  const decemberTwentyEighth = new Date(Date.UTC(year, 11, 28));
  const isoDay = decemberTwentyEighth.getUTCDay() || 7;
  decemberTwentyEighth.setUTCDate(decemberTwentyEighth.getUTCDate() + 4 - isoDay);
  const yearStart = new Date(Date.UTC(decemberTwentyEighth.getUTCFullYear(), 0, 1));
  return Math.ceil(((decemberTwentyEighth - yearStart) / 86400000 + 1) / 7);
}

export function isValidIsoWeek(year, week) {
  return (
    Number.isInteger(year) &&
    Number.isInteger(week) &&
    week >= 1 &&
    week <= getWeeksInIsoYear(year)
  );
}

export function getDefaultIsoWeek(year) {
  const current = isoWeekParts();
  return year === current.year ? current.week : 1;
}

export function formatWeekPreview(year, week, includeYear = true) {
  if (!isValidIsoWeek(year, week)) return "";
  const format = (date) => {
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    return includeYear ? `${day}/${month}/${date.getUTCFullYear()}` : `${day}/${month}`;
  };
  const { start, end } = getIsoWeekRange(year, week);
  return `${format(start)} – ${format(end)}`;
}

export function getWeekOptions(year) {
  return Array.from({ length: getWeeksInIsoYear(year) }, (_, index) => {
    const week = index + 1;
    return {
      value: String(week),
      label: `Tuần ${week} (${formatWeekPreview(year, week, false)})`,
    };
  });
}

export function formatReportPeriodLabel(period) {
  if (!period) return "";
  if (period.type === "WEEK") {
    return `Tuần ${period.week} / ${period.year}`;
  }
  if (period.type === "QUARTER") return `Quý ${period.quarter} / ${period.year}`;
  if (period.type === "MONTH") return `Tháng ${period.month} / ${period.year}`;
  return `Năm ${period.year}`;
}
