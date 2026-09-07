const db = require("../config/db");

class DashboardModel {
  static async getStatistics() {
    const [
      [[activities]],
      [[courses]],
      [[classes]],
      [[registrations]],
      [[openClasses]],
      [[fullClasses]],
      [[todayRegistrations]],
    ] = await Promise.all([
      db.query(`
    SELECT COUNT(*) total
    FROM activities
  `),

      db.query(`
    SELECT COUNT(*) total
    FROM courses
  `),

      db.query(`
    SELECT COUNT(*) total
    FROM course_classes
  `),

      db.query(`
    SELECT COUNT(*) total
    FROM registrations
  `),

      db.query(`
    SELECT COUNT(*) total
    FROM course_classes
    WHERE status='OPEN'
  `),

      db.query(`
    SELECT COUNT(*) total
    FROM course_classes
    WHERE status='FULL'
  `),

      db.query(`
    SELECT COUNT(*) total
    FROM registrations
    WHERE DATE(created_at)=CURDATE()
  `),
    ]);
    const [topCourses] = await db.query(`

    SELECT
        c.course_name AS name,
        COUNT(r.id) AS value

    FROM registrations r

    JOIN course_classes cc
        ON r.class_id = cc.id

    JOIN courses c
        ON cc.course_id = c.id

    GROUP BY c.id, c.course_name

    ORDER BY value DESC

    LIMIT 5

`);
    const [classStatus] = await db.query(`

    SELECT
        status AS name,
        COUNT(*) AS value

    FROM course_classes

    GROUP BY status

`);
    const [programRanking] = await db.query(`

    SELECT
        p.program_name AS name,
        COUNT(cc.id) AS value

    FROM training_programs p

    JOIN courses c
        ON p.id = c.program_id

    JOIN course_classes cc
        ON c.id = cc.course_id

    GROUP BY p.id, p.program_name

    ORDER BY value DESC

    LIMIT 5

`);
    const [registrationTrend] = await db.query(`

    SELECT
        DATE_FORMAT(created_at,'%m/%Y') AS month,
        COUNT(*) AS total

    FROM registrations

    GROUP BY DATE_FORMAT(created_at,'%m/%Y')

    ORDER BY MIN(created_at)

    LIMIT 12

`);

    const [[trainingOverview]] = await db.query(`
      SELECT
        (SELECT COUNT(*)
         FROM courses c
         WHERE c.deleted_at IS NULL) AS total_courses,
        COUNT(DISTINCT cc.id) AS total_openings,
        COUNT(CASE
          WHEN r.register_status IN ('PENDING', 'CONFIRMED')
            AND r.user_id IS NOT NULL
          THEN r.id
        END) AS valid_registrations,
        COUNT(DISTINCT CASE
          WHEN cc.organization_start_date IS NOT NULL
            AND cc.organization_end_date IS NOT NULL
            AND cc.organization_start_date <= cc.organization_end_date
            AND cc.organization_end_date < CURRENT_DATE()
          THEN cc.id
        END) AS finished,
        COUNT(DISTINCT CASE
          WHEN cc.organization_start_date IS NOT NULL
            AND cc.organization_end_date IS NOT NULL
            AND cc.organization_start_date <= cc.organization_end_date
            AND cc.organization_start_date <= CURRENT_DATE()
            AND cc.organization_end_date >= CURRENT_DATE()
          THEN cc.id
        END) AS ongoing,
        COUNT(DISTINCT CASE
          WHEN cc.organization_start_date IS NOT NULL
            AND cc.organization_end_date IS NOT NULL
            AND cc.organization_start_date <= cc.organization_end_date
            AND cc.organization_start_date > CURRENT_DATE()
          THEN cc.id
        END) AS upcoming,
        COUNT(DISTINCT CASE
          WHEN cc.organization_start_date IS NULL
            OR cc.organization_end_date IS NULL
            OR cc.organization_start_date > cc.organization_end_date
          THEN cc.id
        END) AS missing_official_dates
      FROM course_classes cc
      INNER JOIN courses c ON c.id = cc.course_id AND c.deleted_at IS NULL
      LEFT JOIN registrations r ON r.class_id = cc.id
      WHERE cc.deleted_at IS NULL
    `);

    const [[startupConnectionOverview]] = await db.query(`
      SELECT
        COUNT(CASE WHEN sce.event_type = 'SEMINAR' THEN 1 END) AS seminar_total_events,
        COUNT(CASE
          WHEN sce.event_type = 'SEMINAR'
            AND sce.start_datetime IS NOT NULL
            AND sce.end_datetime IS NOT NULL
            AND sce.start_datetime <= sce.end_datetime
            AND sce.end_datetime < NOW()
          THEN 1
        END) AS seminar_finished,
        COUNT(CASE
          WHEN sce.event_type = 'SEMINAR'
            AND sce.start_datetime IS NOT NULL
            AND sce.end_datetime IS NOT NULL
            AND sce.start_datetime <= sce.end_datetime
            AND sce.start_datetime <= NOW()
            AND sce.end_datetime >= NOW()
          THEN 1
        END) AS seminar_ongoing,
        COUNT(CASE
          WHEN sce.event_type = 'SEMINAR'
            AND sce.start_datetime IS NOT NULL
            AND sce.end_datetime IS NOT NULL
            AND sce.start_datetime <= sce.end_datetime
            AND sce.start_datetime > NOW()
          THEN 1
        END) AS seminar_upcoming,
        COUNT(CASE
          WHEN sce.event_type = 'SEMINAR'
            AND (sce.start_datetime IS NULL
              OR sce.end_datetime IS NULL
              OR sce.start_datetime > sce.end_datetime)
          THEN 1
        END) AS seminar_missing_official_dates,
        (SELECT COUNT(*)
         FROM startup_connection_participants scp
         INNER JOIN startup_connection_events participant_event
           ON participant_event.id = scp.event_id
          AND participant_event.event_type = 'SEMINAR') AS seminar_total_participants,
        COUNT(CASE WHEN sce.event_type = 'EXHIBITION' THEN 1 END) AS exhibition_total_events,
        COUNT(CASE
          WHEN sce.event_type = 'EXHIBITION'
            AND sce.start_datetime IS NOT NULL
            AND sce.end_datetime IS NOT NULL
            AND sce.start_datetime <= sce.end_datetime
            AND sce.end_datetime < NOW()
          THEN 1
        END) AS exhibition_finished,
        COUNT(CASE
          WHEN sce.event_type = 'EXHIBITION'
            AND sce.start_datetime IS NOT NULL
            AND sce.end_datetime IS NOT NULL
            AND sce.start_datetime <= sce.end_datetime
            AND sce.start_datetime <= NOW()
            AND sce.end_datetime >= NOW()
          THEN 1
        END) AS exhibition_ongoing,
        COUNT(CASE
          WHEN sce.event_type = 'EXHIBITION'
            AND sce.start_datetime IS NOT NULL
            AND sce.end_datetime IS NOT NULL
            AND sce.start_datetime <= sce.end_datetime
            AND sce.start_datetime > NOW()
          THEN 1
        END) AS exhibition_upcoming,
        COUNT(CASE
          WHEN sce.event_type = 'EXHIBITION'
            AND (sce.start_datetime IS NULL
              OR sce.end_datetime IS NULL
              OR sce.start_datetime > sce.end_datetime)
          THEN 1
        END) AS exhibition_missing_official_dates,
        (SELECT COUNT(*) FROM exhibition_surveys) AS exhibition_survey_responses
      FROM startup_connection_events sce
    `);

    const [[networkingOverview]] = await db.query(`
      SELECT
        COUNT(DISTINCT ne.id) AS total_events,
        COUNT(CASE
          WHEN nep.registration_status IN ('PENDING', 'CONFIRMED')
          THEN nep.id
        END) AS valid_registrations,
        COUNT(DISTINCT CASE
          WHEN ne.start_datetime IS NOT NULL
            AND ne.end_datetime IS NOT NULL
            AND ne.start_datetime <= ne.end_datetime
            AND ne.end_datetime < NOW()
          THEN ne.id
        END) AS finished,
        COUNT(DISTINCT CASE
          WHEN ne.start_datetime IS NOT NULL
            AND ne.end_datetime IS NOT NULL
            AND ne.start_datetime <= ne.end_datetime
            AND ne.start_datetime <= NOW()
            AND ne.end_datetime >= NOW()
          THEN ne.id
        END) AS ongoing,
        COUNT(DISTINCT CASE
          WHEN ne.start_datetime IS NOT NULL
            AND ne.end_datetime IS NOT NULL
            AND ne.start_datetime <= ne.end_datetime
            AND ne.start_datetime > NOW()
          THEN ne.id
        END) AS upcoming,
        COUNT(DISTINCT CASE
          WHEN ne.start_datetime IS NULL
            OR ne.end_datetime IS NULL
            OR ne.start_datetime > ne.end_datetime
          THEN ne.id
        END) AS missing_official_dates
      FROM networking_events ne
      LEFT JOIN networking_event_participants nep ON nep.event_id = ne.id
    `);

    const [[incubationOverview]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM incubation_programs) AS total_programs,
        COUNT(*) AS total_profiles,
        COUNT(CASE WHEN status IN ('SUBMITTED', 'REVIEWING') THEN 1 END)
          AS under_review_profiles,
        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) AS approved_profiles
      FROM incubation_profiles
    `);

    const numberValue = (value) => Number(value) || 0;

    return {
      activities,
      courses,
      classes,
      registrations,
      openClasses,
      fullClasses,
      todayRegistrations,

      charts: {
        registrationTrend,
        topCourses,
        classStatus,
        programRanking,
      },
      overview: {
        training: {
          total_courses: numberValue(trainingOverview.total_courses),
          total_openings: numberValue(trainingOverview.total_openings),
          valid_registrations: numberValue(trainingOverview.valid_registrations),
          finished: numberValue(trainingOverview.finished),
          ongoing: numberValue(trainingOverview.ongoing),
          upcoming: numberValue(trainingOverview.upcoming),
          missing_official_dates: numberValue(
            trainingOverview.missing_official_dates,
          ),
        },
        startup_connection_day: {
          seminars: {
            total_events: numberValue(startupConnectionOverview.seminar_total_events),
            total_participants: numberValue(
              startupConnectionOverview.seminar_total_participants,
            ),
            finished: numberValue(startupConnectionOverview.seminar_finished),
            ongoing: numberValue(startupConnectionOverview.seminar_ongoing),
            upcoming: numberValue(startupConnectionOverview.seminar_upcoming),
            missing_official_dates: numberValue(
              startupConnectionOverview.seminar_missing_official_dates,
            ),
          },
          exhibitions: {
            total_events: numberValue(
              startupConnectionOverview.exhibition_total_events,
            ),
            survey_responses: numberValue(
              startupConnectionOverview.exhibition_survey_responses,
            ),
            finished: numberValue(startupConnectionOverview.exhibition_finished),
            ongoing: numberValue(startupConnectionOverview.exhibition_ongoing),
            upcoming: numberValue(startupConnectionOverview.exhibition_upcoming),
            missing_official_dates: numberValue(
              startupConnectionOverview.exhibition_missing_official_dates,
            ),
          },
        },
        networking: {
          total_events: numberValue(networkingOverview.total_events),
          valid_registrations: numberValue(networkingOverview.valid_registrations),
          finished: numberValue(networkingOverview.finished),
          ongoing: numberValue(networkingOverview.ongoing),
          upcoming: numberValue(networkingOverview.upcoming),
          missing_official_dates: numberValue(
            networkingOverview.missing_official_dates,
          ),
        },
        incubation: {
          total_programs: numberValue(incubationOverview.total_programs),
          total_profiles: numberValue(incubationOverview.total_profiles),
          under_review_profiles: numberValue(
            incubationOverview.under_review_profiles,
          ),
          approved_profiles: numberValue(incubationOverview.approved_profiles),
        },
      },
    };
  }
}

module.exports = DashboardModel;
