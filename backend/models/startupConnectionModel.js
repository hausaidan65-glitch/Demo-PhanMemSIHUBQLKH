const db = require("../config/db");

class StartupConnectionModel {
  // =========================================================
  // DANH SÁCH SỰ KIỆN STARTUP CONNECTION DAY
  //
  // event_type:
  // - SEMINAR    = Hội thảo
  // - EXHIBITION = Triển lãm
  // =========================================================
  static async getAll(query = {}) {
    const conditions = [];
    const params = [];

    // =====================================================
    // LỌC THEO LOẠI
    // =====================================================
    if (query.type) {
      const type = String(query.type).toUpperCase();

      if (["SEMINAR", "EXHIBITION"].includes(type)) {
        conditions.push("e.event_type = ?");
        params.push(type);
      }
    }

    // =====================================================
    // LỌC THEO TRẠNG THÁI
    // =====================================================
    if (query.status) {
      const status = String(query.status).toUpperCase();

      if (["DRAFT", "OPEN", "CLOSED", "FINISHED"].includes(status)) {
        conditions.push("e.status = ?");
        params.push(status);
      }
    }
    // =====================================================
    // LỌC THEO THÁNG
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
    // =====================================================
    // LỌC THEO NĂM
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
    // LỌC THEO TRIỂN LÃM CHA
    //
    // Dùng cho hội thảo nằm trong triển lãm.
    // =====================================================
    if (query.parent_event_id) {
      const parentEventId = Number(query.parent_event_id);

      if (Number.isInteger(parentEventId) && parentEventId > 0) {
        conditions.push("e.parent_event_id = ?");
        params.push(parentEventId);
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
          OR e.description LIKE ?
          OR e.mission LIKE ?
        )
      `);

      params.push(keyword, keyword, keyword, keyword, keyword, keyword);
    }

    const whereSql =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
      SELECT
        e.id,
        e.event_name,
        e.event_type,
        e.parent_event_id,
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

        parent.event_name AS parent_event_name,

        (
          SELECT COUNT(*)
          FROM startup_connection_participants p
          WHERE p.event_id = e.id
        ) AS total_participants

      FROM startup_connection_events e

      LEFT JOIN startup_connection_events parent
        ON parent.id = e.parent_event_id

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

      parent_event_id:
        item.parent_event_id !== null ? Number(item.parent_event_id) : null,

      year: Number(item.year) || null,

      max_participants: Number(item.max_participants) || 0,

      current_participants: Number(item.current_participants) || 0,

      total_participants: Number(item.total_participants) || 0,
    }));
  }
  // =========================================================
  // XUẤT DỮ LIỆU THEO BỘ LỌC
  //
  // Dùng CHUNG getAll(query)
  // để đảm bảo danh sách trên màn hình
  // và file Excel không bị lệch dữ liệu.
  // =========================================================
  static async exportData(query = {}) {
    return this.getAll(query);
  }
  // =========================================================
  // CHI TIẾT 1 SỰ KIỆN
  // =========================================================
  static async findById(id) {
    const [rows] = await db.query(
      `
      SELECT
        e.id,
        e.event_name,
        e.event_type,
        e.parent_event_id,
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

        parent.event_name AS parent_event_name,

        (
          SELECT COUNT(*)
          FROM startup_connection_participants p
          WHERE p.event_id = e.id
        ) AS total_participants

      FROM startup_connection_events e

      LEFT JOIN startup_connection_events parent
        ON parent.id = e.parent_event_id

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

      parent_event_id:
        item.parent_event_id !== null ? Number(item.parent_event_id) : null,

      year: Number(item.year) || null,

      max_participants: Number(item.max_participants) || 0,

      current_participants: Number(item.current_participants) || 0,

      total_participants: Number(item.total_participants) || 0,
    };
  }

