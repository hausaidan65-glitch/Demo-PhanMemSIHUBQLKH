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
    return {
      activities: activities.total,

      courses: courses.total,

      classes: classes.total,

      registrations: registrations.total,

      openClasses: openClasses.total,

      fullClasses: fullClasses.total,

      todayRegistrations: todayRegistrations.total,
    };
  }
}

module.exports = DashboardModel;
