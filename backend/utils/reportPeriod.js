function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function parseInteger(value, label, minimum, maximum) {
  const rawValue = String(value ?? "").trim();

  if (!/^\d+$/.test(rawValue)) {
    throw validationError(
      `${label} phải là số nguyên từ ${minimum} đến ${maximum}.`,
    );
  }

  const parsedValue = Number(rawValue);
  if (!Number.isSafeInteger(parsedValue) || parsedValue < minimum || parsedValue > maximum) {
    throw validationError(
      `${label} phải là số nguyên từ ${minimum} đến ${maximum}.`,
    );
  }

  return parsedValue;
}

function formatUtcDate(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function getIsoWeekRange(year, week) {
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const januaryFourthIsoDay = januaryFourth.getUTCDay() || 7;
  const firstMonday = new Date(januaryFourth);
  firstMonday.setUTCDate(januaryFourth.getUTCDate() - januaryFourthIsoDay + 1);

  const start = new Date(firstMonday);
  start.setUTCDate(firstMonday.getUTCDate() + (week - 1) * 7);
  const thursday = new Date(start);
  thursday.setUTCDate(start.getUTCDate() + 3);

  if (thursday.getUTCFullYear() !== year) {
    throw validationError(`Tuần ${week} không tồn tại trong năm ${year}.`);
  }

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { startDate: formatUtcDate(start), endDate: formatUtcDate(end) };
}

function resolveReportPeriod(query = {}, { includeTime = false } = {}) {
  const year = parseInteger(query.year, "Năm báo cáo", 2000, 2100);
  const optionalNames = ["quarter", "month", "week"];
  const activeNames = optionalNames.filter(
    (name) => query[name] !== undefined && String(query[name]).trim() !== "",
  );

  if (activeNames.length > 1) {
    throw validationError("Chỉ được chọn một trong các kỳ quý, tháng hoặc tuần.");
  }

  let type = "YEAR";
  let quarter = null;
  let month = null;
  let week = null;
  let startDate = `${year}-01-01`;
  let endDate = `${year}-12-31`;

  if (activeNames[0] === "quarter") {
    type = "QUARTER";
    quarter = parseInteger(query.quarter, "Quý báo cáo", 1, 4);
    const startMonth = (quarter - 1) * 3;
    startDate = formatUtcDate(new Date(Date.UTC(year, startMonth, 1)));
    endDate = formatUtcDate(new Date(Date.UTC(year, startMonth + 3, 0)));
  } else if (activeNames[0] === "month") {
    type = "MONTH";
    month = parseInteger(query.month, "Tháng báo cáo", 1, 12);
    startDate = formatUtcDate(new Date(Date.UTC(year, month - 1, 1)));
    endDate = formatUtcDate(new Date(Date.UTC(year, month, 0)));
  } else if (activeNames[0] === "week") {
    type = "WEEK";
    week = parseInteger(query.week, "Tuần báo cáo", 1, 53);
    const range = getIsoWeekRange(year, week);
    startDate = range.startDate;
    endDate = range.endDate;
  }

  return {
    type,
    year,
    quarter,
    month,
    week,
    start_date: startDate,
    end_date: endDate,
    report_start: includeTime ? `${startDate} 00:00:00` : startDate,
    report_end: includeTime ? `${endDate} 23:59:59` : endDate,
  };
}

module.exports = { getIsoWeekRange, resolveReportPeriod };
