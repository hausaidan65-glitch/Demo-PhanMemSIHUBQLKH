const db = require("../config/db");

class IncubationProfileModel {
  // =========================================================
  // DANH SÁCH HỒ SƠ ƯƠM TẠO
  // =========================================================
  static async getAll(query = {}) {
    const conditions = [];
    const params = [];

    // =====================================================
    // TÌM KIẾM
    // =====================================================
    if (query.keyword) {
      const keyword = `%${String(query.keyword).trim()}%`;

      conditions.push(`
        (
          p.project_name LIKE ?
          OR p.company_name LIKE ?
          OR p.contact_fullname LIKE ?
          OR p.contact_email LIKE ?
          OR p.contact_phone LIKE ?
          OR p.tax_code LIKE ?
        )
      `);

      params.push(keyword, keyword, keyword, keyword, keyword, keyword);
    }

    // =====================================================
    // TRẠNG THÁI HỒ SƠ
    // =====================================================
    if (query.status) {
      const status = String(query.status).trim().toUpperCase();

      const allowedStatuses = [
        "DRAFT",
        "SUBMITTED",
        "REVIEWING",
        "APPROVED",
        "REJECTED",
      ];

      if (allowedStatuses.includes(status)) {
        conditions.push(`p.status = ?`);
        params.push(status);
      }
    }

    // =====================================================
    // CHƯƠNG TRÌNH TUYỂN CHỌN
    // =====================================================
    if (query.selection_program) {
      conditions.push(`p.selection_program = ?`);

      params.push(String(query.selection_program).trim());
    }

    // =====================================================
    // GIAI ĐOẠN PHÁT TRIỂN
    // =====================================================
    if (query.development_stage) {
      conditions.push(`p.development_stage = ?`);

      params.push(String(query.development_stage).trim());
    }

    // =====================================================
    // TỈNH / THÀNH
    // =====================================================
    if (query.province_city) {
      conditions.push(`p.province_city = ?`);

      params.push(String(query.province_city).trim());
    }

    // =====================================================
    // LĨNH VỰC
    // =====================================================
    if (query.field_code) {
      conditions.push(`
        EXISTS (
          SELECT 1
          FROM incubation_profile_fields f
          WHERE f.profile_id = p.id
            AND f.field_code = ?
        )
      `);

      params.push(String(query.field_code).trim());
    }

    // =====================================================
    // THỊ TRƯỜNG
    // =====================================================
    if (query.market_code) {
      conditions.push(`
        EXISTS (
          SELECT 1
          FROM incubation_profile_markets m
          WHERE m.profile_id = p.id
            AND m.market_code = ?
        )
      `);

      params.push(String(query.market_code).trim());
    }

    // =====================================================
    // NGUỒN DỮ LIỆU
    // =====================================================
    if (query.source_type) {
      const sourceType = String(query.source_type).trim().toUpperCase();

      if (["ADMIN", "PUBLIC_FORM", "IMPORT"].includes(sourceType)) {
        conditions.push(`p.source_type = ?`);
        params.push(sourceType);
      }
    }

    const whereSql =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
      SELECT
        p.*,

        (
          SELECT COUNT(*)
          FROM incubation_profile_fields f
          WHERE f.profile_id = p.id
        ) AS total_fields,

        (
          SELECT COUNT(*)
          FROM incubation_profile_markets m
          WHERE m.profile_id = p.id
        ) AS total_markets,

        (
          SELECT COUNT(*)
          FROM incubation_received_supports rs
          WHERE rs.profile_id = p.id
        ) AS total_received_supports

      FROM incubation_profiles p

      ${whereSql}

      ORDER BY
        p.created_at DESC,
        p.id DESC
      `,
      params,
    );

    return rows.map((item) => ({
      ...item,

      id: Number(item.id),

      team_size: item.team_size !== null ? Number(item.team_size) : null,

      part_time_jobs:
        item.part_time_jobs !== null ? Number(item.part_time_jobs) : null,

      project_start_year:
        item.project_start_year !== null
          ? Number(item.project_start_year)
          : null,

      total_fields: Number(item.total_fields) || 0,

      total_markets: Number(item.total_markets) || 0,

      total_received_supports: Number(item.total_received_supports) || 0,
    }));
  }

  // =========================================================
  // CHI TIẾT HỒ SƠ
  // =========================================================
  static async findById(id) {
    const [rows] = await db.query(
      `
      SELECT *
      FROM incubation_profiles
      WHERE id = ?
      LIMIT 1
      `,
      [id],
    );

    if (!rows.length) {
      return null;
    }

    const profile = rows[0];

    const [fields] = await db.query(
      `
      SELECT
        id,
        field_code,
        field_name,
        other_detail
      FROM incubation_profile_fields
      WHERE profile_id = ?
      ORDER BY id ASC
      `,
      [id],
    );

    const [markets] = await db.query(
      `
      SELECT
        id,
        market_code,
        market_name,
        other_detail
      FROM incubation_profile_markets
      WHERE profile_id = ?
      ORDER BY id ASC
      `,
      [id],
    );

    const [receivedSupports] = await db.query(
      `
      SELECT
        id,
        provider_code,
        provider_name,
        provider_other,
        support_code,
        support_name,
        support_detail,
        support_year
      FROM incubation_received_supports
      WHERE profile_id = ?
      ORDER BY id ASC
      `,
      [id],
    );
    const [supportNeeds] = await db.query(
      `
  SELECT
    id,
    need_code,
    need_name,
    other_detail

  FROM incubation_support_needs

  WHERE profile_id = ?

  ORDER BY id ASC
  `,
      [id],
    );

    return {
      ...profile,

      id: Number(profile.id),

      fields,

      markets,

      received_supports: receivedSupports,

      support_needs: supportNeeds,
    };
  }
  static async getStatistics() {
    const [rows] = await db.query(`
    SELECT
      COUNT(*) AS total_profiles,

      SUM(
        CASE
          WHEN status = 'DRAFT' THEN 1
          ELSE 0
        END
      ) AS draft_profiles,

      SUM(
        CASE
          WHEN status = 'SUBMITTED' THEN 1
          ELSE 0
        END
      ) AS submitted_profiles,

      SUM(
        CASE
          WHEN status = 'REVIEWING' THEN 1
          ELSE 0
        END
      ) AS reviewing_profiles,

      SUM(
        CASE
          WHEN status = 'APPROVED' THEN 1
          ELSE 0
        END
      ) AS approved_profiles,

      SUM(
        CASE
          WHEN status = 'REJECTED' THEN 1
          ELSE 0
        END
      ) AS rejected_profiles

    FROM incubation_profiles
  `);

    const data = rows[0] || {};

    return {
      total_profiles: Number(data.total_profiles) || 0,
      draft_profiles: Number(data.draft_profiles) || 0,
      submitted_profiles: Number(data.submitted_profiles) || 0,
      reviewing_profiles: Number(data.reviewing_profiles) || 0,
      approved_profiles: Number(data.approved_profiles) || 0,
      rejected_profiles: Number(data.rejected_profiles) || 0,
    };
  }
  static async getExportData(query = {}) {
    return this.getAll(query);
  }
  static async getExportDetails(profileIds = []) {
    if (!profileIds.length) {
      return {
        fields: [],
        markets: [],
        supports: [],
        support_needs: [],
      };
    }

    const placeholders = profileIds.map(() => "?").join(",");

    const [fields] = await db.query(
      `
    SELECT
      profile_id,
      field_code,
      field_name,
      other_detail
    FROM incubation_profile_fields
    WHERE profile_id IN (${placeholders})
    ORDER BY profile_id, id
    `,
      profileIds,
    );

    const [markets] = await db.query(
      `
    SELECT
      profile_id,
      market_code,
      market_name,
      other_detail
    FROM incubation_profile_markets
    WHERE profile_id IN (${placeholders})
    ORDER BY profile_id, id
    `,
      profileIds,
    );

    const [supports] = await db.query(
      `
    SELECT
      profile_id,
      provider_name,
      provider_other,
      support_name,
      support_detail,
      support_year
    FROM incubation_received_supports
    WHERE profile_id IN (${placeholders})
    ORDER BY profile_id, id
    `,
      profileIds,
    );
    const [supportNeeds] = await db.query(
      `
  SELECT
    profile_id,
    need_code,
    need_name,
    other_detail
  FROM incubation_support_needs
  WHERE profile_id IN (${placeholders})
  ORDER BY profile_id, id
  `,
      profileIds,
    );
    return {
      fields,
      markets,
      supports,
      support_needs: supportNeeds,
    };
  }
  static async createProfile(connection, data) {
    const [result] = await connection.query(
      `
    INSERT INTO incubation_profiles (
  incubation_program_id,

  selection_program,
  selection_program_other,

  project_name,
      company_name,
      address,
      province_city,
      website,
      tax_code,

      contact_fullname,
      contact_phone,
      contact_email,
      contact_position,
      contact_position_other,

      team_size,
      part_time_jobs,
      project_start_year,
      development_stage,
      development_stage_other,

      has_revenue,
      revenue_last_3_years,
      charter_capital,
      annual_revenue,

      has_raised_fund,
      fundraising_stage,
      raised_amount,
      fundraising_need,

      product_service_description,
      product_status,

      has_intellectual_property,
      intellectual_property_detail,

      patent_count,
      utility_solution_count,
      product_count,
      service_count,
      customer_count,

      target_customer,

      has_international_revenue,
      international_revenue,
      international_customer_count,

      status,
      admin_note,
      source_type
    )
    VALUES (
    ?,
      ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?,
      ?, ?,
      ?, ?, ?, ?, ?,
      ?,
      ?, ?, ?,
      ?, ?, ?
    )
    `,
      [
        data.incubation_program_id || null,

        data.selection_program || null,
        data.selection_program_other || null,

        data.project_name,
        data.company_name || null,
        data.address || null,
        data.province_city || null,
        data.website || null,
        data.tax_code || null,

        data.contact_fullname,
        data.contact_phone || null,
        data.contact_email || null,
        data.contact_position || null,
        data.contact_position_other || null,

        data.team_size ?? null,
        data.part_time_jobs ?? null,
        data.project_start_year ?? null,
        data.development_stage || null,
        data.development_stage_other || null,

        data.has_revenue ? 1 : 0,
        data.revenue_last_3_years ?? null,
        data.charter_capital ?? null,
        data.annual_revenue ?? null,

        data.has_raised_fund ? 1 : 0,
        data.fundraising_stage || null,
        data.raised_amount ?? null,
        data.fundraising_need ?? null,

        data.product_service_description || null,
        data.product_status || null,

        data.has_intellectual_property ? 1 : 0,
        data.intellectual_property_detail || null,

        data.patent_count ?? null,
        data.utility_solution_count ?? null,
        data.product_count ?? null,
        data.service_count ?? null,
        data.customer_count ?? null,

        data.target_customer || null,

        data.has_international_revenue ? 1 : 0,
        data.international_revenue ?? null,
        data.international_customer_count ?? null,

        data.status || "SUBMITTED",
        data.admin_note || null,
        data.source_type || "ADMIN",
      ],
    );

    return result.insertId;
  }
  static async updateProfile(connection, profileId, data) {
    const [result] = await connection.query(
      `
    UPDATE incubation_profiles
    SET
      selection_program = ?,
      selection_program_other = ?,

      project_name = ?,
      company_name = ?,
      address = ?,
      province_city = ?,
      website = ?,
      tax_code = ?,

      contact_fullname = ?,
      contact_phone = ?,
      contact_email = ?,
      contact_position = ?,
      contact_position_other = ?,

      team_size = ?,
      part_time_jobs = ?,
      project_start_year = ?,
      development_stage = ?,
      development_stage_other = ?,

      has_revenue = ?,
      revenue_last_3_years = ?,
      charter_capital = ?,
      annual_revenue = ?,

      has_raised_fund = ?,
      fundraising_stage = ?,
      raised_amount = ?,
      fundraising_need = ?,

      product_service_description = ?,
      product_status = ?,

      has_intellectual_property = ?,
      intellectual_property_detail = ?,

      patent_count = ?,
      utility_solution_count = ?,
      product_count = ?,
      service_count = ?,
      customer_count = ?,

      target_customer = ?,

      has_international_revenue = ?,
      international_revenue = ?,
      international_customer_count = ?,

      status = ?,
      admin_note = ?,
      source_type = ?

    WHERE id = ?
    `,
      [
        data.selection_program || null,
        data.selection_program_other || null,

        data.project_name,
        data.company_name || null,
        data.address || null,
        data.province_city || null,
        data.website || null,
        data.tax_code || null,

        data.contact_fullname,
        data.contact_phone || null,
        data.contact_email || null,
        data.contact_position || null,
        data.contact_position_other || null,

        data.team_size ?? null,
        data.part_time_jobs ?? null,
        data.project_start_year ?? null,
        data.development_stage || null,
        data.development_stage_other || null,

        data.has_revenue ? 1 : 0,
        data.revenue_last_3_years ?? null,
        data.charter_capital ?? null,
        data.annual_revenue ?? null,

        data.has_raised_fund ? 1 : 0,
        data.fundraising_stage || null,
        data.raised_amount ?? null,
        data.fundraising_need ?? null,

        data.product_service_description || null,
        data.product_status || null,

        data.has_intellectual_property ? 1 : 0,
        data.intellectual_property_detail || null,

        data.patent_count ?? null,
        data.utility_solution_count ?? null,
        data.product_count ?? null,
        data.service_count ?? null,
        data.customer_count ?? null,

        data.target_customer || null,

        data.has_international_revenue ? 1 : 0,
        data.international_revenue ?? null,
        data.international_customer_count ?? null,

        data.status || "SUBMITTED",
        data.admin_note || null,
        data.source_type || "ADMIN",

        profileId,
      ],
    );

    return result;
  }
  static async deleteChildData(connection, profileId) {
    await connection.query(
      `
    DELETE FROM incubation_profile_fields
    WHERE profile_id = ?
    `,
      [profileId],
    );

    await connection.query(
      `
    DELETE FROM incubation_profile_markets
    WHERE profile_id = ?
    `,
      [profileId],
    );

    await connection.query(
      `
    DELETE FROM incubation_received_supports
    WHERE profile_id = ?
    `,
      [profileId],
    );
    await connection.query(
      `
  DELETE FROM incubation_support_needs
  WHERE profile_id = ?
  `,
      [profileId],
    );
  }

  static async deleteById(connection, profileId) {
    const [result] = await connection.query(
      `
    DELETE FROM incubation_profiles
    WHERE id = ?
    `,
      [profileId],
    );

    return result;
  }
  static async insertFields(connection, profileId, fields = []) {
    for (const item of fields) {
      await connection.query(
        `
      INSERT INTO incubation_profile_fields (
        profile_id,
        field_code,
        field_name,
        other_detail
      )
      VALUES (?, ?, ?, ?)
      `,
        [
          profileId,
          item.field_code,
          item.field_name,
          item.other_detail || null,
        ],
      );
    }
  }
  static async insertMarkets(connection, profileId, markets = []) {
    for (const item of markets) {
      await connection.query(
        `
      INSERT INTO incubation_profile_markets (
        profile_id,
        market_code,
        market_name,
        other_detail
      )
      VALUES (?, ?, ?, ?)
      `,
        [
          profileId,
          item.market_code,
          item.market_name,
          item.other_detail || null,
        ],
      );
    }
  }
  static async insertReceivedSupports(connection, profileId, supports = []) {
    for (const item of supports) {
      await connection.query(
        `
      INSERT INTO incubation_received_supports (
        profile_id,

        provider_code,
        provider_name,
        provider_other,

        support_code,
        support_name,
        support_detail,
        support_year
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          profileId,

          item.provider_code || null,
          item.provider_name || null,
          item.provider_other || null,

          item.support_code,
          item.support_name,
          item.support_detail || null,
          item.support_year ?? null,
        ],
      );
    }
  }
  static async insertSupportNeeds(connection, profileId, supportNeeds = []) {
    for (const item of supportNeeds) {
      await connection.query(
        `
      INSERT INTO incubation_support_needs (
        profile_id,
        need_code,
        need_name,
        other_detail
      )
      VALUES (?, ?, ?, ?)
      `,
        [profileId, item.need_code, item.need_name, item.other_detail || null],
      );
    }
  }
  // =========================================================
  // FILTER OPTIONS
  // =========================================================
  static async getFilterOptions() {
    const [programRows] = await db.query(`
      SELECT DISTINCT selection_program AS value
      FROM incubation_profiles
      WHERE selection_program IS NOT NULL
        AND TRIM(selection_program) <> ''
      ORDER BY selection_program ASC
    `);

    const [stageRows] = await db.query(`
      SELECT DISTINCT development_stage AS value
      FROM incubation_profiles
      WHERE development_stage IS NOT NULL
        AND TRIM(development_stage) <> ''
      ORDER BY development_stage ASC
    `);

    const [provinceRows] = await db.query(`
      SELECT DISTINCT province_city AS value
      FROM incubation_profiles
      WHERE province_city IS NOT NULL
        AND TRIM(province_city) <> ''
      ORDER BY province_city ASC
    `);

    const [fieldRows] = await db.query(`
      SELECT DISTINCT
        field_code,
        field_name
      FROM incubation_profile_fields
      ORDER BY field_name ASC
    `);

    const [marketRows] = await db.query(`
      SELECT DISTINCT
        market_code,
        market_name
      FROM incubation_profile_markets
      ORDER BY market_name ASC
    `);

    return {
      selection_programs: programRows.map((item) => item.value),

      development_stages: stageRows.map((item) => item.value),

      provinces: provinceRows.map((item) => item.value),

      fields: fieldRows,

      markets: marketRows,
    };
  }
}

module.exports = IncubationProfileModel;
