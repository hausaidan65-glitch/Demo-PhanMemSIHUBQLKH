const db = require("../config/db");

class NetworkingEventModel {
  // =========================================================
  // DANH SÁCH SỰ KIỆN KẾT NỐI
  // =========================================================
  static async getAll(query = {}) {
    const conditions = [];
    const params = [];

    // =====================================================
    // TRẠNG THÁI
    // =====================================================
    if (query.status) {
      const status = String(query.status).toUpperCase();

      if (["DRAFT", "OPEN", "CLOSED", "FINISHED"].includes(status)) {
        conditions.push("e.status = ?");
        params.push(status);
      }
    }

    // =====================================================
    // NĂM
    // =====================================================
    if (query.year) {
      const year = Number(query.year);

      if (Number.isInteger(year) && year >= 2000 && year <= 2100) {
        conditions.push(`
          (
            e.year = ?
            OR YEAR(e.start_datetime) = ?
            OR YEAR(e.end_datetime) = ?
          )
        `);

        params.push(year, year, year);
      }
    }

    // =====================================================
    // THÁNG
    // =====================================================
    if (query.month) {
      const month = Number(query.month);

      if (Number.isInteger(month) && month >= 1 && month <= 12) {
        conditions.push(`
          (
            MONTH(e.start_datetime) = ?
            OR MONTH(e.end_datetime) = ?
          )
        `);

        params.push(month, month);
      }
    }
    if (query.mission) {
      const mission = `%${String(query.mission).trim()}%`;

      conditions.push("e.mission LIKE ?");
      params.push(mission);
    }
    // =====================================================
    // TÌM KIẾM
    // =====================================================
    if (query.keyword) {
      const keyword = `%${String(query.keyword).trim()}%`;

      conditions.push(`
        (
          e.event_name LIKE ?
          OR e.event_code LIKE ?
          OR e.location LIKE ?
          OR e.organizer LIKE ?
          OR e.short_description LIKE ?
          OR e.description LIKE ?
          OR e.mission LIKE ?
        )
      `);

      params.push(
        keyword,
        keyword,
        keyword,
        keyword,
        keyword,
        keyword,
        keyword,
      );
    }

    const whereSql =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
      SELECT
        e.id,
        e.event_name,
        e.event_code,
        e.short_description,
        e.description,
        e.mission,
        e.thumbnail,
        e.location,
        e.start_datetime,
        e.end_datetime,
        e.year,
        e.organizer,
        e.max_participants,
        e.current_participants,
        e.status,
        e.created_at,
        e.updated_at,

        (
          SELECT COUNT(*)
          FROM networking_event_participants p
          WHERE p.event_id = e.id
        ) AS total_participants

      FROM networking_events e

      ${whereSql}

      ORDER BY
        e.start_datetime DESC,
        e.id DESC
      `,
      params,
    );

    return rows.map((item) => ({
      ...item,

      id: Number(item.id) || null,

      year: item.year !== null ? Number(item.year) : null,

      max_participants: Number(item.max_participants) || 0,

      current_participants: Number(item.current_participants) || 0,

      total_participants: Number(item.total_participants) || 0,
    }));
  }

  // =========================================================
  // CHI TIẾT SỰ KIỆN
  // =========================================================
  static async findById(id) {
    const [rows] = await db.query(
      `
      SELECT
        e.id,
        e.event_name,
        e.event_code,
        e.short_description,
        e.description,
        e.mission,
        e.thumbnail,
        e.location,
        e.start_datetime,
        e.end_datetime,
        e.year,
        e.organizer,
        e.max_participants,
        e.current_participants,
        e.status,
        e.created_at,
        e.updated_at,

        (
          SELECT COUNT(*)
          FROM networking_event_participants p
          WHERE p.event_id = e.id
        ) AS total_participants

      FROM networking_events e

      WHERE e.id = ?

      LIMIT 1
      `,
      [id],
    );

    if (!rows.length) {
      return null;
    }

    const item = rows[0];

    return {
      ...item,

      id: Number(item.id) || null,

      year: item.year !== null ? Number(item.year) : null,

      max_participants: Number(item.max_participants) || 0,

      current_participants: Number(item.current_participants) || 0,

      total_participants: Number(item.total_participants) || 0,
    };
  }

  // =========================================================
  // TÌM THEO MÃ SỰ KIỆN
  // =========================================================
  static async findByEventCode(eventCode, excludeId = null) {
    if (!eventCode) {
      return null;
    }

    let sql = `
      SELECT
        id,
        event_name,
        event_code

      FROM networking_events

      WHERE event_code = ?
    `;

    const params = [eventCode];

    if (excludeId) {
      sql += ` AND id <> ?`;

      params.push(excludeId);
    }

    sql += ` LIMIT 1`;

    const [rows] = await db.query(sql, params);

    return rows[0] || null;
  }

  // =========================================================
  // TẠO SỰ KIỆN
  // =========================================================
  static async create(data) {
    const [result] = await db.query(
      `
      INSERT INTO networking_events
      (
        event_name,
        event_code,
        short_description,
        description,
        mission,
        thumbnail,
        location,
        start_datetime,
        end_datetime,
        year,
        organizer,
        max_participants,
        current_participants,
        status
      )

      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
      `,
      [
        data.event_name,

        data.event_code || null,

        data.short_description || null,

        data.description || null,
        data.mission || null,

        data.thumbnail || null,

        data.location || null,

        data.start_datetime || null,

        data.end_datetime || null,

        data.year || null,

        data.organizer || null,

        Number(data.max_participants) || 0,

        0,

        data.status || "OPEN",
      ],
    );

    return result.insertId;
  }

  // =========================================================
  // CẬP NHẬT
  // =========================================================
  static async update(id, data) {
    const [result] = await db.query(
      `
      UPDATE networking_events

      SET
        event_name = ?,
        event_code = ?,
        short_description = ?,
        description = ?,
        mission = ?,
        thumbnail = ?,
        location = ?,
        start_datetime = ?,
        end_datetime = ?,
        year = ?,
        organizer = ?,
        max_participants = ?,
        status = ?

      WHERE id = ?
      `,
      [
        data.event_name,

        data.event_code || null,

        data.short_description || null,

        data.description || null,
        data.mission || null,
        data.thumbnail || null,

        data.location || null,

        data.start_datetime || null,

        data.end_datetime || null,

        data.year || null,

        data.organizer || null,

        Number(data.max_participants) || 0,

        data.status || "OPEN",

        id,
      ],
    );

    return result.affectedRows;
  }

  // =========================================================
  // ĐẾM NGƯỜI THAM DỰ
  // =========================================================
  static async countParticipants(eventId) {
    const [rows] = await db.query(
      `
      SELECT
        COUNT(*) AS total

      FROM networking_event_participants

      WHERE event_id = ?
      `,
      [eventId],
    );

    return Number(rows[0]?.total) || 0;
  }

  // =========================================================
  // DANH SÁCH NGƯỜI THAM DỰ
  // =========================================================
  static async getParticipants(eventId) {
    const [rows] = await db.query(
      `
      SELECT
        p.id,
        p.event_id,
        p.user_id,

        p.participant_role,
        p.organization,
        p.position,
p.has_project,
p.project_field,
p.startup_stage,
p.program_selection_status,
p.support_needs,
p.organizer_question,
        p.note,

        p.checked_in,
        p.checked_in_at,

        p.registration_status,

        p.created_at,
        p.updated_at,

        u.fullname,
        u.email,
        u.phone,

        u.gender,
        u.age_group,

        u.company,
        u.position AS user_position,
        u.user_type

      FROM networking_event_participants p

      INNER JOIN users u
        ON u.id = p.user_id

      WHERE p.event_id = ?

      ORDER BY p.id DESC
      `,
      [eventId],
    );

    return rows.map((item) => ({
      ...item,

      id: Number(item.id) || null,

      event_id: Number(item.event_id) || null,

      user_id: Number(item.user_id) || null,

      checked_in: Number(item.checked_in) || 0,
    }));
  }

  // =========================================================
  // KIỂM TRA USER ĐÃ THAM DỰ CHƯA
  // =========================================================
  static async findParticipant(eventId, userId) {
    const [rows] = await db.query(
      `
      SELECT
        id,
        event_id,
        user_id

      FROM networking_event_participants

      WHERE event_id = ?
        AND user_id = ?

      LIMIT 1
      `,
      [eventId, userId],
    );

    return rows[0] || null;
  }

  // =========================================================
  // THÊM NGƯỜI THAM DỰ
  // =========================================================
  static async addParticipant(eventId, data) {
    const [result] = await db.query(
      `
     INSERT INTO networking_event_participants
(
  event_id,
  user_id,

  participant_role,
  organization,
  position,

  has_project,
  project_field,
  startup_stage,
  program_selection_status,
  support_needs,
  organizer_question,

  note,

  checked_in,
  checked_in_at,

  registration_status
)

VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        eventId,

        data.user_id,

        data.participant_role || null,
        data.organization || null,
        data.position || null,

        data.has_project ? 1 : 0,

        data.has_project ? data.project_field || null : null,

        data.has_project ? data.startup_stage || null : null,

        data.program_selection_status || null,
        data.support_needs || null,
        data.organizer_question || null,

        data.note || null,

        data.checked_in ? 1 : 0,
        data.checked_in_at || null,

        data.registration_status || "CONFIRMED",
      ],
    );

    await this.refreshCurrentParticipants(eventId);

    return result.insertId;
  }

  // =========================================================
  // XÓA NGƯỜI THAM DỰ
  // =========================================================
  static async removeParticipant(eventId, participantId) {
    const [result] = await db.query(
      `
      DELETE FROM networking_event_participants

      WHERE id = ?
        AND event_id = ?
      `,
      [participantId, eventId],
    );

    if (result.affectedRows > 0) {
      await this.refreshCurrentParticipants(eventId);
    }

    return result.affectedRows;
  }

  // =========================================================
  // ĐỒNG BỘ current_participants
  // =========================================================
  static async refreshCurrentParticipants(eventId) {
    await db.query(
      `
      UPDATE networking_events e

      SET e.current_participants = (
        SELECT COUNT(*)

        FROM networking_event_participants p

        WHERE p.event_id = e.id
      )

      WHERE e.id = ?
      `,
      [eventId],
    );
  }

  // =========================================================
  // XÓA SỰ KIỆN
  //
  // Nếu đã có người tham dự
  // => KHÔNG XÓA.
  // =========================================================
  static async remove(id) {
    const participants = await this.countParticipants(id);

    if (participants > 0) {
      return {
        deleted: false,

        reason: "HAS_PARTICIPANTS",

        total_participants: participants,
      };
    }

    const [result] = await db.query(
      `
      DELETE FROM networking_events
      WHERE id = ?
      `,
      [id],
    );

    return {
      deleted: result.affectedRows > 0,

      reason: null,
    };
  }
  // =========================================================
  // DỮ LIỆU XUẤT EXCEL
  // =========================================================
  static async getExportData(query = {}) {
    // Dùng chung chính xác logic filter của danh sách.
    const events = await this.getAll(query);

    if (!events.length) {
      return {
        events: [],
        participants: [],
      };
    }

    const eventIds = events.map((item) => Number(item.id));

    const placeholders = eventIds.map(() => "?").join(",");

    const [participants] = await db.query(
      `
    SELECT
      p.id,
      p.event_id,
      p.user_id,

      e.event_name,
      e.event_code,

      u.fullname,
      u.email,
      u.phone,
      u.gender,
      u.age_group,
      u.user_type,

      p.organization,
      p.position,
      p.participant_role,
      p.has_project,
p.project_field,
p.startup_stage,
p.program_selection_status,
p.support_needs,
p.organizer_question,
      p.registration_status,
      p.checked_in,
      p.checked_in_at,
      p.note,
      p.created_at

    FROM networking_event_participants p

    INNER JOIN networking_events e
      ON e.id = p.event_id

    INNER JOIN users u
      ON u.id = p.user_id

    WHERE p.event_id IN (${placeholders})

    ORDER BY
      e.start_datetime DESC,
      e.id DESC,
      p.id DESC
    `,
      eventIds,
    );

    return {
      events,

      participants,
    };
  }
  // =========================================================
  // THỐNG KÊ SỰ KIỆN KẾT NỐI
  // =========================================================
  static async statistics(query = {}) {
    const events = await this.getAll(query);

    const eventIds = events
      .map((item) => Number(item.id))
      .filter((id) => Number.isInteger(id) && id > 0);

    const summary = {
      total_events: events.length,

      open: events.filter((item) => item.status === "OPEN").length,

      closed: events.filter((item) => item.status === "CLOSED").length,

      finished: events.filter((item) => item.status === "FINISHED").length,

      draft: events.filter((item) => item.status === "DRAFT").length,

      total_participants: events.reduce(
        (sum, item) => sum + Number(item.total_participants || 0),
        0,
      ),
    };

    if (eventIds.length === 0) {
      return {
        type: "NETWORKING",

        summary,

        charts: {
          events: [],
          statuses: [],
          timeline: [],

          genders: [],
          age_groups: [],
          user_types: [],
          project_fields: [],
          startup_stages: [],
          program_selection: [],
          registration_statuses: [],
          checked_in: [],
        },
      };
    }

    const placeholders = eventIds.map(() => "?").join(",");

    const eventChart = events.map((item) => ({
      name: item.event_name || `#${item.id}`,

      value: Number(item.total_participants) || 0,
    }));

    const statusMap = {};

    events.forEach((item) => {
      const key = item.status || "UNKNOWN";

      statusMap[key] = Number(statusMap[key] || 0) + 1;
    });

    const statuses = Object.entries(statusMap).map(([name, value]) => ({
      name,
      value,
    }));

    const [participants] = await db.query(
      `
      SELECT
        p.id,
        p.event_id,
        p.user_id,

        p.has_project,
        p.project_field,
        p.startup_stage,
        p.program_selection_status,

        p.registration_status,
        p.checked_in,
        p.created_at,

        u.gender,
        u.age_group,
        u.user_type

      FROM networking_event_participants p

      INNER JOIN users u
        ON u.id = p.user_id

      WHERE p.event_id IN (${placeholders})
    `,
      eventIds,
    );

    const groupCount = (items, getter) => {
      const map = {};

      items.forEach((item) => {
        const raw = getter(item);

        const key =
          raw === null || raw === undefined || raw === ""
            ? "UNKNOWN"
            : String(raw);

        map[key] = Number(map[key] || 0) + 1;
      });

      return Object.entries(map).map(([name, value]) => ({
        name,
        value,
      }));
    };

    const timelineMap = {};

    participants.forEach((item) => {
      if (!item.created_at) return;

      const date = new Date(item.created_at);

      if (Number.isNaN(date.getTime())) {
        return;
      }

      const key = date.toISOString().slice(0, 10);

      timelineMap[key] = Number(timelineMap[key] || 0) + 1;
    });

    const timeline = Object.entries(timelineMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, value]) => ({
        name,
        value,
      }));

    return {
      type: "NETWORKING",

      summary,

      charts: {
        events: eventChart,

        statuses,

        timeline,

        genders: groupCount(participants, (item) => item.gender),

        age_groups: groupCount(participants, (item) => item.age_group),

        user_types: groupCount(participants, (item) => item.user_type),

        project_fields: groupCount(participants, (item) => item.project_field),

        startup_stages: groupCount(participants, (item) => item.startup_stage),

        program_selection: groupCount(
          participants,
          (item) => item.program_selection_status,
        ),

        registration_statuses: groupCount(
          participants,
          (item) => item.registration_status,
        ),

        checked_in: [
          {
            name: "Đã check-in",
            value: participants.filter((item) => Number(item.checked_in) === 1)
              .length,
          },

          {
            name: "Chưa check-in",
            value: participants.filter((item) => Number(item.checked_in) !== 1)
              .length,
          },
        ],
      },
    };
  }
  // =========================================================
  // FILTER OPTIONS
  // =========================================================
  static async getFilterOptions() {
    const [rows] = await db.query(
      `
      SELECT
        year,
        start_datetime,
        end_datetime

      FROM networking_events
      `,
    );

    const years = new Set();

    for (const item of rows) {
      if (item.year) {
        years.add(Number(item.year));
      }

      if (item.start_datetime) {
        const start = new Date(item.start_datetime);

        if (!Number.isNaN(start.getTime())) {
          years.add(start.getFullYear());
        }
      }

      if (item.end_datetime) {
        const end = new Date(item.end_datetime);

        if (!Number.isNaN(end.getTime())) {
          years.add(end.getFullYear());
        }
      }
    }

    return {
      years: [...years].sort((a, b) => b - a),
    };
  }
}

module.exports = NetworkingEventModel;
