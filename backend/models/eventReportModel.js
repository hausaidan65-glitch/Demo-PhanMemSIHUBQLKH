const db = require("../config/db");

const PARTICIPANT_GROUP_FIELDS = [
  "gender",
  "age_group",
  "user_type",
  "project_field",
  "startup_stage",
  "program_selection_status",
  "registration_status",
  "checked_in",
];

function normalizeGroupValue(value) {
  if (value === null || value === undefined || value === "") {
    return "UNKNOWN";
  }

  return String(value);
}

function groupParticipants(participants) {
  return PARTICIPANT_GROUP_FIELDS.reduce((groups, field) => {
    const counts = new Map();

    participants.forEach((participant) => {
      const value = normalizeGroupValue(participant[field]);
      counts.set(value, (counts.get(value) || 0) + 1);
    });

    groups[field] = [...counts.entries()].map(([value, count]) => ({
      value,
      count,
    }));

    return groups;
  }, {});
}

class EventReportModel {
  static async getSeminarSummary(period) {
    const periodParams = [period.report_end, period.report_start];

    const [summaryRows] = await db.query(
      `
      SELECT
        COUNT(DISTINCT e.id) AS total_seminars,
        COUNT(p.id) AS total_participants,
        COUNT(DISTINCT CASE WHEN e.status = 'OPEN' THEN e.id END) AS open,
        COUNT(DISTINCT CASE WHEN e.status = 'CLOSED' THEN e.id END) AS closed,
        COUNT(DISTINCT CASE WHEN e.status = 'FINISHED' THEN e.id END) AS finished,
        COUNT(DISTINCT CASE WHEN e.status = 'DRAFT' THEN e.id END) AS draft,
        COUNT(
          DISTINCT CASE
            WHEN e.status IS NULL
              OR e.status NOT IN ('OPEN', 'CLOSED', 'FINISHED', 'DRAFT')
            THEN e.id
          END
        ) AS other_status_count,
        (
          SELECT COUNT(*)
          FROM startup_connection_events invalid_event
          WHERE invalid_event.event_type = 'SEMINAR'
            AND (
              invalid_event.start_datetime IS NULL
              OR invalid_event.end_datetime IS NULL
              OR invalid_event.start_datetime > invalid_event.end_datetime
            )
        ) AS missing_official_dates
      FROM startup_connection_events e
      LEFT JOIN startup_connection_participants p
        ON p.event_id = e.id
      WHERE e.event_type = 'SEMINAR'
        AND e.start_datetime IS NOT NULL
        AND e.end_datetime IS NOT NULL
        AND e.start_datetime <= e.end_datetime
        AND e.start_datetime <= ?
        AND e.end_datetime >= ?
      `,
      periodParams,
    );

    const [participants] = await db.query(
      `
      SELECT
        u.gender,
        u.age_group,
        u.user_type,
        p.project_field,
        p.startup_stage,
        p.program_selection_status,
        p.registration_status,
        p.checked_in
      FROM startup_connection_participants p
      INNER JOIN startup_connection_events e
        ON e.id = p.event_id
      LEFT JOIN users u
        ON u.id = p.user_id
      WHERE e.event_type = 'SEMINAR'
        AND e.start_datetime IS NOT NULL
        AND e.end_datetime IS NOT NULL
        AND e.start_datetime <= e.end_datetime
        AND e.start_datetime <= ?
        AND e.end_datetime >= ?
      `,
      periodParams,
    );

    const summary = summaryRows[0] || {};

    return {
      total_seminars: Number(summary.total_seminars) || 0,
      total_participants: Number(summary.total_participants) || 0,
      statuses: {
        open: Number(summary.open) || 0,
        closed: Number(summary.closed) || 0,
        finished: Number(summary.finished) || 0,
        draft: Number(summary.draft) || 0,
        other_status_count: Number(summary.other_status_count) || 0,
      },
      participant_groups: groupParticipants(participants),
      missing_official_dates: Number(summary.missing_official_dates) || 0,
    };
  }

