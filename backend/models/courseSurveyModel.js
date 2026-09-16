const db = require("../config/db");

const SURVEY_SELECT = `
  SELECT
    s.*,

    cc.class_name,
    cc.class_code,
    c.course_name

  FROM course_class_surveys s

  LEFT JOIN course_classes cc
    ON cc.id = s.class_id

  LEFT JOIN courses c
    ON c.id = cc.course_id
`;

function buildSurveyFilters(query = {}) {
  const conditions = [];
  const params = [];

  const classId = Number(query.class_id);

  if (Number.isInteger(classId) && classId > 0) {
    conditions.push("s.class_id = ?");
    params.push(classId);
  }

  if (query.from && String(query.from).trim()) {
    conditions.push("s.created_at >= ?");
    params.push(`${String(query.from).trim()} 00:00:00`);
  }

  if (query.to && String(query.to).trim()) {
    conditions.push("s.created_at <= ?");
    params.push(`${String(query.to).trim()} 23:59:59`);
  }

  const whereSql = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  return { whereSql, params };
}

class CourseSurveyModel {
  static async create(data) {
    const [result] = await db.query(
      `
      INSERT INTO course_class_surveys (
        class_id,

        q1_content_meets_objective,
        q2_materials_clear_useful,
        q3_knowledge_practical,
        q4_trainer_expertise,
        q5_trainer_delivery,
        q6_trainer_support,
        q7_duration,

        q8_most_satisfied,
        q9_improvement,
        q10_next_course_suggestion
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        data.class_id,

        data.q1_content_meets_objective,
        data.q2_materials_clear_useful,
        data.q3_knowledge_practical || null,
        data.q4_trainer_expertise || null,
        data.q5_trainer_delivery || null,
        data.q6_trainer_support || null,
        data.q7_duration || null,

        data.q8_most_satisfied || null,
        data.q9_improvement || null,
        data.q10_next_course_suggestion || null,
      ],
    );

    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await db.query(
      `
      SELECT *
      FROM course_class_surveys
      WHERE id = ?
      LIMIT 1
      `,
      [id],
    );

    return rows[0] || null;
  }

  static async findByClassId(classId) {
    const [rows] = await db.query(
      `
      SELECT *
      FROM course_class_surveys
      WHERE class_id = ?
      ORDER BY created_at DESC, id DESC
      `,
      [classId],
    );

    return rows;
  }

  static async countByClassId(classId) {
    const [rows] = await db.query(
      `
      SELECT COUNT(*) AS total
      FROM course_class_surveys
      WHERE class_id = ?
      `,
      [classId],
    );

    return Number(rows[0]?.total) || 0;
  }

  static async getAll(query = {}) {
    const { whereSql, params } = buildSurveyFilters(query);

    const page = Math.max(Number(query.page) || 1, 1);

    const requestedLimit = Number(query.limit) || 10;

    const limit = Math.min(Math.max(requestedLimit, 1), 100);

    const offset = (page - 1) * limit;

    const [rows] = await db.query(
      `
      ${SURVEY_SELECT}

      ${whereSql}

      ORDER BY s.created_at DESC, s.id DESC

      LIMIT ?
      OFFSET ?
      `,
      [...params, limit, offset],
    );

    return rows;
  }

  static async countAll(query = {}) {
    const { whereSql, params } = buildSurveyFilters(query);

    const [rows] = await db.query(
      `
      SELECT COUNT(*) AS total

      FROM course_class_surveys s

      ${whereSql}
      `,
      params,
    );

    return Number(rows[0]?.total) || 0;
  }

  static async getExportData(query = {}) {
    const { whereSql, params } = buildSurveyFilters(query);

    const [rows] = await db.query(
      `
      ${SURVEY_SELECT}

      ${whereSql}

      ORDER BY s.created_at DESC, s.id DESC
      `,
      params,
    );

    return rows;
  }

  static async remove(id) {
    const [result] = await db.query(
      `
      DELETE FROM course_class_surveys
      WHERE id = ?
      `,
      [id],
    );

    return result.affectedRows;
  }
}

module.exports = CourseSurveyModel;
