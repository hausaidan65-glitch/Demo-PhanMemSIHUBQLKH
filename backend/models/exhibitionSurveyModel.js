const db = require("../config/db");

class ExhibitionSurveyModel {
  static async create(data) {
    const [result] = await db.query(
      `
INSERT INTO exhibition_surveys (
  event_id,

  fullname,
  position,
  organization,
  phone,
  email,

  gender,
  female_founder,
  age_group,
  user_type,

  project_field,
  project_field_other,

  startup_stage,
  team_size,
  program_selection_status,

  networking_expectation,
  special_connection_request,
  organizer_question,

  exhibition_product_name,
  exhibition_product_quantity,

  sold_or_ordered_quantity,
  visitor_count,
  b2b_matching_count,
  public_sector_connection_count,

  mou_count,
  exhibition_revenue,

  highlight_impression,
  want_to_join_again,

  organizer_feedback,
  other_sharing
)
VALUES (
  ?, ?, ?, ?, ?, ?,
  ?, ?, ?, ?,
  ?, ?,
  ?, ?, ?,
  ?, ?, ?,
  ?, ?,
  ?, ?, ?, ?,
  ?, ?,
  ?, ?,
  ?, ?
)
      `,
      [
        data.event_id,

        data.fullname,
        data.position,
        data.organization,
        data.phone,
        data.email,

        data.gender || null,

        data.female_founder === true ||
        data.female_founder === 1 ||
        data.female_founder === "1"
          ? 1
          : 0,

        data.age_group || null,
        data.user_type || null,

        data.project_field,
        data.project_field_other || null,

        data.startup_stage || null,
        data.team_size || null,
        data.program_selection_status || null,

        data.networking_expectation || null,
        data.special_connection_request || null,
        data.organizer_question || null,

        data.exhibition_product_name,
        data.exhibition_product_quantity,

        Number(data.sold_or_ordered_quantity) || 0,
        Number(data.visitor_count) || 0,
        Number(data.b2b_matching_count) || 0,
        Number(data.public_sector_connection_count) || 0,

        data.mou_count === "" ||
        data.mou_count === null ||
        data.mou_count === undefined
          ? null
          : Number(data.mou_count),

        data.exhibition_revenue === "" ||
        data.exhibition_revenue === null ||
        data.exhibition_revenue === undefined
          ? null
          : Number(data.exhibition_revenue),

        data.highlight_impression,
        data.want_to_join_again,

        data.organizer_feedback || null,
        data.other_sharing || null,
      ],
    );

    return result.insertId;
  }
  static async findByEventId(eventId) {
    const [rows] = await db.query(
      `
      SELECT *
      FROM exhibition_surveys
      WHERE event_id = ?
      ORDER BY created_at DESC, id DESC
    `,
      [eventId],
    );

    return rows;
  }

  static async findById(id) {
    const [rows] = await db.query(
      `
      SELECT *
      FROM exhibition_surveys
      WHERE id = ?
      LIMIT 1
      `,
      [id],
    );

    return rows[0] || null;
  }

  static async getByEvent(eventId) {
    const [rows] = await db.query(
      `
      SELECT *
      FROM exhibition_surveys
      WHERE event_id = ?
      ORDER BY id DESC
      `,
      [eventId],
    );

    return rows;
  }
  static async getExportData(eventId = null) {
    const conditions = [];
    const params = [];

    if (eventId) {
      conditions.push("s.event_id = ?");
      params.push(eventId);
    }

    const whereSql =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
    SELECT
      s.*
    FROM exhibition_surveys s
    ${whereSql}
    ORDER BY s.created_at DESC, s.id DESC
    `,
      params,
    );

    return rows;
  }

  static async countByEvent(eventId) {
    const [rows] = await db.query(
      `
      SELECT COUNT(*) AS total
      FROM exhibition_surveys
      WHERE event_id = ?
      `,
      [eventId],
    );

    return Number(rows[0]?.total) || 0;
  }
}

module.exports = ExhibitionSurveyModel;
