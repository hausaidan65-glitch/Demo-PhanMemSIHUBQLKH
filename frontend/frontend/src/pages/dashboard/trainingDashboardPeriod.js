const currentYear = String(new Date().getFullYear());

export const createDefaultDashboardFilters = () => ({
  year: currentYear,
  periodType: "YEAR",
  quarter: "",
  month: "",
});

export function buildDashboardPeriodParams(filters) {
  const year = Number(filters.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Năm báo cáo phải nằm trong khoảng từ 2000 đến 2100.");
  }
  if (filters.periodType === "QUARTER") {
    if (!filters.quarter) throw new Error("Vui lòng chọn quý báo cáo.");
    return { year, quarter: Number(filters.quarter) };
  }
  if (filters.periodType === "MONTH") {
    if (!filters.month) throw new Error("Vui lòng chọn tháng báo cáo.");
    return { year, month: Number(filters.month) };
  }
  return { year };
}
