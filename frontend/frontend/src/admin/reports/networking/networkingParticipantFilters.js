export const UNKNOWN_FILTER_VALUE = '__UNKNOWN__';
export const INITIAL_NETWORKING_PARTICIPANT_FILTERS = {
  keyword: '', registrationStatus: '', checkedIn: '', userType: '', gender: '',
  ageGroup: '', organization: '', position: '', role: '',
};
const text = (value) => String(value ?? '').trim();
const searchable = (value) => text(value).toLocaleLowerCase('vi-VN');
function matches(value, filter) {
  if (!filter) return true;
  return filter === UNKNOWN_FILTER_VALUE ? text(value) === '' : text(value) === filter;
}
export function normalizeCheckIn(value) {
  if (value === true || value === 1 || value === '1') return 'CHECKED';
  if (value === false || value === 0 || value === '0') return 'UNCHECKED';
  return 'UNKNOWN';
}
export function getFilterOptions(rows, field) {
  const values = new Set(); let hasUnknown = false;
  rows.forEach((row) => { const value = text(row[field]); if (value) values.add(value); else hasUnknown = true; });
  return { values: [...values].sort((a, b) => a.localeCompare(b, 'vi-VN')), hasUnknown };
}
export function filterNetworkingParticipants(rows, filters) {
  const keyword = searchable(filters.keyword);
  return rows.filter((row) => (!keyword || [row.full_name, row.email, row.phone, row.organization, row.position, row.role].some((value) => searchable(value).includes(keyword))) &&
    matches(row.registration_status, filters.registrationStatus) &&
    (!filters.checkedIn || normalizeCheckIn(row.checked_in) === filters.checkedIn) &&
    matches(row.user_type, filters.userType) && matches(row.gender, filters.gender) &&
    matches(row.age_group, filters.ageGroup) && matches(row.organization, filters.organization) &&
    matches(row.position, filters.position) && matches(row.role, filters.role));
}
export function buildNetworkingParticipantExportParams(filters, period, scope, selectedFields) {
  const params = { scope, year: period.year, fields: selectedFields.join(',') };
  if (period.type === 'QUARTER') params.quarter = period.quarter;
  if (period.type === 'MONTH') params.month = period.month;
  if (period.type === 'WEEK') params.week = period.week;
  if (scope === 'FILTERED') {
    const values = { keyword: filters.keyword.trim(), registration_status: filters.registrationStatus,
      checked_in: filters.checkedIn, user_type: filters.userType, gender: filters.gender,
      age_group: filters.ageGroup, organization: filters.organization, position: filters.position, role: filters.role };
    Object.entries(values).forEach(([key, value]) => { if (value) params[key] = value === UNKNOWN_FILTER_VALUE ? 'UNKNOWN' : value; });
  }
  return params;
}
