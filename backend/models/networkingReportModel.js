const db = require("../config/db");

class NetworkingReportModel {
  static async getSummary(period) {
    const periodParams = [period.report_end, period.report_start];

    const [eventRows] = await db.query(
      `
      SELECT
        COUNT(*) AS total_events,
        COUNT(CASE WHEN e.end_datetime < NOW() THEN 1 END) AS total_finished,
        COUNT(
          CASE
            WHEN e.start_datetime <= NOW()
              AND e.end_datetime >= NOW()
            THEN 1
          END
        ) AS total_ongoing,
        COUNT(CASE WHEN e.start_datetime > NOW() THEN 1 END) AS total_upcoming,
        (
          SELECT COUNT(*)
          FROM networking_events invalid_event
          WHERE invalid_event.start_datetime IS NULL
            OR invalid_event.end_datetime IS NULL
            OR invalid_event.start_datetime > invalid_event.end_datetime
        ) AS missing_official_dates
      FROM networking_events e
      WHERE e.start_datetime IS NOT NULL
        AND e.end_datetime IS NOT NULL
        AND e.start_datetime <= e.end_datetime
        AND e.start_datetime <= ?
        AND e.end_datetime >= ?
      `,
      periodParams,
    );

    const [registrationRows] = await db.query(
      `
      SELECT
        COUNT(*) AS total_registered
      FROM networking_event_participants participant
      INNER JOIN networking_events e
        ON e.id = participant.event_id
      WHERE e.start_datetime IS NOT NULL
        AND e.end_datetime IS NOT NULL
        AND e.start_datetime <= e.end_datetime
        AND e.start_datetime <= ?
        AND e.end_datetime >= ?
        AND participant.registration_status IN ('PENDING', 'CONFIRMED')
      `,
      periodParams,
    );

    const events = eventRows[0] || {};
    const registrations = registrationRows[0] || {};

    return {
      total_events: Number(events.total_events) || 0,
      total_registered: Number(registrations.total_registered) || 0,
      total_finished: Number(events.total_finished) || 0,
      total_ongoing: Number(events.total_ongoing) || 0,
      total_upcoming: Number(events.total_upcoming) || 0,
      missing_official_dates: Number(events.missing_official_dates) || 0,
    };
  }

  static async getEvents(period) {
    const [rows] = await db.query(
      `
      SELECT
        e.id AS event_id,
        e.event_code,
        e.event_name,
        e.mission,
        e.location,
        e.organizer,
        e.start_datetime,
        e.end_datetime,
        e.status AS stored_status,
        CASE
          WHEN e.end_datetime < NOW() THEN 'FINISHED'
          WHEN e.start_datetime > NOW() THEN 'UPCOMING'
          ELSE 'ONGOING'
        END AS operational_status,
        e.max_participants,
        COALESCE(registrations.total_registered, 0) AS total_registered,
        COALESCE(registrations.checked_in_participants, 0)
          AS checked_in_participants
      FROM networking_events e
      LEFT JOIN (
        SELECT
          participant.event_id,
          COUNT(*) AS total_registered,
          COUNT(CASE WHEN participant.checked_in = 1 THEN 1 END)
            AS checked_in_participants
        FROM networking_event_participants participant
        WHERE participant.registration_status IN ('PENDING', 'CONFIRMED')
        GROUP BY participant.event_id
      ) registrations
        ON registrations.event_id = e.id
      WHERE e.start_datetime IS NOT NULL
        AND e.end_datetime IS NOT NULL
        AND e.start_datetime <= e.end_datetime
        AND e.start_datetime <= ?
        AND e.end_datetime >= ?
      ORDER BY e.start_datetime ASC, e.id ASC
      `,
      [period.report_end, period.report_start],
    );

    return rows.map((row) => ({
      ...row,
      event_id: Number(row.event_id),
      max_participants: Number(row.max_participants) || 0,
      total_registered: Number(row.total_registered) || 0,
      checked_in_participants: Number(row.checked_in_participants) || 0,
    }));
  }

