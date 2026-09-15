const db = require("../config/db");

class MissionModel {
  static async getAll(query = {}) {
    const conditions = [];
    const params = [];

    if (query.keyword) {
      const keyword = `%${query.keyword}%`;
      conditions.push("(mission_name LIKE ? OR description LIKE ?)");
      params.push(keyword, keyword);
    }

    if (query.mission_source) {
      conditions.push("mission_source = ?");
      params.push(query.mission_source);
    }

    if (query.status) {
      conditions.push("status = ?");
      params.push(query.status);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";
    const [rows] = await db.query(
      `
      SELECT id, mission_name, mission_source, description, status,
        created_at, updated_at
      FROM missions
      ${whereClause}
      ORDER BY id DESC
      `,
      params,
    );

    return rows;
  }

  static async findById(id) {
    const [rows] = await db.query(
      `
      SELECT id, mission_name, mission_source, description, status,
        created_at, updated_at
      FROM missions
      WHERE id = ?
      LIMIT 1
      `,
      [id],
    );

    return rows[0] || null;
  }

  static async create(data) {
    const [result] = await db.query(
      `
      INSERT INTO missions (mission_name, mission_source, description, status)
      VALUES (?, ?, ?, ?)
      `,
      [data.mission_name, data.mission_source, data.description, data.status],
    );

    return result.insertId;
  }

  static async updateInfo(id, data) {
    const [result] = await db.query(
      `
      UPDATE missions
      SET mission_name = ?, mission_source = ?, description = ?
      WHERE id = ?
      `,
      [data.mission_name, data.mission_source, data.description, id],
    );

    return result.affectedRows;
  }

  static async updateStatus(id, status) {
    const [result] = await db.query(
      "UPDATE missions SET status = ? WHERE id = ?",
      [status, id],
    );

    return result.affectedRows;
  }

  static async countActivityLinks(id) {
    const [rows] = await db.query(
      `
      SELECT
        (SELECT COUNT(*) FROM courses WHERE mission_id = ?) +
        (SELECT COUNT(*) FROM startup_connection_events WHERE mission_id = ?) +
        (SELECT COUNT(*) FROM networking_events WHERE mission_id = ?) +
        (SELECT COUNT(*) FROM incubation_programs WHERE mission_id = ?)
          AS total
      `,
      [id, id, id, id],
    );

    return Number(rows[0]?.total) || 0;
  }
}

module.exports = MissionModel;
