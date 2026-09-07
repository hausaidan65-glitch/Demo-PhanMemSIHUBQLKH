export function splitDateTime(value) {
  const match = String(value || '').match(
    /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/,
  );
  return { date: match?.[1] || '', time: match?.[2] || '' };
}

export function combineDateTime(date, time) {
  if (!date && !time) return '';
  return date && time ? `${date}T${time}` : '';
}

function formatDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

export function formatOrganizationRange(startValue, endValue, dateOnly = false) {
  if (!startValue || !endValue) return 'Chưa cập nhật';
  const start = splitDateTime(startValue);
  const end = splitDateTime(endValue);
  const startDate = formatDate(start.date);
  const endDate = formatDate(end.date);
  if (!startDate || !endDate) return 'Chưa cập nhật';
  if (dateOnly) {
    return start.date === end.date ? startDate : `${startDate} → ${endDate}`;
  }
  if (!start.time || !end.time) return 'Chưa cập nhật';
  return start.date === end.date
    ? `${startDate} • ${start.time} – ${end.time}`
    : `${startDate} ${start.time} → ${endDate} ${end.time}`;
}
