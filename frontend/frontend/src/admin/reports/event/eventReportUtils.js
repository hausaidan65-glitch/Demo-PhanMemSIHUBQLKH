export const currentYear = String(new Date().getFullYear());

export function parsePositiveInteger(value) {
  if (!/^\d+$/.test(String(value || ""))) {
    return null;
  }

  const number = Number(value);

  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export function getPeriodFilters(searchParams) {
  const rawYear = searchParams.get("year");
  const parsedYear = Number(rawYear);
  const year =
    /^\d{4}$/.test(rawYear || "") && parsedYear >= 2000 && parsedYear <= 2100
      ? rawYear
      : currentYear;
  const quarter = searchParams.get("quarter");
  const month = searchParams.get("month");

  if (/^[1-4]$/.test(quarter || "") && month === null) {
    return { year, periodType: "QUARTER", quarter, month: "" };
  }

  if (/^(?:[1-9]|1[0-2])$/.test(month || "") && quarter === null) {
    return { year, periodType: "MONTH", quarter: "", month };
  }

  return { year, periodType: "YEAR", quarter: "", month: "" };
}

export function buildPeriodParams(filters) {
  const year = Number(filters.year);

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Năm báo cáo phải nằm trong khoảng từ 2000 đến 2100.");
  }

  if (filters.periodType === "QUARTER") {
    const quarter = Number(filters.quarter);

    if (!Number.isInteger(quarter) || quarter < 1 || quarter > 4) {
      throw new Error("Vui lòng chọn quý báo cáo.");
    }

    return { year, quarter };
  }

  if (filters.periodType === "MONTH") {
    const month = Number(filters.month);

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error("Vui lòng chọn tháng báo cáo.");
    }

    return { year, month };
  }

  return { year };
}

export function buildSeminarSearch(params) {
  const search = new URLSearchParams({
    report: "seminar",
    year: String(params.year),
  });

  if (params.quarter) {
    search.set("quarter", String(params.quarter));
  }

  if (params.month) {
    search.set("month", String(params.month));
  }

  return search.toString();
}

export function formatNumber(value) {
  return (Number(value) || 0).toLocaleString("vi-VN");
}

export function displayValue(value) {
  return value === null || value === undefined || value === "" ? "-" : value;
}

export function formatDateTime(value) {
  const match = String(value || "").match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/,
  );

  if (!match) {
    return value || "-";
  }

  const date = `${match[3]}/${match[2]}/${match[1]}`;

  return match[4] ? `${date} ${match[4]}:${match[5]}` : date;
}

const STATUS_LABELS = {
  OPEN: "Đang mở",
  CLOSED: "Đã đóng",
  FINISHED: "Đã kết thúc",
  DRAFT: "Bản nháp",
};

const REGISTRATION_STATUS_LABELS = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
};

export function getStatusLabel(value) {
  return STATUS_LABELS[value] || displayValue(value);
}

export function getRegistrationStatusLabel(value) {
  return REGISTRATION_STATUS_LABELS[value] || displayValue(value);
}

export function getCheckedInLabel(value) {
  if (value === true || value === 1 || value === "1") {
    return "Đã check-in";
  }

  if (value === false || value === 0 || value === "0") {
    return "Chưa check-in";
  }

  return "Không xác định";
}

export function getGroupValueLabel(field, value) {
  if (value === "UNKNOWN") {
    return "Không xác định";
  }

  return field === "checked_in" ? getCheckedInLabel(value) : displayValue(value);
}
