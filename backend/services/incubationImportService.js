const db = require("../config/db");

const IncubationProfileModel = require("../models/incubationProfileModel");

const IncubationProgramModel = require("../models/incubationProgramModel");
function createImportError(message, code, status = 422, details = {}) {
  const error = new Error(message);

  error.code = code;
  error.status = status;
  error.details = details;

  return error;
}
function normalizeProfileData(item, programId) {
  return {
    incubation_program_id: programId,

    // A
    selection_program: item.selection_program || null,

    selection_program_other:
      item.selection_program === "OTHER"
        ? item.selection_program_other || null
        : null,

    project_name: item.project_name || null,

    company_name: item.company_name || null,

    address: item.address || null,

    province_city: item.province_city || null,

    website: item.website || null,

    tax_code: item.tax_code || null,

    // B
    contact_fullname: item.contact_fullname || null,

    contact_phone: item.contact_phone || null,

    contact_email: String(item.contact_email || "")
      .trim()
      .toLowerCase(),

    contact_position: item.contact_position || null,

    contact_position_other:
      item.contact_position === "OTHER"
        ? item.contact_position_other || null
        : null,

    // C
    team_size: item.team_size ?? null,

    part_time_jobs: item.part_time_jobs ?? null,

    project_start_year: item.project_start_year ?? null,

    development_stage: item.development_stage || null,

    development_stage_other:
      item.development_stage === "OTHER"
        ? item.development_stage_other || null
        : null,

    // D
    has_revenue: Boolean(item.has_revenue),

    revenue_last_3_years: item.revenue_last_3_years ?? null,

    charter_capital: item.charter_capital ?? null,

    annual_revenue: item.annual_revenue ?? null,

    has_raised_fund: Boolean(item.has_raised_fund),

    fundraising_stage: item.fundraising_stage || null,

    raised_amount: item.raised_amount ?? null,

    fundraising_need: item.fundraising_need ?? null,

    // E
    product_service_description: item.product_service_description || null,

    product_status: item.product_status || null,

    has_intellectual_property: Boolean(item.has_intellectual_property),

    intellectual_property_detail: item.intellectual_property_detail || null,

    patent_count: item.patent_count ?? null,

    utility_solution_count: item.utility_solution_count ?? null,

    product_count: item.product_count ?? null,

    service_count: item.service_count ?? null,

    customer_count: item.customer_count ?? null,

    target_customer: item.target_customer || null,

    // F
    has_international_revenue: Boolean(item.has_international_revenue),

    international_revenue: item.international_revenue ?? 0,

    international_customer_count: item.international_customer_count ?? 0,

    // SYSTEM
    status: "SUBMITTED",

    admin_note: null,

    source_type: "IMPORT",
  };
}
async function findDuplicateProfile(connection, programId, email) {
  if (!email) {
    return null;
  }

  const [rows] = await connection.query(
    `
      SELECT
        id,
        project_name,
        company_name,
        contact_email

      FROM incubation_profiles

      WHERE incubation_program_id = ?
        AND LOWER(contact_email) =
            LOWER(?)

      LIMIT 1
      `,
    [programId, email],
  );

  return rows[0] || null;
}
async function importOneProfile(connection, programId, item) {
  const profileData = normalizeProfileData(item, programId);

  const duplicate = await findDuplicateProfile(
    connection,
    programId,
    profileData.contact_email,
  );

  if (duplicate) {
    return {
      created: false,
      existed: true,

      profileId: Number(duplicate.id),

      project_name: profileData.project_name,

      company_name: profileData.company_name,

      contact_email: profileData.contact_email,

      reason: "Email đã tồn tại trong chương trình này.",
    };
  }

  const fields = Array.isArray(item.fields) ? item.fields : [];

  const markets = Array.isArray(item.markets) ? item.markets : [];

  const receivedSupports = Array.isArray(item.received_supports)
    ? item.received_supports
    : [];

  const supportNeeds = Array.isArray(item.support_needs)
    ? item.support_needs
    : [];

  // =========================================
  // PROFILE
  // =========================================

  const profileId = await IncubationProfileModel.createProfile(
    connection,
    profileData,
  );

  // =========================================
  // FIELDS
  // =========================================

  await IncubationProfileModel.insertFields(connection, profileId, fields);

  // =========================================
  // MARKETS
  // =========================================

  await IncubationProfileModel.insertMarkets(connection, profileId, markets);

  // =========================================
  // RECEIVED SUPPORTS
  // =========================================

  await IncubationProfileModel.insertReceivedSupports(
    connection,
    profileId,
    receivedSupports,
  );

  // =========================================
  // SUPPORT NEEDS
  // =========================================

  await IncubationProfileModel.insertSupportNeeds(
    connection,
    profileId,
    supportNeeds,
  );

  return {
    created: true,
    existed: false,

    profileId: Number(profileId),

    project_name: profileData.project_name,

    company_name: profileData.company_name,

    contact_email: profileData.contact_email,
  };
}
async function importIncubationProfiles({ programId, profiles }) {
  const numericProgramId = Number(programId);

  // =========================================
  // VALIDATE PROGRAM ID
  // =========================================

  if (!Number.isInteger(numericProgramId) || numericProgramId <= 0) {
    throw createImportError(
      "ID Chương trình ươm tạo không hợp lệ.",
      "INCUBATION_PROGRAM_INVALID",
      400,
    );
  }

  // =========================================
  // PROGRAM
  // =========================================

  const program = await IncubationProgramModel.findById(numericProgramId);

  if (!program) {
    throw createImportError(
      "Không tìm thấy Chương trình ươm tạo.",
      "INCUBATION_PROGRAM_NOT_FOUND",
      404,
    );
  }

  // =========================================
  // PROFILES
  // =========================================

  if (!Array.isArray(profiles) || profiles.length === 0) {
    throw createImportError(
      "Không có hồ sơ hợp lệ để import.",
      "INCUBATION_IMPORT_EMPTY",
      422,
    );
  }

  // =========================================
  // CAPACITY
  // =========================================

  const maxProfiles = Number(program.max_profiles) || 0;

  const currentProfiles = Number(program.total_profiles) || 0;

  if (maxProfiles > 0 && currentProfiles >= maxProfiles) {
    throw createImportError(
      "Chương trình đã đủ số lượng hồ sơ.",
      "INCUBATION_PROGRAM_FULL",
      409,
      {
        max_profiles: maxProfiles,

        current_profiles: currentProfiles,
      },
    );
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    let createdProfiles = 0;
    let existedProfiles = 0;

    const rows = [];

    for (const item of profiles) {
      const result = await importOneProfile(connection, numericProgramId, item);

      rows.push(result);

      if (result.created) {
        createdProfiles += 1;
      }

      if (result.existed) {
        existedProfiles += 1;
      }
    }

    // =========================================
    // CHECK CAPACITY SAU KHI TÍNH DUPLICATE
    // =========================================

    if (maxProfiles > 0 && currentProfiles + createdProfiles > maxProfiles) {
      throw createImportError(
        "Số hồ sơ import vượt quá giới hạn của chương trình.",
        "INCUBATION_PROGRAM_CAPACITY_EXCEEDED",
        409,
        {
          max_profiles: maxProfiles,

          current_profiles: currentProfiles,

          new_profiles: createdProfiles,

          available: Math.max(maxProfiles - currentProfiles, 0),
        },
      );
    }

    await connection.commit();

    return {
      program: {
        id: Number(program.id),

        program_name: program.program_name,

        program_code: program.program_code,

        year: program.year,

        max_profiles: maxProfiles,

        current_profiles: currentProfiles,
      },

      totalProfiles: profiles.length,

      createdProfiles,

      existedProfiles,

      rows,
    };
  } catch (error) {
    try {
      await connection.rollback();
    } catch (_) {}

    throw error;
  } finally {
    connection.release();
  }
}
module.exports = {
  importIncubationProfiles,
};
