import { isValidIsoWeek } from '../reportPeriodUtils';

export const currentYear = String(new Date().getFullYear());

export function getPeriodFilters(searchParams) {
  const rawYear = searchParams.get('year');
  const parsedYear = Number(rawYear);
  const year =
    /^\d{4}$/.test(rawYear || '') && parsedYear >= 2000 && parsedYear <= 2100
      ? rawYear
      : currentYear;
  const quarter = searchParams.get('quarter');
  const month = searchParams.get('month');
  const week = searchParams.get('week');

  if (/^[1-4]$/.test(quarter || '') && month === null && week === null) {
    return { year, periodType: 'QUARTER', quarter, month: '', week: '' };
  }

  if (/^(?:[1-9]|1[0-2])$/.test(month || '') && quarter === null && week === null) {
    return { year, periodType: 'MONTH', quarter: '', month, week: '' };
  }

  if (/^\d+$/.test(week || '') && quarter === null && month === null && isValidIsoWeek(Number(year), Number(week))) {
    return { year, periodType: 'WEEK', quarter: '', month: '', week };
  }

  return { year, periodType: 'YEAR', quarter: '', month: '', week: '' };
}

export function buildPeriodParams(filters) {
  const year = Number(filters.year);

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error('Năm báo cáo phải nằm trong khoảng từ 2000 đến 2100.');
  }

  if (filters.periodType === 'QUARTER') {
    const quarter = Number(filters.quarter);
    if (!Number.isInteger(quarter) || quarter < 1 || quarter > 4) {
      throw new Error('Vui lòng chọn quý báo cáo.');
    }
    return { year, quarter };
  }

  if (filters.periodType === 'MONTH') {
    const month = Number(filters.month);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error('Vui lòng chọn tháng báo cáo.');
    }
    return { year, month };
  }

  if (filters.periodType === 'WEEK') {
    const week = Number(filters.week);
    if (!isValidIsoWeek(year, week)) {
      throw new Error('Vui lòng chọn tuần ISO hợp lệ.');
    }
    return { year, week };
  }

  return { year };
}

export function buildNetworkingSearch(params) {
  const search = new URLSearchParams({
    report: 'networking',
    year: String(params.year),
  });

  if (params.quarter) search.set('quarter', String(params.quarter));
  if (params.month) search.set('month', String(params.month));
  if (params.week) search.set('week', String(params.week));
  return search.toString();
}

export function displayValue(value) {
  return value === null || value === undefined || value === '' ? '—' : value;
}

export function formatNumber(value) {
  return (Number(value) || 0).toLocaleString('vi-VN');
}

export function formatDateTime(value) {
  const match = String(value || '').match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/,
  );
  if (!match) return displayValue(value);
  const date = `${match[3]}/${match[2]}/${match[1]}`;
  return match[4] ? `${date} ${match[4]}:${match[5]}` : date;
}

const OPERATIONAL_STATUS_LABELS = {
  UPCOMING: 'Sắp tổ chức',
  ONGOING: 'Đang diễn ra',
  FINISHED: 'Đã kết thúc',
  UNKNOWN: 'Chưa xác định',
};

const REGISTRATION_STATUS_LABELS = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  CANCELLED: 'Đã hủy',
};

export function getOperationalStatusLabel(value) {
  return OPERATIONAL_STATUS_LABELS[value] || displayValue(value);
}

export function getRegistrationStatusLabel(value) {
  return REGISTRATION_STATUS_LABELS[value] || displayValue(value);
}

export function getCheckedInLabel(value) {
  if (value === true || value === 1 || value === '1') return 'Đã check-in';
  if (value === false || value === 0 || value === '0') return 'Chưa check-in';
  return 'Chưa xác định';
}

export function getBusinessError(error, fallback) {
  const message = error?.response?.data?.message;
  return typeof message === 'string' && message.trim() ? message.trim() : fallback;
}