  static async findEventById(eventId) {
    const [rows] = await db.query(
      `
      SELECT
        e.id AS event_id,
        e.event_code,
        e.event_name,
        e.mission,
        e.location,
        e.start_datetime,
        e.end_datetime,
        e.status AS stored_status,
        CASE
          WHEN e.start_datetime IS NULL
            OR e.end_datetime IS NULL
            OR e.start_datetime > e.end_datetime
          THEN 'UNKNOWN'
          WHEN e.end_datetime < NOW() THEN 'FINISHED'
          WHEN e.start_datetime > NOW() THEN 'UPCOMING'
          ELSE 'ONGOING'
        END AS operational_status
      FROM networking_events e
      WHERE e.id = ?
      LIMIT 1
      `,
      [eventId],
    );

    if (!rows.length) {
      return null;
    }

    return {
      ...rows[0],
      event_id: Number(rows[0].event_id),
    };
  }

  static async findEventByIdForPeriod(eventId, period) {
    const [rows] = await db.query(
      `
      SELECT
        e.id AS event_id,
        e.event_code,
        e.event_name,
        e.location,
        e.start_datetime,
        e.end_datetime
      FROM networking_events e
      WHERE e.id = ?
        AND e.start_datetime IS NOT NULL
        AND e.end_datetime IS NOT NULL
        AND e.start_datetime <= e.end_datetime
        AND e.start_datetime <= ?
        AND e.end_datetime >= ?
      LIMIT 1
      `,
      [eventId, period.report_end, period.report_start],
    );

    if (!rows.length) return null;

    return { ...rows[0], event_id: Number(rows[0].event_id) };
  }

  static async getEventParticipants(eventId) {
    const [rows] = await db.query(
      `
      SELECT
        participant.id AS participant_id,
        participant.user_id,
        user.fullname AS full_name,
        user.email,
        user.phone,
        participant.organization,
        participant.position,
        participant.participant_role AS role,
        participant.registration_status,
        participant.checked_in,
        participant.checked_in_at,
        participant.created_at,
        user.gender,
        user.age_group,
        user.user_type
      FROM networking_event_participants participant
      LEFT JOIN users user
        ON user.id = participant.user_id
      WHERE participant.event_id = ?
        AND participant.registration_status IN ('PENDING', 'CONFIRMED')
      ORDER BY participant.created_at ASC, participant.id ASC
      `,
      [eventId],
    );

    return rows.map((row) => ({
      ...row,
      participant_id: Number(row.participant_id),
      user_id: row.user_id === null ? null : Number(row.user_id),
      checked_in:
        row.checked_in === true || row.checked_in === 1 || row.checked_in === "1"
          ? true
          : row.checked_in === false ||
              row.checked_in === 0 ||
              row.checked_in === "0"
            ? false
            : row.checked_in,
    }));
  }

  static async getEventParticipantDetail(eventId, participantId) {
    const [rows] = await db.query(
      `
      SELECT
        participant.id AS participant_id,
        participant.user_id,
        user.fullname AS full_name,
        user.email,
        user.phone,
        user.gender,
        user.age_group,
        user.user_type,
        participant.organization,
        participant.position,
        participant.participant_role AS role,
        participant.registration_status,
        participant.checked_in,
        participant.checked_in_at,
        participant.created_at,
        participant.has_project,
        participant.project_field,
        participant.startup_stage,
        participant.program_selection_status,
        participant.support_needs,
        participant.organizer_question,
        participant.note,
        participant.connection_need
      FROM networking_event_participants participant
      LEFT JOIN users user
        ON user.id = participant.user_id
      WHERE participant.event_id = ?
        AND participant.id = ?
      LIMIT 1
      `,
      [eventId, participantId],
    );

    if (!rows.length) {
      return null;
    }

    const participant = rows[0];

    return {
      ...participant,
      participant_id: Number(participant.participant_id),
      user_id:
        participant.user_id === null ? null : Number(participant.user_id),
      has_project:
        participant.has_project === true ||
        participant.has_project === 1 ||
        participant.has_project === "1"
          ? true
          : participant.has_project === false ||
              participant.has_project === 0 ||
              participant.has_project === "0"
            ? false
            : participant.has_project,
      checked_in:
        participant.checked_in === true ||
        participant.checked_in === 1 ||
        participant.checked_in === "1"
          ? true
          : participant.checked_in === false ||
              participant.checked_in === 0 ||
              participant.checked_in === "0"
            ? false
            : participant.checked_in,
    };
  }
}

module.exports = NetworkingReportModel;
