export const UNKNOWN_FILTER_VALUE = '__UNKNOWN__';

export const INITIAL_NETWORKING_EVENT_FILTERS = {
  keyword: '',
  stored_status: '',
  operational_status: '',
  mission: '',
};

function normalizedText(value) {
  return String(value ?? '').trim();
}

function searchableText(value) {
  return normalizedText(value).toLocaleLowerCase('vi-VN');
}

function matchesExact(value, filterValue) {
  if (!filterValue) return true;
  const normalizedValue = normalizedText(value);
  return filterValue === UNKNOWN_FILTER_VALUE
    ? normalizedValue === ''
    : normalizedValue === filterValue;
}

export function filterNetworkingEvents(events, filters) {
  const keyword = searchableText(filters.keyword);
  return events.filter((event) => {
    const keywordMatches = !keyword || [
      event.event_name,
      event.event_code,
      event.location,
      event.organizer,
      event.mission,
    ].some((value) => searchableText(value).includes(keyword));
    return keywordMatches
      && matchesExact(event.stored_status, filters.stored_status)
      && matchesExact(event.operational_status, filters.operational_status)
      && matchesExact(event.mission, filters.mission);
  });
}

export function getExactFilterOptions(events, field) {
  const values = new Set();
  let hasUnknown = false;
  events.forEach((event) => {
    const value = normalizedText(event[field]);
    if (value) values.add(value);
    else hasUnknown = true;
  });
  return {
    values: [...values].sort((left, right) => left.localeCompare(right, 'vi-VN')),
    hasUnknown,
  };
}

export function hasActiveNetworkingEventFilter(filters) {
  return Object.values(filters).some((value) => normalizedText(value) !== '');
}

export function buildNetworkingEventExportParams(filters, periodParams, scope) {
  const params = { ...periodParams, scope };
  if (scope === 'FILTERED') {
    Object.entries(filters).forEach(([name, value]) => {
      const normalizedValue = normalizedText(value);
      if (normalizedValue) params[name] = normalizedValue;
    });
  }
  return params;
}