  static async getSeminars(period) {
    const [rows] = await db.query(
      `
      SELECT
        e.id AS seminar_id,
        e.event_name,
        e.event_code,
        CASE WHEN parent.id IS NOT NULL THEN e.parent_event_id ELSE NULL END
          AS parent_event_id,
        parent.event_name AS parent_exhibition_name,
        e.mission,
        e.location,
        e.start_datetime,
        e.end_datetime,
        e.organizer,
        e.max_participants,
        e.current_participants,
        e.status,
        COUNT(p.id) AS total_participants,
        COUNT(CASE WHEN p.checked_in = 1 THEN 1 END) AS checked_in_participants
      FROM startup_connection_events e
      LEFT JOIN startup_connection_events parent
        ON parent.id = e.parent_event_id
        AND parent.event_type = 'EXHIBITION'
      LEFT JOIN startup_connection_participants p
        ON p.event_id = e.id
      WHERE e.event_type = 'SEMINAR'
        AND e.start_datetime IS NOT NULL
        AND e.end_datetime IS NOT NULL
        AND e.start_datetime <= e.end_datetime
        AND e.start_datetime <= ?
        AND e.end_datetime >= ?
      GROUP BY
        e.id,
        e.event_name,
        e.event_code,
        e.parent_event_id,
        parent.id,
        parent.event_name,
        e.mission,
        e.location,
        e.start_datetime,
        e.end_datetime,
        e.organizer,
        e.max_participants,
        e.current_participants,
        e.status
      ORDER BY e.start_datetime DESC, e.id DESC
      `,
      [period.report_end, period.report_start],
    );

    return rows.map((row) => ({
      ...row,
      seminar_id: Number(row.seminar_id),
      parent_event_id:
        row.parent_event_id === null ? null : Number(row.parent_event_id),
      max_participants: Number(row.max_participants) || 0,
      current_participants: Number(row.current_participants) || 0,
      total_participants: Number(row.total_participants) || 0,
      checked_in_participants: Number(row.checked_in_participants) || 0,
    }));
  }

  static async findSeminarById(seminarId) {
    const [rows] = await db.query(
      `
      SELECT
        e.id AS seminar_id,
        e.event_name,
        e.event_code,
        CASE WHEN parent.id IS NOT NULL THEN e.parent_event_id ELSE NULL END
          AS parent_event_id,
        parent.event_name AS parent_exhibition_name,
        e.mission,
        e.location,
        e.start_datetime,
        e.end_datetime,
        e.organizer,
        e.max_participants,
        e.current_participants,
        e.status
      FROM startup_connection_events e
      LEFT JOIN startup_connection_events parent
        ON parent.id = e.parent_event_id
        AND parent.event_type = 'EXHIBITION'
      WHERE e.id = ?
        AND e.event_type = 'SEMINAR'
      LIMIT 1
      `,
      [seminarId],
    );

    if (!rows.length) {
      return null;
    }

    const seminar = rows[0];

    return {
      ...seminar,
      seminar_id: Number(seminar.seminar_id),
      parent_event_id:
        seminar.parent_event_id === null
          ? null
          : Number(seminar.parent_event_id),
      max_participants: Number(seminar.max_participants) || 0,
      current_participants: Number(seminar.current_participants) || 0,
    };
  }

  static participantSelectSql() {
    return `
      SELECT
        p.id AS participant_id,
        p.user_id,
        u.fullname AS full_name,
        u.email,
        u.phone,
        u.gender,
        u.age_group,
        u.user_type,
        p.organization,
        p.position,
        p.participant_role,
        p.has_project,
        p.project_field,
        p.startup_stage,
        p.program_selection_status,
        p.support_needs,
        p.organizer_question,
        p.note,
        p.registration_status,
        p.checked_in,
        p.checked_in_at,
        p.created_at,
        p.updated_at
      FROM startup_connection_participants p
      LEFT JOIN users u
        ON u.id = p.user_id
    `;
  }

  static normalizeParticipant(row) {
    const checkedIn =
      row.checked_in === true || row.checked_in === 1 || row.checked_in === "1"
        ? 1
        : row.checked_in === false ||
            row.checked_in === 0 ||
            row.checked_in === "0"
          ? 0
          : row.checked_in;

    return {
      ...row,
      participant_id: Number(row.participant_id),
      user_id: Number(row.user_id),
      has_project: Number(row.has_project) || 0,
      checked_in: checkedIn,
    };
  }

  static async getSeminarParticipants(seminarId) {
    const [rows] = await db.query(
      `
      ${this.participantSelectSql()}
      WHERE p.event_id = ?
      ORDER BY p.id DESC
      `,
      [seminarId],
    );

    return rows.map((row) => this.normalizeParticipant(row));
  }

  static async getSeminarParticipantDetail(seminarId, participantId) {
    const [rows] = await db.query(
      `
      ${this.participantSelectSql()}
      INNER JOIN startup_connection_events e
        ON e.id = p.event_id
        AND e.event_type = 'SEMINAR'
      WHERE p.event_id = ?
        AND p.id = ?
      LIMIT 1
      `,
      [seminarId, participantId],
    );

    return rows.length ? this.normalizeParticipant(rows[0]) : null;
  }
}

module.exports = EventReportModel;
