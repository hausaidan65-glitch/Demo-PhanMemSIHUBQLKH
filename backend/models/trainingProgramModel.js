const db = require("../config/db");

class TrainingProgramModel {
  static async getTree() {
    const sql = `
        SELECT

            tp.id AS program_id,
            tp.program_name,
            tp.description AS program_description,

            c.id AS course_id,
            c.course_name,
            c.status AS course_status,

            cc.id AS class_id,
            cc.class_name,
            cc.schedule_note,
            cc.location,
            cc.status AS class_status,
            cc.max_students,
            cc.current_students

        FROM training_programs tp

        LEFT JOIN courses c
            ON tp.id = c.program_id

        LEFT JOIN course_classes cc
            ON c.id = cc.course_id

        ORDER BY
            tp.id,
            c.id,
            cc.id
        `;

    const [rows] = await db.query(sql);

    const programs = {};

    rows.forEach((row) => {
      if (!programs[row.program_id]) {
        programs[row.program_id] = {
          id: row.program_id,
          program_name: row.program_name,
          description: row.program_description,
          courses: [],
        };
      }

      if (row.course_id) {
        let course = programs[row.program_id].courses.find(
          (item) => item.id === row.course_id,
        );

        if (!course) {
          course = {
            id: row.course_id,

            course_name: row.course_name,

            status: row.course_status,

            classes: [],
          };

          programs[row.program_id].courses.push(course);
        }

        if (row.class_id) {
          course.classes.push({
            id: row.class_id,

            class_name: row.class_name,

            schedule_note: row.schedule_note,

            location: row.location,

            status: row.class_status,

            max_students: row.max_students,

            current_students: row.current_students,
          });
        }
      }
    });

    return Object.values(programs);
  }
  static async getAll() {
    const [rows] = await db.query(`
    SELECT
      tp.id,
      tp.program_name,
      tp.description,
      tp.status,
      tp.created_at,
      tp.updated_at,

      COUNT(DISTINCT c.id) AS total_courses,
      COUNT(DISTINCT cc.id) AS total_classes

    FROM training_programs tp

    LEFT JOIN courses c
      ON c.program_id = tp.id

    LEFT JOIN course_classes cc
      ON cc.course_id = c.id

    GROUP BY
      tp.id,
      tp.program_name,
      tp.description,
      tp.status,
      tp.created_at,
      tp.updated_at

    ORDER BY tp.id ASC
  `);

    return rows.map((item) => ({
      ...item,
      total_courses: Number(item.total_courses) || 0,
      total_classes: Number(item.total_classes) || 0,
    }));
  }

  static async findById(id) {
    const [rows] = await db.query(
      `
      SELECT
        id,
        program_name,
        description,
        status,
        created_at,
        updated_at
      FROM training_programs
      WHERE id = ?
      LIMIT 1
    `,
      [id],
    );

    return rows[0] || null;
  }

  static async findByName(programName, excludeId = null) {
    let sql = `
    SELECT id
    FROM training_programs
    WHERE LOWER(TRIM(program_name)) = LOWER(TRIM(?))
  `;

    const params = [programName];

    if (excludeId) {
      sql += ` AND id <> ?`;
      params.push(excludeId);
    }

    sql += ` LIMIT 1`;

    const [rows] = await db.query(sql, params);

    return rows[0] || null;
  }

  static async create(data) {
    const [result] = await db.query(
      `
      INSERT INTO training_programs
      (
        program_name,
        description,
        status
      )
      VALUES (?, ?, ?)
    `,
      [data.program_name, data.description || null, data.status || "ACTIVE"],
    );

    return result.insertId;
  }

  static async update(id, data) {
    const [result] = await db.query(
      `
      UPDATE training_programs
      SET
        program_name = ?,
        description = ?,
        status = ?
      WHERE id = ?
    `,
      [
        data.program_name,
        data.description || null,
        data.status || "ACTIVE",
        id,
      ],
    );

    return result.affectedRows;
  }

  static async countCourses(id) {
    const [rows] = await db.query(
      `
      SELECT COUNT(*) AS total
      FROM courses
      WHERE program_id = ?
    `,
      [id],
    );

    return Number(rows[0]?.total) || 0;
  }

  static async remove(id) {
    const [result] = await db.query(
      `
      DELETE FROM training_programs
      WHERE id = ?
    `,
      [id],
    );

    return result.affectedRows;
  }
}

module.exports = TrainingProgramModel;
