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
    };
  }
}

module.exports = DashboardModel;
