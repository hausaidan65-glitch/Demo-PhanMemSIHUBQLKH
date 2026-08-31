export const UNKNOWN_FILTER_VALUE = "__UNKNOWN__";
export const NO_PARENT_FILTER_VALUE = "__NO_PARENT__";

export const INITIAL_SEMINAR_LIST_FILTERS = {
  keyword: "",
  status: "",
  parent: "",
  mission: "",
};

export const INITIAL_PARTICIPANT_FILTERS = {
  keyword: "",
  registrationStatus: "",
  checkedIn: "",
  userType: "",
  gender: "",
};

function normalizedText(value) {
  return String(value ?? "").trim();
}

function searchableText(value) {
  return normalizedText(value).toLocaleLowerCase("vi-VN");
}

function matchesRawFilter(value, filterValue) {
  if (!filterValue) {
    return true;
  }

  const normalizedValue = normalizedText(value);

  return filterValue === UNKNOWN_FILTER_VALUE
    ? normalizedValue === ""
    : normalizedValue === filterValue;
}

export function getRawFilterOptions(rows, field) {
  const values = new Set();
  let hasUnknown = false;

  rows.forEach((row) => {
    const value = normalizedText(row?.[field]);

    if (value) {
      values.add(value);
    } else {
      hasUnknown = true;
    }
  });

  return {
    values: [...values].sort((left, right) =>
      left.localeCompare(right, "vi-VN"),
    ),
    hasUnknown,
  };
}

export function getParentFilterOptions(seminars) {
  const options = new Map();
  let hasNoParent = false;

  seminars.forEach((seminar) => {
    const parentId = normalizedText(seminar?.parent_event_id);

    if (!parentId) {
      hasNoParent = true;
      return;
    }

    const name = normalizedText(seminar.parent_exhibition_name);

    options.set(parentId, name || `Triển lãm #${parentId}`);
  });

  return {
    values: [...options.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((left, right) => left.label.localeCompare(right.label, "vi-VN")),
    hasNoParent,
  };
}

export function filterSeminars(seminars, filters) {
  const keyword = searchableText(filters.keyword);

  return seminars.filter((seminar) => {
    const keywordMatches =
      !keyword ||
      [
        seminar.event_name,
        seminar.event_code,
        seminar.location,
        seminar.organizer,
        seminar.mission,
        seminar.parent_exhibition_name,
      ].some((value) => searchableText(value).includes(keyword));
    const parentMatches =
      !filters.parent ||
      (filters.parent === NO_PARENT_FILTER_VALUE
        ? !normalizedText(seminar.parent_event_id)
        : normalizedText(seminar.parent_event_id) === filters.parent);

    return (
      keywordMatches &&
      matchesRawFilter(seminar.status, filters.status) &&
      parentMatches &&
      matchesRawFilter(seminar.mission, filters.mission)
    );
  });
}

export function normalizeCheckIn(value) {
  if (value === true || value === 1 || value === "1") {
    return "CHECKED";
  }

  if (value === false || value === 0 || value === "0") {
    return "UNCHECKED";
  }

  return "UNKNOWN";
}

export function getCheckInOptions(participants) {
  return new Set(participants.map((participant) => normalizeCheckIn(participant.checked_in)));
}

export function filterParticipants(participants, filters) {
  const keyword = searchableText(filters.keyword);

  return participants.filter((participant) => {
    const keywordMatches =
      !keyword ||
      [
        participant.full_name,
        participant.email,
        participant.phone,
        participant.organization,
        participant.position,
      ].some((value) => searchableText(value).includes(keyword));

    return (
      keywordMatches &&
      matchesRawFilter(
        participant.registration_status,
        filters.registrationStatus,
      ) &&
      (!filters.checkedIn ||
        normalizeCheckIn(participant.checked_in) === filters.checkedIn) &&
      matchesRawFilter(participant.user_type, filters.userType) &&
      matchesRawFilter(participant.gender, filters.gender)
    );
  });
}

function exportFilterValue(value) {
  return value === UNKNOWN_FILTER_VALUE ? "UNKNOWN" : value;
}

export function buildParticipantExportParams(filters, searchParams, scope) {
  const params = { scope };

  ["year", "quarter", "month"].forEach((name) => {
    const value = searchParams.get(name);

    if (value) {
      params[name] = value;
    }
  });

  if (scope === "FILTERED") {
    const filterParams = {
      keyword: filters.keyword.trim(),
      registration_status: exportFilterValue(filters.registrationStatus),
      checked_in: filters.checkedIn,
      user_type: exportFilterValue(filters.userType),
      gender: exportFilterValue(filters.gender),
    };

    Object.entries(filterParams).forEach(([name, value]) => {
      if (value) {
        params[name] = value;
      }
    });
  }

  return params;
}
