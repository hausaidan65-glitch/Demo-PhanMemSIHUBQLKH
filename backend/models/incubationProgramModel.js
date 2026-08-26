const db = require("../config/db");

class IncubationProgramModel {
  // =========================================================
  // DANH SÁCH
  // =========================================================

  static async getAll(query = {}) {
    const { keyword, year, status } = query;

    const conditions = [];
    const params = [];

    if (keyword?.trim()) {
      conditions.push(`
        (
          p.program_name LIKE ?
          OR p.program_code LIKE ?
          OR p.organizer LIKE ?
        )
      `);

      const text = `%${keyword.trim()}%`;

      params.push(text, text, text);
    }

    if (year) {
      conditions.push("p.year = ?");

      params.push(Number(year));
    }

    if (status?.trim()) {
      conditions.push("p.status = ?");

      params.push(status.trim());
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
      SELECT
        p.*,

        COUNT(ip.id)
          AS total_profiles

      FROM incubation_programs p

      LEFT JOIN incubation_profiles ip
        ON ip.incubation_program_id = p.id

      ${where}

      GROUP BY p.id

      ORDER BY
        p.year DESC,
        p.id DESC
      `,
      params,
    );

    return rows;
  }

  // =========================================================
  // CHI TIẾT
  // =========================================================

  static async findById(id) {
    const [rows] = await db.query(
      `
      SELECT
        p.*,

        COUNT(ip.id)
          AS total_profiles

      FROM incubation_programs p

      LEFT JOIN incubation_profiles ip
        ON ip.incubation_program_id = p.id

      WHERE p.id = ?

      GROUP BY p.id

      LIMIT 1
      `,
      [id],
    );

    return rows[0] || null;
  }

  // =========================================================
  // DANH SÁCH HỒ SƠ THUỘC CHƯƠNG TRÌNH
  // =========================================================

  static async getProfiles(programId) {
    const [rows] = await db.query(
      `
      SELECT
        ip.id,
        ip.project_name,
        ip.company_name,

        ip.contact_fullname,
        ip.contact_phone,
        ip.contact_email,

        ip.development_stage,

        ip.status,

        ip.created_at,
        ip.updated_at

      FROM incubation_profiles ip

      WHERE ip.incubation_program_id = ?

      ORDER BY ip.id DESC
      `,
      [programId],
    );

    return rows;
  }

  // =========================================================
  // CREATE
  // =========================================================

  static async create(data) {
    const [result] = await db.query(
      `
      INSERT INTO incubation_programs (
        program_name,
        program_code,
        year,

        short_description,
        description,

        location,
        organizer,

        application_open,
        application_close,

        start_date,
        end_date,

        max_profiles,
        status
      )
      VALUES (
        ?, ?, ?,
        ?, ?,
        ?, ?,
        ?, ?,
        ?, ?,
        ?, ?
      )
      `,
      [
        data.program_name,
        data.program_code || null,

        data.year ?? null,

        data.short_description || null,
        data.description || null,

        data.location || null,
        data.organizer || null,

        data.application_open || null,
        data.application_close || null,

        data.start_date || null,
        data.end_date || null,

        data.max_profiles ?? 0,

        data.status || "DRAFT",
      ],
    );

    return result.insertId;
  }

  // =========================================================
  // UPDATE
  // =========================================================

  static async update(id, data) {
    const [result] = await db.query(
      `
      UPDATE incubation_programs
      SET
        program_name = ?,
        program_code = ?,
        year = ?,

        short_description = ?,
        description = ?,

        location = ?,
        organizer = ?,

        application_open = ?,
        application_close = ?,

        start_date = ?,
        end_date = ?,

        max_profiles = ?,
        status = ?

      WHERE id = ?
      `,
      [
        data.program_name,
        data.program_code || null,

        data.year ?? null,

        data.short_description || null,
        data.description || null,

        data.location || null,
        data.organizer || null,

        data.application_open || null,
        data.application_close || null,

        data.start_date || null,
        data.end_date || null,

        data.max_profiles ?? 0,

        data.status || "DRAFT",

        id,
      ],
    );

    return result;
  }

  // =========================================================
  // DELETE
  // =========================================================

  static async deleteById(id) {
    const [result] = await db.query(
      `
      DELETE
      FROM incubation_programs
      WHERE id = ?
      `,
      [id],
    );

    return result;
  }

  // =========================================================
  // STATISTICS
  // =========================================================

  static async getStatistics() {
    const [rows] = await db.query(`
      SELECT
        COUNT(*) AS total_programs,

        SUM(
          CASE
            WHEN status = 'OPEN'
            THEN 1
            ELSE 0
          END
        ) AS open_programs,

        SUM(
          CASE
            WHEN status = 'ONGOING'
            THEN 1
            ELSE 0
          END
        ) AS ongoing_programs,

        SUM(
          CASE
            WHEN status = 'FINISHED'
            THEN 1
            ELSE 0
          END
        ) AS finished_programs

      FROM incubation_programs
    `);

    const data = rows[0] || {};

    const [profileRows] = await db.query(`
        SELECT
          COUNT(*) AS total_profiles

        FROM incubation_profiles

        WHERE incubation_program_id
          IS NOT NULL
      `);

    return {
      total_programs: Number(data.total_programs) || 0,

      open_programs: Number(data.open_programs) || 0,

      ongoing_programs: Number(data.ongoing_programs) || 0,

      finished_programs: Number(data.finished_programs) || 0,

      total_profiles: Number(profileRows[0]?.total_profiles) || 0,
    };
  }
}

module.exports = IncubationProgramModel;
