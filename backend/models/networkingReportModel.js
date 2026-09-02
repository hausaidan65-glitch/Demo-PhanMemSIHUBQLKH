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
        COALESCE(registrations.total_registered, 0) AS total_registered
      FROM networking_events e
      LEFT JOIN (
        SELECT
          participant.event_id,
          COUNT(*) AS total_registered
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
    }));
  }
}

module.exports = NetworkingReportModel;