  // =========================================================
  // KIỂM TRA EVENT CODE TRÙNG
  // =========================================================
  static async findByEventCode(eventCode, excludeId = null) {
    if (!eventCode) {
      return null;
    }

    let sql = `
      SELECT id
      FROM startup_connection_events
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
  // KIỂM TRA TRIỂN LÃM CHA
  //
  // parent_event_id chỉ nên trỏ tới EXHIBITION
  // =========================================================
  static async findExhibitionById(id) {
    const [rows] = await db.query(
      `
      SELECT
        id,
        event_name,
        event_type

      FROM startup_connection_events

      WHERE id = ?
        AND event_type = 'EXHIBITION'

      LIMIT 1
      `,
      [id],
    );

    return rows[0] || null;
  }

  // =========================================================
  // TẠO SỰ KIỆN
  // =========================================================
  static async create(data) {
    const [result] = await db.query(
      `
      INSERT INTO startup_connection_events
      (
        event_name,
        event_type,
        parent_event_id,
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

      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
      `,
      [
        data.event_name,

        data.event_type,

        data.parent_event_id || null,

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
  // CẬP NHẬT SỰ KIỆN
  // =========================================================
  static async update(id, data) {
    const [result] = await db.query(
      `
      UPDATE startup_connection_events

      SET
        event_name = ?,
        event_type = ?,
        parent_event_id = ?,
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

        data.event_type,

        data.parent_event_id || null,

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
      SELECT COUNT(*) AS total

      FROM startup_connection_participants

      WHERE event_id = ?
      `,
      [eventId],
    );

    return Number(rows[0]?.total) || 0;
  }

  // =========================================================
  // LẤY DANH SÁCH NGƯỜI THAM DỰ
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
        u.user_type

      FROM startup_connection_participants p

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
  // KIỂM TRA USER ĐÃ THAM DỰ EVENT CHƯA
  // =========================================================
  static async findParticipant(eventId, userId) {
    const [rows] = await db.query(
      `
      SELECT id

      FROM startup_connection_participants

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
    INSERT INTO startup_connection_participants
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
      DELETE FROM startup_connection_participants

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
  // CẬP NHẬT current_participants
  // =========================================================
  static async refreshCurrentParticipants(eventId) {
    await db.query(
      `
      UPDATE startup_connection_events e

      SET e.current_participants = (
        SELECT COUNT(*)
        FROM startup_connection_participants p
        WHERE p.event_id = e.id
      )

      WHERE e.id = ?
      `,
      [eventId],
    );
  }

  // =========================================================
  // ĐẾM HỘI THẢO CON
  // =========================================================
  static async countChildEvents(eventId) {
    const [rows] = await db.query(
      `
      SELECT COUNT(*) AS total

      FROM startup_connection_events

      WHERE parent_event_id = ?
      `,
      [eventId],
    );

    return Number(rows[0]?.total) || 0;
  }

  // =========================================================
  // XÓA SỰ KIỆN
  //
  // Quy tắc:
  // - Nếu có người tham dự -> không xóa
  // - Nếu triển lãm có hội thảo con -> không xóa
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

    const children = await this.countChildEvents(id);

    if (children > 0) {
      return {
        deleted: false,
        reason: "HAS_CHILD_EVENTS",
        total_child_events: children,
      };
    }

    const [result] = await db.query(
      `
      DELETE FROM startup_connection_events
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
  // CHUYỂN NETWORKING EVENT -> HỘI THẢO STARTUP CONNECTION DAY
  // =========================================================
  static async migrateFromNetworkingEvent(networkingEventId, options = {}) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const parentEventId = options.parent_event_id
        ? Number(options.parent_event_id)
        : null;

      const copyParticipants = options.copy_participants !== false;

      // =====================================================
      // 1. LẤY NETWORKING EVENT GỐC
      // =====================================================
      const [eventRows] = await connection.query(
        `
      SELECT
        id,
        event_name,
        event_code,
        short_description,
        description,
        thumbnail,
        location,
        start_datetime,
        end_datetime,
        year,
        organizer,
        max_participants,
        status

      FROM networking_events

      WHERE id = ?

      LIMIT 1
      `,
        [networkingEventId],
      );

      if (!eventRows.length) {
        const error = new Error("Không tìm thấy Networking Event.");
        error.code = "NETWORKING_EVENT_NOT_FOUND";
        throw error;
      }

      const sourceEvent = eventRows[0];

      // =====================================================
      // 2. KIỂM TRA TRIỂN LÃM CHA
      // =====================================================
      if (parentEventId) {
        const [parentRows] = await connection.query(
          `
        SELECT
          id,
          event_name,
          event_type

        FROM startup_connection_events

        WHERE id = ?
          AND event_type = 'EXHIBITION'

        LIMIT 1
        `,
          [parentEventId],
        );

        if (!parentRows.length) {
          const error = new Error(
            "Triển lãm cha không tồn tại hoặc không phải EXHIBITION.",
          );

          error.code = "INVALID_PARENT_EXHIBITION";

          throw error;
        }
      }

      // =====================================================
      // 3. XỬ LÝ EVENT CODE
      //
      // Nếu code đã tồn tại bên Startup Connection
      // thì thêm hậu tố -SCD để tránh duplicate.
      // =====================================================
      let targetEventCode = sourceEvent.event_code || null;

      if (targetEventCode) {
        const [duplicatedRows] = await connection.query(
          `
        SELECT id
        FROM startup_connection_events
        WHERE event_code = ?
        LIMIT 1
        `,
          [targetEventCode],
        );

        if (duplicatedRows.length) {
          targetEventCode = `${targetEventCode}-SCD`;

          const [secondDuplicate] = await connection.query(
            `
          SELECT id
          FROM startup_connection_events
          WHERE event_code = ?
          LIMIT 1
          `,
            [targetEventCode],
          );

          if (secondDuplicate.length) {
            targetEventCode = `${sourceEvent.event_code}-SCD-${Date.now()}`;
          }
        }
      }

      // =====================================================
      // 4. TẠO HỘI THẢO MỚI
      // =====================================================
      const [insertEventResult] = await connection.query(
        `
      INSERT INTO startup_connection_events
      (
        event_name,
        event_type,
        parent_event_id,
        event_code,
        short_description,
        description,
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

      VALUES (?, 'SEMINAR', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
      `,
        [
          sourceEvent.event_name,

          parentEventId,

          targetEventCode,

          sourceEvent.short_description || null,

          sourceEvent.description || null,

          sourceEvent.thumbnail || null,

          sourceEvent.location || null,

          sourceEvent.start_datetime || null,

          sourceEvent.end_datetime || null,

          sourceEvent.year || null,

          sourceEvent.organizer || null,

          Number(sourceEvent.max_participants) || 0,

          sourceEvent.status || "OPEN",
        ],
      );

      const newEventId = Number(insertEventResult.insertId);

      // =====================================================
      // 5. COPY NGƯỜI THAM DỰ
      // =====================================================
      let copiedParticipants = 0;

      if (copyParticipants) {
        const [participantResult] = await connection.query(
          `
        INSERT INTO startup_connection_participants
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

        SELECT
          ?,
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

          p.registration_status

        FROM networking_event_participants p

        WHERE p.event_id = ?
        `,
          [newEventId, networkingEventId],
        );

        copiedParticipants = Number(participantResult.affectedRows) || 0;
      }

      // =====================================================
      // 6. ĐỒNG BỘ current_participants
      // =====================================================
      await connection.query(
        `
      UPDATE startup_connection_events

      SET current_participants = (
        SELECT COUNT(*)

        FROM startup_connection_participants

        WHERE event_id = ?
      )

      WHERE id = ?
      `,
        [newEventId, newEventId],
      );

      await connection.commit();

      return {
        source_event_id: Number(networkingEventId),

        new_event_id: newEventId,

        parent_event_id: parentEventId,

        copied_participants: copiedParticipants,
      };
    } catch (error) {
      await connection.rollback();

      throw error;
    } finally {
      connection.release();
    }
  }
  // =========================================================
  // THỐNG KÊ STARTUP CONNECTION DAY
  //
  // type:
  // - EXHIBITION
  // - SEMINAR
  //
  // Giữ cùng logic filter với getAll()
  // =========================================================
  static async statistics(query = {}) {
    const events = await this.getAll(query);

    const eventIds = events
      .map((item) => Number(item.id))
      .filter((id) => Number.isInteger(id) && id > 0);

    const eventType = String(query.type || "").toUpperCase();

    // =====================================================
    // SUMMARY CƠ BẢN
    // =====================================================

    const summary = {
      total_events: events.length,

      open: events.filter(
        (item) => String(item.status).toUpperCase() === "OPEN",
      ).length,

      closed: events.filter(
        (item) => String(item.status).toUpperCase() === "CLOSED",
      ).length,

      finished: events.filter(
        (item) => String(item.status).toUpperCase() === "FINISHED",
      ).length,

      draft: events.filter(
        (item) => String(item.status).toUpperCase() === "DRAFT",
      ).length,

      total_participants: events.reduce(
        (sum, item) => sum + Number(item.total_participants || 0),
        0,
      ),
    };

    // Không có event phù hợp
    if (eventIds.length === 0) {
      return {
        type: eventType,

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

          surveys_by_event: [],
          visitors_by_event: [],
          b2b_by_event: [],
        },
      };
    }

    // =====================================================
    // BIỂU ĐỒ THEO EVENT
    // =====================================================

    const eventChart = events.map((item) => ({
      name: item.event_name || `#${item.id}`,
      value: Number(item.total_participants || 0),
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

    // =====================================================
    // TIMELINE EVENT
    // =====================================================

    const timelineMap = {};

    events.forEach((item) => {
      const rawDate = item.start_datetime || item.created_at;

      if (!rawDate) {
        return;
      }

      const date = new Date(rawDate);

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

    // =====================================================
    // PARTICIPANTS
    // Chỉ thực sự cần cho SEMINAR.
    // Nhưng query này an toàn nếu event không có participant.
    // =====================================================

    const placeholders = eventIds.map(() => "?").join(",");

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

      FROM startup_connection_participants p

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

    const genders = groupCount(participants, (item) => item.gender);

    const ageGroups = groupCount(participants, (item) => item.age_group);

    const userTypes = groupCount(participants, (item) => item.user_type);

    const projectFields = groupCount(
      participants,
      (item) => item.project_field,
    );

    const startupStages = groupCount(
      participants,
      (item) => item.startup_stage,
    );

    const programSelection = groupCount(
      participants,
      (item) => item.program_selection_status,
    );

    const registrationStatuses = groupCount(
      participants,
      (item) => item.registration_status,
    );

    const checkedIn = [
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
    ];

    // =====================================================
    // TRIỂN LÃM - SURVEY
    // =====================================================

    let surveysByEvent = [];
    let visitorsByEvent = [];
    let b2bByEvent = [];

    if (eventType === "EXHIBITION") {
      const [surveyRows] = await db.query(
        `
        SELECT
          s.event_id,

          COUNT(*) AS total_surveys,

          COALESCE(
            SUM(s.visitor_count),
            0
          ) AS total_visitors,

          COALESCE(
            SUM(s.b2b_matching_count),
            0
          ) AS total_b2b

        FROM exhibition_surveys s

        WHERE s.event_id IN (${placeholders})

        GROUP BY s.event_id
      `,
        eventIds,
      );

      const surveyMap = new Map(
        surveyRows.map((row) => [Number(row.event_id), row]),
      );

      surveysByEvent = events.map((event) => ({
        name: event.event_name,
        value: Number(surveyMap.get(Number(event.id))?.total_surveys || 0),
      }));

      visitorsByEvent = events.map((event) => ({
        name: event.event_name,
        value: Number(surveyMap.get(Number(event.id))?.total_visitors || 0),
      }));

      b2bByEvent = events.map((event) => ({
        name: event.event_name,
        value: Number(surveyMap.get(Number(event.id))?.total_b2b || 0),
      }));

      summary.total_surveys = surveysByEvent.reduce(
        (sum, item) => sum + item.value,
        0,
      );

      summary.total_visitors = visitorsByEvent.reduce(
        (sum, item) => sum + item.value,
        0,
      );

      summary.total_b2b = b2bByEvent.reduce((sum, item) => sum + item.value, 0);
    }

    return {
      type: eventType,

      summary,

      charts: {
        events: eventChart,

        statuses,

        timeline,

        genders,

        age_groups: ageGroups,

        user_types: userTypes,

        project_fields: projectFields,

        startup_stages: startupStages,

        program_selection: programSelection,

        registration_statuses: registrationStatuses,

        checked_in: checkedIn,

        surveys_by_event: surveysByEvent,

        visitors_by_event: visitorsByEvent,

        b2b_by_event: b2bByEvent,
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

      FROM startup_connection_events
      `,
    );

    const years = new Set();

    for (const item of rows) {
      if (item.year) {
        years.add(Number(item.year));
      }

      if (item.start_datetime) {
        years.add(new Date(item.start_datetime).getFullYear());
      }

      if (item.end_datetime) {
        years.add(new Date(item.end_datetime).getFullYear());
      }
    }

    return {
      years: [...years].sort((a, b) => b - a),
    };
  }
}

module.exports = StartupConnectionModel;
