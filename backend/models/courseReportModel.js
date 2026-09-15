const db = require("../config/db");

const PROJECT_FIELD_CANONICAL = new Map([
  ["linh vuc thuong mai dien tu", "Lĩnh vực Thương mại điện tử"],
  ["linh vuc cong nghe tai chinh", "Lĩnh vực Công nghệ tài chính"],
  ["linh vuc logistic", "Lĩnh vực Logistic"],
  ["linh vuc cong nghe giao duc", "Lĩnh vực Công nghệ giáo dục"],
  ["linh vuc y te va cham soc suc khoe", "Lĩnh vực Y tế và chăm sóc sức khỏe"],
  ["y te va cham soc suc khoe", "Lĩnh vực Y tế và chăm sóc sức khỏe"],
  ["linh vuc nong nghiep cong nghe cao", "Lĩnh vực Nông nghiệp công nghệ cao"],
  ["linh vuc phat trien ben vung", "Lĩnh vực Phát triển bền vững"],
  ["linh vuc chuyen doi so", "Lĩnh vực Chuyển đổi số, trí tuệ nhân tạo (AI)"],
  ["linh vuc chuyen doi so, tri tue nhan tao", "Lĩnh vực Chuyển đổi số, trí tuệ nhân tạo (AI)"],
  ["linh vuc chuyen doi so, tri tue nhan tao (ai)", "Lĩnh vực Chuyển đổi số, trí tuệ nhân tạo (AI)"],
  ["linh vuc an ninh mang", "Lĩnh vực An ninh mạng"],
  ["linh vuc cong nghiep van hoa", "Lĩnh vực công nghiệp văn hóa"],
  ["cong nghiep van hoa", "Lĩnh vực công nghiệp văn hóa"],
  ["chua co y tuong/du an", "Chưa có dự án khởi nghiệp"],
  ["chua co du an khoi nghiep", "Chưa có dự án khởi nghiệp"],
  ["linh vuc cong nghe ban dan, vi mach", "Lĩnh vực công nghệ bán dẫn, vi mạch"],
  ["linh vuc vr, ar", "Lĩnh vực VR, AR"],
  ["linh vuc drone,uav", "Lĩnh vực DRONE,UAV"],
  ["linh vuc drone, uav", "Lĩnh vực DRONE,UAV"],
]);

const STARTUP_STAGE_CANONICAL = new Map([
  ["giai doan y tuong", "Giai đoạn ý tưởng"],
  ["giai doan prototype/mvp", "Giai đoạn prototype/MVP"],
  ["da co mot vai khach hang (tra tien)", "Đã có một vài khách hàng (trả tiền)"],
  ["dang trong giai doan tang toc", "Đang trong giai đoạn tăng tốc"],
  ["giai doan tang truong", "Giai đoạn tăng trưởng"],
  ["giai doan truong thanh", "Giai đoạn trưởng thành"],
]);

const NQ20_CANONICAL = new Map([
  ["toi la du an da duoc tuyen chon nam 2024", "Tôi là dự án đã được tuyển chọn năm 2024"],
  ["toi la du an duoc tuyen chon nam 2025", "Tôi là dự án được tuyển chọn năm 2025"],
  ["toi khong thuoc chuong trinh tren", "Tôi không thuộc chương trình trên"],
]);

const MISSING_TEXT_VALUES = new Set([
  "", "-", ".", "n/a", "na", "none", "null", "unknown",
  "khong", "khong co", "chua co", "khong chia se", "khong co du lieu",
  "chua cap nhat", "khac",
]);

const POSITION_DISPLAY_ALIASES = new Map([
  ["founder", "Founder"],
  ["co-founder", "Co-founder"],
  ["giang vien", "Giảng viên"],
  ["giao vien", "Giáo viên"],
  ["giam doc", "Giám đốc"],
  ["pho giam doc", "Phó giám đốc"],
  ["nhan vien", "Nhân viên"],
  ["sinh vien", "Sinh viên"],
  ["quan ly", "Quản lý"],
  ["truong khoa", "Trưởng khoa"],
]);

const AUDIENCE_CANONICAL = new Map([
  ["startup", "STARTUP"],
  ["business", "BUSINESS"],
  ["university", "UNIVERSITY"],
  ["student", "STUDENT"],
  ["sme", "SME"],
  ["startup_company", "STARTUP_COMPANY"],
  ["startup_project", "STARTUP_PROJECT"],
  ["educator", "EDUCATOR"],
  ["support_organization", "SUPPORT_ORGANIZATION"],
  ["investment_fund", "INVESTMENT_FUND"],
  ["cooperative", "COOPERATIVE"],
]);

const PARTICIPANT_GROUPS = [
  { code: "STARTUP", name: "Startup" },
  { code: "STUDENT", name: "Sinh viên" },
  { code: "LECTURER", name: "Giảng viên" },
  { code: "COOPERATIVE", name: "HTX" },
  { code: "OTHER", name: "Nhóm khác" },
];

const PROGRAM_OVERVIEW_USER_FIELDS = [
  { key: "gender", label: "Giới tính" },
  { key: "age_group", label: "Nhóm tuổi" },
  { key: "user_type", label: "Nhóm đối tượng" },
  { key: "company", label: "Đơn vị công tác" },
  { key: "position", label: "Chức vụ", presentationTailLimit: 12 },
];

const PROGRAM_OVERVIEW_REGISTRATION_FIELDS = [
  { key: "has_project", label: "Có dự án?", boolean: true },
  { key: "project_name", label: "Tên dự án" },
  { key: "project_field", label: "Lĩnh vực dự án", canonicalOnly: true, multiValue: true },
  { key: "startup_stage", label: "Giai đoạn dự án", canonicalOnly: true },
  { key: "project_description", label: "Mô tả dự án" },
  {
    key: "female_founder",
    label: "Dự án có nữ founder/co-founder?",
    boolean: true,
  },
  { key: "team_size", label: "Quy mô đội ngũ" },
  { key: "incubation_status", label: "Trạng thái ươm tạo" },
  {
    key: "program_selection_status",
    label: "Bạn đã được tuyển chọn vào chương trình ươm tạo, tăng tốc theo Nghị quyết 20/2023/NQ-HĐND do SIHUB tổ chức?",
    description: "Bạn đã được tuyển chọn vào chương trình ươm tạo, tăng tốc theo Nghị quyết 20/2023/NQ-HĐND do SIHUB tổ chức?",
    canonicalOnly: true,
  },
  { key: "support_needs", label: "Nhu cầu hỗ trợ" },
  { key: "organizer_question", label: "Câu hỏi cho Ban tổ chức" },
  { key: "register_status", label: "Trạng thái đăng ký" },
  { key: "checked_in", label: "Đã check-in", boolean: true },
];

function hasOverviewValue(value) {
  return value !== null
    && value !== undefined
    && (typeof value !== "string" || value.trim() !== "");
}

function normalizedOverviewText(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
}

function comparableOverviewText(value) {
  return normalizedOverviewText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function lexicalComparableText(value) {
  return comparableOverviewText(value)
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/\s*([/&,+-])\s*/g, "$1")
    .replace(/^[\s.,;:_/\\-]+|[\s.,;:_/\\-]+$/g, "");
}

function lexicalCasefoldText(value) {
  return normalizedOverviewText(value)
    .toLocaleLowerCase("vi")
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/\s*([/&,+-])\s*/g, "$1")
    .replace(/^[\s.,;:_/\\-]+|[\s.,;:_/\\-]+$/g, "");
}

function isMissingOverviewText(value) {
  return MISSING_TEXT_VALUES.has(lexicalComparableText(value));
}

function normalizeOverviewValue(field, rawValue) {
  if (!hasOverviewValue(rawValue)) return null;
  if (typeof rawValue === "boolean" || typeof rawValue === "number") return rawValue;

  const value = normalizedOverviewText(rawValue);
  const comparable = comparableOverviewText(value);
  const lexical = lexicalComparableText(value);

  if (isMissingOverviewText(value)) return null;

  if (field === "gender") {
    const gender = value.toUpperCase();
    if (gender === "MALE" || comparable === "nam") return "MALE";
    if (gender === "FEMALE" || comparable === "nu") return "FEMALE";
    return null;
  }

  if (field === "user_type") {
    return AUDIENCE_CANONICAL.get(lexical.replace(/-/g, "_")) || null;
  }

  if (field === "age_group") {
    if (["under_18", "duoi 18 tuoi"].includes(lexical)) return "Dưới 18 tuổi";
    if (["18_24", "tu 18-24 tuoi", "tu 18 den 24 tuoi"].includes(lexical)) return "Từ 18–24 tuổi";
    if (["18-25", "18-25 tuoi"].includes(lexical)) return "Từ 18–25 tuổi";
    if (/^tu 18\s*(?:-|den)\s*25 tuoi$/.test(comparable)) return "Từ 18–25 tuổi";
    if (["25_34", "tu 25-34 tuoi", "tu 25 den 34 tuoi"].includes(lexical)) return "Từ 25–34 tuổi";
    if (/^tu 25\s*(?:-|den)\s*35 tuoi$/.test(comparable)) return "Từ 25–35 tuổi";
    if (["26-35", "26-35 tuoi"].includes(lexical)) return "Từ 26–35 tuổi";
    if (["35_44", "tu 35-44 tuoi", "tu 35 den 44 tuoi"].includes(lexical)) return "Từ 35–44 tuổi";
    if (/^tu 35\s*(?:-|den)\s*45 tuoi$/.test(comparable)) return "Từ 35–45 tuổi";
    if (comparable === "tren 35 tuoi") return "Trên 35 tuổi";
    if (lexical === "45_plus" || comparable === "tu 45 tuoi tro len") return "Từ 45 tuổi trở lên";
    if (comparable === "tren 45 tuoi") return "Trên 45 tuổi";
    if (/^\d+(?: tuoi)?$/.test(comparable)) return "Khác/Chưa chuẩn hóa";
  }

  if (field === "position") {
    return POSITION_DISPLAY_ALIASES.get(lexical) || value.replace(/[‐‑‒–—―]/g, "-");
  }

  if (field === "company") {
    return value;
  }

  if (field === "project_field") {
    return PROJECT_FIELD_CANONICAL.get(comparable) || null;
  }

  if (field === "startup_stage") {
    return STARTUP_STAGE_CANONICAL.get(comparable) || null;
  }

  if (field === "program_selection_status") {
    return NQ20_CANONICAL.get(comparable) || null;
  }

  return value;
}

function normalizeOverviewValues(field, rawValue) {
  if (field !== "project_field") {
    const value = normalizeOverviewValue(field, rawValue);
    return value === null ? [] : [value];
  }

  let values = [rawValue];
  if (typeof rawValue === "string") {
    const trimmed = rawValue.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) values = parsed;
      } catch {
        values = trimmed.split(/\s+\|\s+/);
      }
    } else {
      values = trimmed.split(/\s+\|\s+/);
    }
  }

  return [...new Set(values
    .map((value) => normalizeOverviewValue(field, value))
    .filter((value) => value !== null))];
}

function deriveHasProject(projectField, rawHasProject) {
  const projectFields = normalizeOverviewValues("project_field", projectField);
  const hasNoProject = projectFields.includes("Chưa có dự án khởi nghiệp");
  const hasCanonicalProject = projectFields.some((value) => value !== "Chưa có dự án khởi nghiệp");
  if (hasCanonicalProject) return true;
  if (hasNoProject) return false;
  if (rawHasProject === true || rawHasProject === 1 || rawHasProject === "1") return true;
  return null;
}

function overviewGroupKey(field, value) {
  if (value === null) return "__MISSING__";
  if (["company", "position"].includes(field)) {
    return `${typeof value}:${lexicalCasefoldText(value)}`;
  }
  if (["project_field", "startup_stage"].includes(field)) {
    return `${typeof value}:${lexicalComparableText(value)}`;
  }
  return `${typeof value}:${String(value)}`;
}

function overviewAnalysis(rows, definition, scope) {
  const {
    key: field,
    label,
    description,
    boolean = false,
    canonicalOnly = false,
    multiValue = false,
    presentationTailLimit = null,
  } = definition;
  const sourceRows = scope === "USER"
    ? [...new Map(rows.map((row) => [Number(row.user_id), row])).values()]
    : rows;
  const groups = new Map();

  sourceRows.forEach((row) => {
    const values = normalizeOverviewValues(field, row[field]);
    if (!values.length && !canonicalOnly) values.push(null);
    values.forEach((value) => {
      const key = overviewGroupKey(field, value);
      const current = groups.get(key) || { value, count: 0 };
      current.count += 1;
      groups.set(key, current);
    });
  });

  const withData = sourceRows.filter((row) => (
    normalizeOverviewValues(field, row[field]).length > 0
  )).length;
  const excluded = canonicalOnly
    ? sourceRows.filter((row) => hasOverviewValue(row[field])
      && normalizeOverviewValues(field, row[field]).length === 0).length
    : 0;
  const placeholderCount = canonicalOnly
    ? 0
    : sourceRows.filter((row) => hasOverviewValue(row[field])
      && normalizeOverviewValues(field, row[field]).length === 0).length;

  const sortedGroups = [...groups.values()].sort((left, right) => right.count - left.count);
  let renderedGroups = sortedGroups;
  let groupedOther = null;
  if (presentationTailLimit && sortedGroups.filter((group) => group.value !== null).length > presentationTailLimit) {
    const missingGroups = sortedGroups.filter((group) => group.value === null);
    const populatedGroups = sortedGroups.filter((group) => group.value !== null);
    const keptGroups = populatedGroups.slice(0, presentationTailLimit);
    const tailGroups = populatedGroups.slice(presentationTailLimit);
    groupedOther = {
      category_count: tailGroups.length,
      record_count: tailGroups.reduce((sum, group) => sum + group.count, 0),
    };
    renderedGroups = [
      ...keptGroups,
      { value: "Khác", count: groupedOther.record_count, grouped_category_count: groupedOther.category_count },
      ...missingGroups,
    ];
  }

  return {
    key: field,
    label,
    description,
    scope,
    boolean,
    multi_value: multiValue,
    total: sourceRows.length,
    with_data: withData,
    without_data: sourceRows.length - withData,
    excluded_other: excluded,
    placeholder_count: placeholderCount,
    raw_distinct: new Set(sourceRows
      .filter((row) => hasOverviewValue(row[field]))
      .map((row) => normalizedOverviewText(row[field]))).size,
    normalized_distinct: sortedGroups.filter((group) => group.value !== null).length,
    grouped_other: groupedOther,
    percentage_denominator: multiValue ? withData : sourceRows.length,
    groups: renderedGroups,
  };
}

function matchesOverviewFilters(row, filters) {
  const exactMatches = [
    ["gender", "gender"],
    ["ageGroup", "age_group"],
    ["userType", "user_type"],
    ["organization", "company"],
    ["position", "position"],
    ["projectField", "project_field"],
    ["startupStage", "startup_stage"],
    ["programSelectionStatus", "program_selection_status"],
    ["registerStatus", "register_status"],
  ];

  if (filters.courseId && Number(row.course_id) !== Number(filters.courseId)) {
    return false;
  }

  if (filters.openingId && Number(row.opening_id) !== Number(filters.openingId)) {
    return false;
  }

  if (filters.hasProject !== undefined
    && Boolean(Number(row.has_project)) !== filters.hasProject) {
    return false;
  }

  return exactMatches.every(([filterName, fieldName]) => {
    if (!filters[filterName]) return true;
    const filterValue = normalizeOverviewValue(fieldName, filters[filterName]);
    return normalizeOverviewValues(fieldName, row[fieldName]).some((value) => (
      overviewGroupKey(fieldName, value) === overviewGroupKey(fieldName, filterValue)
    ));
  });
}

function uniqueOptions(rows, field) {
  const options = new Map();
  rows.forEach((row) => {
    normalizeOverviewValues(field, row[field]).forEach((value) => {
      const key = overviewGroupKey(field, value);
      if (!options.has(key)) options.set(key, String(value));
    });
  });
  return [...options.values()]
    .sort((left, right) => left.localeCompare(right, "vi"));
}

class CourseReportModel {
  static async getSummary(reportStart, reportEnd) {
    const filteredOpeningsSql = `
      SELECT
        cc.id,
        cc.course_id,
        cc.organization_start_date,
        cc.organization_end_date

      FROM course_classes cc

      INNER JOIN courses c
        ON c.id = cc.course_id

      WHERE cc.deleted_at IS NULL
        AND c.deleted_at IS NULL
        AND cc.organization_start_date IS NOT NULL
        AND cc.organization_end_date IS NOT NULL
        AND cc.organization_start_date <= cc.organization_end_date
        AND cc.organization_start_date <= ?
        AND cc.organization_end_date >= ?
    `;

    const [summaryRows] = await db.query(
      `
        WITH filtered_openings AS (
          ${filteredOpeningsSql}
        )

        SELECT
          (SELECT COUNT(DISTINCT course_id) FROM filtered_openings)
            AS total_courses,

          (
            SELECT COUNT(DISTINCT cc_year.id)
            FROM course_classes cc_year
            INNER JOIN courses c_year
              ON c_year.id = cc_year.course_id
            INNER JOIN training_programs tp_year
              ON tp_year.id = c_year.program_id
            WHERE tp_year.year = YEAR(?)
              AND cc_year.deleted_at IS NULL
              AND c_year.deleted_at IS NULL
          ) AS total_openings,

          (
            SELECT COUNT(*)
            FROM training_programs tp
            WHERE tp.year = YEAR(?)
          ) AS total_programs,

          (
            SELECT COUNT(*)
            FROM filtered_openings
            WHERE organization_end_date < CURRENT_DATE()
          ) AS finished_openings,

          (
            SELECT COUNT(*)
            FROM filtered_openings
            WHERE organization_start_date <= CURRENT_DATE()
              AND organization_end_date >= CURRENT_DATE()
          ) AS ongoing_openings,

          (
            SELECT COUNT(*)
            FROM filtered_openings
            WHERE organization_start_date > CURRENT_DATE()
          ) AS upcoming_openings,

          (
            SELECT COUNT(DISTINCT r.user_id)
            FROM registrations r
            INNER JOIN filtered_openings fo
              ON fo.id = r.class_id
            WHERE r.register_status IN ('PENDING', 'CONFIRMED')
              AND r.user_id IS NOT NULL
          ) AS total_students_registered,

          (
            SELECT COUNT(DISTINCT r.user_id)
            FROM registrations r
            INNER JOIN course_classes cc
              ON cc.id = r.class_id
            INNER JOIN courses c
              ON c.id = cc.course_id
            INNER JOIN training_programs tp
              ON tp.id = c.program_id
            WHERE r.register_status IN ('PENDING', 'CONFIRMED')
              AND r.user_id IS NOT NULL
              AND cc.deleted_at IS NULL
              AND c.deleted_at IS NULL
          ) AS total_students_all_time,

          (
            SELECT COUNT(DISTINCT r.user_id)
            FROM registrations r
            INNER JOIN course_classes cc
              ON cc.id = r.class_id
            INNER JOIN courses c
              ON c.id = cc.course_id
            INNER JOIN training_programs tp
              ON tp.id = c.program_id
            WHERE tp.year = YEAR(?)
              AND r.register_status IN ('PENDING', 'CONFIRMED')
              AND r.user_id IS NOT NULL
              AND cc.deleted_at IS NULL
              AND c.deleted_at IS NULL
          ) AS total_students_year,

          (
            SELECT COUNT(DISTINCT r.user_id)
            FROM course_class_attendances a
            INNER JOIN registrations r
              ON r.id = a.registration_id
            INNER JOIN filtered_openings fo
              ON fo.id = r.class_id
          ) AS total_students_attended,

          (
            SELECT COUNT(DISTINCT r.user_id)
            FROM course_certificates cert
            INNER JOIN registrations r
              ON r.id = cert.registration_id
            INNER JOIN filtered_openings fo
              ON fo.id = r.class_id
            WHERE cert.issued = 1
          ) AS total_certificates_issued
      `,
      [reportEnd, reportStart, reportStart, reportStart, reportStart],
    );

    const [participantRows] = await db.query(
      `
        WITH filtered_openings AS (
          ${filteredOpeningsSql}
        ),

        registered_students AS (
          SELECT DISTINCT
            r.user_id

          FROM registrations r

          INNER JOIN filtered_openings fo
            ON fo.id = r.class_id

          WHERE r.register_status IN ('PENDING', 'CONFIRMED')
            AND r.user_id IS NOT NULL
        )

        SELECT
          CASE
            WHEN UPPER(TRIM(COALESCE(u.user_type, ''))) = 'STARTUP'
              THEN 'STARTUP'

            WHEN UPPER(TRIM(COALESCE(u.user_type, ''))) = 'STUDENT'
              THEN 'STUDENT'

            ELSE 'OTHER'
          END AS code,

          COUNT(*) AS value

        FROM registered_students rs

        LEFT JOIN users u
          ON u.id = rs.user_id

        GROUP BY code
      `,
      [reportEnd, reportStart],
    );

    const summaryRow = summaryRows[0] || {};
    const participantValueMap = new Map(
      participantRows.map((item) => [item.code, Number(item.value) || 0]),
    );

    return {
      summary: {
        total_programs: Number(summaryRow.total_programs) || 0,
        total_courses: Number(summaryRow.total_courses) || 0,
        total_openings: Number(summaryRow.total_openings) || 0,
        finished_openings: Number(summaryRow.finished_openings) || 0,
        ongoing_openings: Number(summaryRow.ongoing_openings) || 0,
        upcoming_openings: Number(summaryRow.upcoming_openings) || 0,
        total_students_registered:
          Number(summaryRow.total_students_registered) || 0,
        total_students_all_time:
          Number(summaryRow.total_students_all_time) || 0,
        total_students_year:
          Number(summaryRow.total_students_year) || 0,
        total_students_attended:
          Number(summaryRow.total_students_attended) || 0,
        total_certificates_issued:
          Number(summaryRow.total_certificates_issued) || 0,
      },
      participant_groups: PARTICIPANT_GROUPS.map((group) => ({
        ...group,
        value: participantValueMap.get(group.code) || 0,
      })),
    };
  }

  static async getPrograms(reportStart, reportEnd) {
    const [rows] = await db.query(
      `
        WITH programs_in_year AS (
          SELECT
            id AS program_id,
            program_name
          FROM training_programs
          WHERE year = YEAR(?)
        ),

        year_openings_by_program AS (
          SELECT
            c.program_id,
            COUNT(DISTINCT cc.id) AS total_openings
          FROM programs_in_year py
          INNER JOIN courses c
            ON c.program_id = py.program_id
            AND c.deleted_at IS NULL
          INNER JOIN course_classes cc
            ON cc.course_id = c.id
            AND cc.deleted_at IS NULL
          GROUP BY c.program_id
        ),

        filtered_openings AS (
          SELECT
            cc.id AS opening_id,
            c.id AS course_id,
            c.program_id,
            tp.program_name

          FROM course_classes cc

          INNER JOIN courses c
            ON c.id = cc.course_id

          INNER JOIN programs_in_year tp
            ON tp.program_id = c.program_id

          WHERE cc.deleted_at IS NULL
            AND c.deleted_at IS NULL
            AND cc.organization_start_date IS NOT NULL
            AND cc.organization_end_date IS NOT NULL
            AND cc.organization_start_date <= cc.organization_end_date
            AND cc.organization_start_date <= ?
            AND cc.organization_end_date >= ?
        ),

        openings_by_program AS (
          SELECT
            program_id,
            program_name,
            COUNT(DISTINCT course_id) AS total_courses,
            COUNT(DISTINCT opening_id) AS total_openings

          FROM filtered_openings

          GROUP BY program_id, program_name
        ),

        registered_by_program AS (
          SELECT
            fo.program_id,
            COUNT(DISTINCT r.user_id) AS total_students_registered,
            COUNT(DISTINCT r.id) AS total_registrations

          FROM filtered_openings fo

          INNER JOIN registrations r
            ON r.class_id = fo.opening_id

          WHERE r.register_status IN ('PENDING', 'CONFIRMED')
            AND r.user_id IS NOT NULL

          GROUP BY fo.program_id
        ),

        attended_by_program AS (
          SELECT
            fo.program_id,
            COUNT(DISTINCT r.user_id) AS total_students_attended

          FROM course_class_attendances a

          INNER JOIN registrations r
            ON r.id = a.registration_id

          INNER JOIN filtered_openings fo
            ON fo.opening_id = r.class_id

          GROUP BY fo.program_id
        ),

        certificates_by_program AS (
          SELECT
            fo.program_id,
            COUNT(DISTINCT r.user_id) AS total_certificates_issued

          FROM course_certificates cert

          INNER JOIN registrations r
            ON r.id = cert.registration_id

          INNER JOIN filtered_openings fo
            ON fo.opening_id = r.class_id

          WHERE cert.issued = 1

          GROUP BY fo.program_id
        )

        SELECT
          py.program_id,
          py.program_name,
          COALESCE(op.total_courses, 0) AS total_courses,
          COALESCE(yop.total_openings, 0) AS total_openings,
          COALESCE(rp.total_students_registered, 0)
            AS total_students_registered,
          COALESCE(rp.total_registrations, 0)
            AS total_registrations,
          COALESCE(ap.total_students_attended, 0)
            AS total_students_attended,
          COALESCE(cp.total_certificates_issued, 0)
            AS total_certificates_issued

        FROM programs_in_year py

        LEFT JOIN openings_by_program op
          ON op.program_id = py.program_id

        LEFT JOIN year_openings_by_program yop
          ON yop.program_id = py.program_id

        LEFT JOIN registered_by_program rp
          ON rp.program_id = py.program_id

        LEFT JOIN attended_by_program ap
          ON ap.program_id = py.program_id

        LEFT JOIN certificates_by_program cp
          ON cp.program_id = py.program_id

        ORDER BY py.program_id ASC
      `,
      [reportStart, reportEnd, reportStart],
    );

    return rows.map((item) => ({
      program_id: Number(item.program_id),
      program_name: item.program_name,
      total_courses: Number(item.total_courses) || 0,
      total_openings: Number(item.total_openings) || 0,
      total_students_registered:
        Number(item.total_students_registered) || 0,
      total_registrations: Number(item.total_registrations) || 0,
      total_students_attended: Number(item.total_students_attended) || 0,
      total_certificates_issued:
        Number(item.total_certificates_issued) || 0,
    }));
  }

  static async getCourseSummaryRows(reportStart, reportEnd) {
    const [rows] = await db.query(
      `
        WITH filtered_openings AS (
          SELECT
            cc.id AS opening_id,
            c.id AS course_id,
            c.course_name,
            tp.program_name
          FROM course_classes cc
          INNER JOIN courses c ON c.id = cc.course_id
          INNER JOIN training_programs tp ON tp.id = c.program_id
          WHERE cc.deleted_at IS NULL
            AND c.deleted_at IS NULL
            AND cc.organization_start_date IS NOT NULL
            AND cc.organization_end_date IS NOT NULL
            AND cc.organization_start_date <= cc.organization_end_date
            AND cc.organization_start_date <= ?
            AND cc.organization_end_date >= ?
        ),
        openings_by_course AS (
          SELECT
            course_id,
            course_name,
            program_name,
            COUNT(DISTINCT opening_id) AS total_openings
          FROM filtered_openings
          GROUP BY course_id, course_name, program_name
        ),
        registered_by_course AS (
          SELECT
            fo.course_id,
            COUNT(DISTINCT r.user_id) AS total_students_registered
          FROM filtered_openings fo
          INNER JOIN registrations r ON r.class_id = fo.opening_id
          WHERE r.register_status IN ('PENDING', 'CONFIRMED')
            AND r.user_id IS NOT NULL
          GROUP BY fo.course_id
        ),
        attended_by_course AS (
          SELECT
            fo.course_id,
            COUNT(DISTINCT r.user_id) AS total_students_attended
          FROM course_class_attendances a
          INNER JOIN registrations r ON r.id = a.registration_id
          INNER JOIN filtered_openings fo ON fo.opening_id = r.class_id
          GROUP BY fo.course_id
        ),
        certificates_by_course AS (
          SELECT
            fo.course_id,
            COUNT(DISTINCT r.user_id) AS total_certificates_issued
          FROM course_certificates cert
          INNER JOIN registrations r ON r.id = cert.registration_id
          INNER JOIN filtered_openings fo ON fo.opening_id = r.class_id
          WHERE cert.issued = 1
          GROUP BY fo.course_id
        )
        SELECT
          course.course_id,
          course.program_name,
          course.course_name,
          course.total_openings,
          COALESCE(registered.total_students_registered, 0)
            AS total_students_registered,
          COALESCE(attended.total_students_attended, 0)
            AS total_students_attended,
          COALESCE(certificates.total_certificates_issued, 0)
            AS total_certificates_issued
        FROM openings_by_course course
        LEFT JOIN registered_by_course registered
          ON registered.course_id = course.course_id
        LEFT JOIN attended_by_course attended
          ON attended.course_id = course.course_id
        LEFT JOIN certificates_by_course certificates
          ON certificates.course_id = course.course_id
        ORDER BY course.program_name ASC, course.course_name ASC, course.course_id ASC
      `,
      [reportEnd, reportStart],
    );

    return rows.map((row) => ({
      ...row,
      course_id: Number(row.course_id),
      total_openings: Number(row.total_openings) || 0,
      total_students_registered: Number(row.total_students_registered) || 0,
      total_students_attended: Number(row.total_students_attended) || 0,
      total_certificates_issued:
        Number(row.total_certificates_issued) || 0,
    }));
  }

  static async findProgramById(programId) {
    const [rows] = await db.query(
      `
        SELECT
          id AS program_id,
          program_name

        FROM training_programs

        WHERE id = ?

        LIMIT 1
      `,
      [programId],
    );

    if (!rows[0]) {
      return null;
    }

    return {
      program_id: Number(rows[0].program_id),
      program_name: rows[0].program_name,
    };
  }

  static async getProgramOverview(programId, filters = {}) {
    const [[programRows], [openingRows], [registrationRows]] = await Promise.all([
      db.query(
        `
          SELECT
            id AS program_id,
            program_name,
            year,
            description,
            status
          FROM training_programs
          WHERE id = ?
          LIMIT 1
        `,
        [programId],
      ),
      db.query(
        `
          SELECT
            c.id AS course_id,
            c.course_name,
            c.description,
            c.duration,
            c.target_audience,
            c.learning_outcomes,
            c.status,
            cc.id AS opening_id,
            cc.class_name,
            DATE_FORMAT(cc.organization_start_date, '%Y-%m-%d')
              AS organization_start_date,
            DATE_FORMAT(cc.organization_end_date, '%Y-%m-%d')
              AS organization_end_date,
            cc.location,
            cc.status AS operational_status
          FROM courses c
          LEFT JOIN course_classes cc
            ON cc.course_id = c.id
            AND cc.deleted_at IS NULL
          WHERE c.program_id = ?
            AND c.deleted_at IS NULL
          ORDER BY c.id ASC, cc.id ASC
        `,
        [programId],
      ),
      db.query(
        `
          SELECT
            r.id AS registration_id,
            r.user_id,
            c.id AS course_id,
            cc.id AS opening_id,
            u.gender,
            u.age_group,
            u.user_type,
            u.company,
            u.position,
            r.has_project,
            r.project_name,
            r.project_field,
            r.startup_stage,
            r.project_description,
            r.female_founder,
            r.team_size,
            r.incubation_status,
            r.program_selection_status,
            r.support_needs,
            r.organizer_question,
            r.register_status,
            r.checked_in
          FROM registrations r
          INNER JOIN course_classes cc
            ON cc.id = r.class_id
            AND cc.deleted_at IS NULL
          INNER JOIN courses c
            ON c.id = cc.course_id
            AND c.deleted_at IS NULL
          INNER JOIN training_programs tp
            ON tp.id = c.program_id
          INNER JOIN users u
            ON u.id = r.user_id
          WHERE tp.id = ?
            AND r.register_status IN ('PENDING', 'CONFIRMED')
            AND r.user_id IS NOT NULL
          ORDER BY r.id ASC
        `,
        [programId],
      ),
    ]);

    if (!programRows[0]) {
      return null;
    }

    const normalizedRows = registrationRows.map((row) => ({
      ...row,
      registration_id: Number(row.registration_id),
      user_id: Number(row.user_id),
      course_id: Number(row.course_id),
      opening_id: Number(row.opening_id),
      has_project: deriveHasProject(row.project_field, row.has_project),
      female_founder: row.female_founder == null
        ? null
        : Boolean(Number(row.female_founder)),
      checked_in: row.checked_in == null ? null : Boolean(Number(row.checked_in)),
    }));
    const filteredRows = normalizedRows.filter((row) => (
      matchesOverviewFilters(row, filters)
    ));
    const selectedCourseId = filters.courseId ? Number(filters.courseId) : null;
    const courseOpeningRows = selectedCourseId
      ? openingRows.filter((row) => Number(row.course_id) === selectedCourseId)
      : openingRows;
    const scopedOpeningRows = filters.openingId
      ? courseOpeningRows.filter((row) => Number(row.opening_id) === Number(filters.openingId))
      : courseOpeningRows;
    const registrationsByOpening = new Map();
    const usersByOpening = new Map();
    const usersByCourse = new Map();
    const registrationsByCourse = new Map();

    filteredRows.forEach((row) => {
      registrationsByOpening.set(
        row.opening_id,
        (registrationsByOpening.get(row.opening_id) || 0) + 1,
      );
      if (!usersByOpening.has(row.opening_id)) usersByOpening.set(row.opening_id, new Set());
      usersByOpening.get(row.opening_id).add(row.user_id);
      if (!usersByCourse.has(row.course_id)) usersByCourse.set(row.course_id, new Set());
      usersByCourse.get(row.course_id).add(row.user_id);
      registrationsByCourse.set(
        row.course_id,
        (registrationsByCourse.get(row.course_id) || 0) + 1,
      );
    });

    const coursesById = new Map();
    scopedOpeningRows.forEach((row) => {
      const courseId = Number(row.course_id);
      if (!coursesById.has(courseId)) {
        coursesById.set(courseId, {
          course_id: courseId,
          course_name: row.course_name,
          description: row.description,
          duration: row.duration,
          target_audience: row.target_audience,
          learning_outcomes: row.learning_outcomes,
          status: row.status,
          total_openings: 0,
          organized_openings: 0,
          unique_students: usersByCourse.get(courseId)?.size || 0,
          total_registrations: registrationsByCourse.get(courseId) || 0,
          openings: [],
        });
      }

      if (row.opening_id !== null) {
        const course = coursesById.get(courseId);
        const operationalStatus = row.operational_status;
        course.total_openings += 1;
        if (operationalStatus === "FINISHED") course.organized_openings += 1;
        course.openings.push({
          opening_id: Number(row.opening_id),
          class_name: row.class_name,
          organization_start_date: row.organization_start_date,
          organization_end_date: row.organization_end_date,
          location: row.location,
          operational_status: operationalStatus,
          unique_students: usersByOpening.get(Number(row.opening_id))?.size || 0,
          registered_count: registrationsByOpening.get(Number(row.opening_id)) || 0,
        });
      }
    });

    const analyses = {};
    PROGRAM_OVERVIEW_USER_FIELDS.forEach((definition) => {
      analyses[definition.key] = overviewAnalysis(filteredRows, definition, "USER");
    });
    PROGRAM_OVERVIEW_REGISTRATION_FIELDS.forEach((definition) => {
      analyses[definition.key] = overviewAnalysis(
        filteredRows,
        definition,
        "REGISTRATION",
      );
    });

    const program = programRows[0];
    const courses = [...coursesById.values()];

    return {
      program: {
        program_id: Number(program.program_id),
        program_name: program.program_name,
        year: program.year == null ? null : Number(program.year),
        description: program.description,
        status: program.status,
      },
      summary: {
        total_courses: courses.length,
        total_openings: courses.reduce((sum, course) => sum + course.total_openings, 0),
        organized_openings: courses.reduce(
          (sum, course) => sum + course.organized_openings,
          0,
        ),
        unique_students: new Set(filteredRows.map((row) => row.user_id)).size,
        total_registrations: filteredRows.length,
      },
      courses,
      analyses,
      filter_options: {
        openings: courseOpeningRows
          .filter((row) => row.opening_id !== null)
          .map((row) => ({
            value: Number(row.opening_id),
            label: row.class_name,
          })),
        courses: [...new Map(openingRows.map((row) => [Number(row.course_id), {
          value: Number(row.course_id),
          label: row.course_name,
        }])).values()],
        gender: uniqueOptions(normalizedRows, "gender"),
        age_group: uniqueOptions(normalizedRows, "age_group"),
        user_type: uniqueOptions(normalizedRows, "user_type"),
        company: uniqueOptions(normalizedRows, "company"),
        position: uniqueOptions(normalizedRows, "position"),
        has_project: [...new Set(normalizedRows
          .filter((row) => row.has_project !== null)
          .map((row) => row.has_project))],
        project_field: uniqueOptions(normalizedRows, "project_field"),
        startup_stage: uniqueOptions(normalizedRows, "startup_stage"),
        program_selection_status: uniqueOptions(
          normalizedRows,
          "program_selection_status",
        ),
        register_status: uniqueOptions(normalizedRows, "register_status"),
      },
    };
  }

  static async getCoursesByProgram(programId, reportStart, reportEnd) {
    const [rows] = await db.query(
      `
        WITH filtered_openings AS (
          SELECT
            cc.id AS opening_id,
            c.id AS course_id,
            c.course_name

          FROM course_classes cc

          INNER JOIN courses c
            ON c.id = cc.course_id

          WHERE cc.deleted_at IS NULL
            AND c.deleted_at IS NULL
            AND c.program_id = ?
            AND cc.organization_start_date IS NOT NULL
            AND cc.organization_end_date IS NOT NULL
            AND cc.organization_start_date <= cc.organization_end_date
            AND cc.organization_start_date <= ?
            AND cc.organization_end_date >= ?
        ),

        openings_by_course AS (
          SELECT
            course_id,
            course_name,
            COUNT(DISTINCT opening_id) AS total_openings

          FROM filtered_openings

          GROUP BY course_id, course_name
        ),

        registered_by_course AS (
          SELECT
            fo.course_id,
            COUNT(DISTINCT r.user_id) AS total_students_registered

          FROM filtered_openings fo

          INNER JOIN registrations r
            ON r.class_id = fo.opening_id

          WHERE r.register_status IN ('PENDING', 'CONFIRMED')
            AND r.user_id IS NOT NULL

          GROUP BY fo.course_id
        ),

        attended_by_course AS (
          SELECT
            fo.course_id,
            COUNT(DISTINCT r.user_id) AS total_students_attended

          FROM course_class_attendances a

          INNER JOIN registrations r
            ON r.id = a.registration_id

          INNER JOIN filtered_openings fo
            ON fo.opening_id = r.class_id

          GROUP BY fo.course_id
        ),

        certificates_by_course AS (
          SELECT
            fo.course_id,
            COUNT(DISTINCT r.user_id) AS total_certificates_issued

          FROM course_certificates cert

          INNER JOIN registrations r
            ON r.id = cert.registration_id

          INNER JOIN filtered_openings fo
            ON fo.opening_id = r.class_id

          WHERE cert.issued = 1

          GROUP BY fo.course_id
        )

        SELECT
          oc.course_id,
          oc.course_name,
          oc.total_openings,
          COALESCE(rc.total_students_registered, 0)
            AS total_students_registered,
          COALESCE(ac.total_students_attended, 0)
            AS total_students_attended,
          COALESCE(cc.total_certificates_issued, 0)
            AS total_certificates_issued

        FROM openings_by_course oc

        LEFT JOIN registered_by_course rc
          ON rc.course_id = oc.course_id

        LEFT JOIN attended_by_course ac
          ON ac.course_id = oc.course_id

        LEFT JOIN certificates_by_course cc
          ON cc.course_id = oc.course_id

        ORDER BY oc.course_id ASC
      `,
      [programId, reportEnd, reportStart],
    );

    return rows.map((item) => ({
      course_id: Number(item.course_id),
      course_name: item.course_name,
      total_openings: Number(item.total_openings) || 0,
      total_students_registered:
        Number(item.total_students_registered) || 0,
      total_students_attended: Number(item.total_students_attended) || 0,
      total_certificates_issued:
        Number(item.total_certificates_issued) || 0,
    }));
  }

  static async findCourseById(courseId) {
    const [rows] = await db.query(
      `
        SELECT
          id AS course_id,
          course_name

        FROM courses

        WHERE id = ?
          AND deleted_at IS NULL

        LIMIT 1
      `,
      [courseId],
    );

    if (!rows[0]) {
      return null;
    }

    return {
      course_id: Number(rows[0].course_id),
      course_name: rows[0].course_name,
    };
  }

  static async getOpeningsByCourse(courseId, reportStart, reportEnd) {
    const [rows] = await db.query(
      `
        WITH filtered_openings AS (
          SELECT
            cc.id AS opening_id,
            cc.class_name,
            cc.class_code,
            cc.organization_start_date,
            cc.organization_end_date,
            cc.location,
            cc.status AS operational_status

          FROM course_classes cc

          INNER JOIN courses c
            ON c.id = cc.course_id

          WHERE cc.course_id = ?
            AND cc.deleted_at IS NULL
            AND c.deleted_at IS NULL
            AND cc.organization_start_date IS NOT NULL
            AND cc.organization_end_date IS NOT NULL
            AND cc.organization_start_date <= cc.organization_end_date
            AND cc.organization_start_date <= ?
            AND cc.organization_end_date >= ?
        ),

        registered_by_opening AS (
          SELECT
            fo.opening_id,
            COUNT(DISTINCT r.user_id) AS total_students_registered

          FROM filtered_openings fo

          INNER JOIN registrations r
            ON r.class_id = fo.opening_id

          WHERE r.register_status IN ('PENDING', 'CONFIRMED')
            AND r.user_id IS NOT NULL

          GROUP BY fo.opening_id
        ),

        attended_by_opening AS (
          SELECT
            fo.opening_id,
            COUNT(DISTINCT r.user_id) AS total_students_attended

          FROM course_class_attendances a

          INNER JOIN registrations r
            ON r.id = a.registration_id

          INNER JOIN filtered_openings fo
            ON fo.opening_id = r.class_id

          GROUP BY fo.opening_id
        ),

        certificates_by_opening AS (
          SELECT
            fo.opening_id,
            COUNT(DISTINCT r.user_id) AS total_certificates_issued

          FROM course_certificates cert

          INNER JOIN registrations r
            ON r.id = cert.registration_id

          INNER JOIN filtered_openings fo
            ON fo.opening_id = r.class_id

          WHERE cert.issued = 1

          GROUP BY fo.opening_id
        )

        SELECT
          fo.opening_id,
          fo.class_name,
          fo.class_code,
          DATE_FORMAT(fo.organization_start_date, '%Y-%m-%d')
            AS organization_start_date,
          DATE_FORMAT(fo.organization_end_date, '%Y-%m-%d')
            AS organization_end_date,
          fo.location,
          fo.operational_status,
          CASE
            WHEN fo.organization_end_date < CURRENT_DATE()
              THEN 'FINISHED'
            WHEN fo.organization_start_date <= CURRENT_DATE()
              AND fo.organization_end_date >= CURRENT_DATE()
              THEN 'ONGOING'
            WHEN fo.organization_start_date > CURRENT_DATE()
              THEN 'UPCOMING'
          END AS organization_status,
          COALESCE(ro.total_students_registered, 0)
            AS total_students_registered,
          COALESCE(ao.total_students_attended, 0)
            AS total_students_attended,
          COALESCE(co.total_certificates_issued, 0)
            AS total_certificates_issued

        FROM filtered_openings fo

        LEFT JOIN registered_by_opening ro
          ON ro.opening_id = fo.opening_id

        LEFT JOIN attended_by_opening ao
          ON ao.opening_id = fo.opening_id

        LEFT JOIN certificates_by_opening co
          ON co.opening_id = fo.opening_id

        ORDER BY fo.opening_id ASC
      `,
      [courseId, reportEnd, reportStart],
    );

    return rows.map((item) => ({
      opening_id: Number(item.opening_id),
      class_name: item.class_name,
      class_code: item.class_code,
      organization_start_date: item.organization_start_date,
      organization_end_date: item.organization_end_date,
      location: item.location,
      operational_status: item.operational_status,
      organization_status: item.organization_status,
      total_students_registered:
        Number(item.total_students_registered) || 0,
      total_students_attended: Number(item.total_students_attended) || 0,
      total_certificates_issued:
        Number(item.total_certificates_issued) || 0,
    }));
  }

  static async findOpeningById(openingId) {
    const [rows] = await db.query(
      `
        SELECT
          cc.id AS opening_id,
          c.id AS course_id,
          c.course_name,
          cc.class_name,
          cc.class_code,
          DATE_FORMAT(cc.organization_start_date, '%Y-%m-%d')
            AS organization_start_date,
          DATE_FORMAT(cc.organization_end_date, '%Y-%m-%d')
            AS organization_end_date,
          cc.location

        FROM course_classes cc

        INNER JOIN courses c
          ON c.id = cc.course_id

        WHERE cc.id = ?
          AND cc.deleted_at IS NULL
          AND c.deleted_at IS NULL

        LIMIT 1
      `,
      [openingId],
    );

    if (!rows[0]) {
      return null;
    }

    return {
      opening_id: Number(rows[0].opening_id),
      course_id: Number(rows[0].course_id),
      course_name: rows[0].course_name,
      class_name: rows[0].class_name,
      class_code: rows[0].class_code,
      organization_start_date: rows[0].organization_start_date,
      organization_end_date: rows[0].organization_end_date,
      location: rows[0].location,
    };
  }

  static async getStudentsByOpening(openingId) {
    const [rows] = await db.query(
      `
        WITH session_count AS (
          SELECT
            COUNT(DISTINCT id) AS total_sessions

          FROM course_class_sessions

          WHERE class_id = ?
        ),

        attendance_by_registration AS (
          SELECT
            a.registration_id,
            COUNT(DISTINCT a.session_id) AS attended_sessions

          FROM course_class_attendances a

          INNER JOIN course_class_sessions s
            ON s.id = a.session_id
            AND s.class_id = ?

          GROUP BY a.registration_id
        ),

        certificate_by_registration AS (
          SELECT
            cert.registration_id,
            MAX(cert.eligible) AS certificate_eligible,
            MAX(cert.issued) AS certificate_issued,
            MAX(cert.certificate_no) AS certificate_no

          FROM course_certificates cert

          GROUP BY cert.registration_id
        )

        SELECT
          r.id AS registration_id,
          r.user_id,
          u.fullname AS full_name,
          u.email,
          u.phone,
          u.gender,
          u.age_group,
          u.user_type,
          u.company,
          u.position,
          r.has_project,
          r.project_field,
          r.startup_stage,
          r.program_selection_status,
          r.support_needs,
          r.register_status,
          CASE
            WHEN COALESCE(ar.attended_sessions, 0) > 0 THEN 1
            ELSE 0
          END AS attended,
          COALESCE(ar.attended_sessions, 0) AS attended_sessions,
          sc.total_sessions,
          CASE
            WHEN sc.total_sessions > 0 THEN ROUND(
              COALESCE(ar.attended_sessions, 0) * 100.0 / sc.total_sessions,
              2
            )
            ELSE 0
          END AS attendance_rate,
          COALESCE(cr.certificate_eligible, 0) AS certificate_eligible,
          COALESCE(cr.certificate_issued, 0) AS certificate_issued,
          cr.certificate_no

        FROM registrations r

        CROSS JOIN session_count sc

        LEFT JOIN users u
          ON u.id = r.user_id

        LEFT JOIN attendance_by_registration ar
          ON ar.registration_id = r.id

        LEFT JOIN certificate_by_registration cr
          ON cr.registration_id = r.id

        WHERE r.class_id = ?
          AND r.register_status IN ('PENDING', 'CONFIRMED')
          AND r.user_id IS NOT NULL

        ORDER BY u.fullname ASC, r.id ASC
      `,
      [openingId, openingId, openingId],
    );

    return rows.map((item) => ({
      registration_id: Number(item.registration_id),
      user_id: Number(item.user_id),
      full_name: item.full_name,
      email: item.email,
      phone: item.phone,
      gender: normalizeOverviewValue("gender", item.gender),
      age_group: normalizeOverviewValue("age_group", item.age_group),
      user_type: normalizeOverviewValue("user_type", item.user_type),
      company: normalizeOverviewValue("company", item.company),
      position: normalizeOverviewValue("position", item.position),
      has_project: deriveHasProject(item.project_field, item.has_project),
      project_field: item.project_field,
      analytics_project_fields: normalizeOverviewValues("project_field", item.project_field),
      project_stage: normalizeOverviewValue("startup_stage", item.startup_stage),
      program_selection_status: normalizeOverviewValue(
        "program_selection_status",
        item.program_selection_status,
      ),
      support_needs: item.support_needs,
      register_status: item.register_status,
      attended: Boolean(Number(item.attended)),
      attended_sessions: Number(item.attended_sessions) || 0,
      total_sessions: Number(item.total_sessions) || 0,
      attendance_rate: Number(item.attendance_rate) || 0,
      certificate_eligible: Boolean(Number(item.certificate_eligible)),
      certificate_issued: Boolean(Number(item.certificate_issued)),
      certificate_no: item.certificate_no,
    }));
  }

  static async findStudentRegistration(openingId, registrationId) {
    const [rows] = await db.query(
      `
        SELECT
          r.id AS registration_id,
          r.user_id,
          u.fullname AS full_name,
          u.email,
          u.phone,
          r.register_status

        FROM registrations r

        LEFT JOIN users u
          ON u.id = r.user_id

        WHERE r.id = ?
          AND r.class_id = ?
          AND r.register_status IN ('PENDING', 'CONFIRMED')
          AND r.user_id IS NOT NULL

        LIMIT 1
      `,
      [registrationId, openingId],
    );

    if (!rows[0]) {
      return null;
    }

    return {
      registration_id: Number(rows[0].registration_id),
      user_id: Number(rows[0].user_id),
      full_name: rows[0].full_name,
      email: rows[0].email,
      phone: rows[0].phone,
      register_status: rows[0].register_status,
    };
  }

  static async getAttendanceHistory(openingId, registrationId) {
    const [rows] = await db.query(
      `
        SELECT
          s.id AS session_id,
          s.session_no,
          DATE_FORMAT(s.session_date, '%Y-%m-%d') AS session_date,
          TIME_FORMAT(s.start_time, '%H:%i:%s') AS start_time,
          TIME_FORMAT(s.end_time, '%H:%i:%s') AS end_time,
          s.location,
          s.room,
          s.note,
          CASE
            WHEN a.id IS NOT NULL THEN 1
            ELSE 0
          END AS checked_in,
          DATE_FORMAT(a.checked_in_at, '%Y-%m-%d %H:%i:%s')
            AS checked_in_at,
          a.checkin_method

        FROM course_class_sessions s

        LEFT JOIN course_class_attendances a
          ON a.session_id = s.id
          AND a.registration_id = ?

        WHERE s.class_id = ?

        ORDER BY
          s.session_no ASC,
          s.session_date ASC,
          s.start_time ASC,
          s.id ASC
      `,
      [registrationId, openingId],
    );

    return rows.map((item) => ({
      session_id: Number(item.session_id),
      session_no:
        item.session_no === null ? null : Number(item.session_no),
      session_date: item.session_date,
      start_time: item.start_time,
      end_time: item.end_time,
      location: item.location,
      room: item.room,
      note: item.note,
      checked_in: Boolean(Number(item.checked_in)),
      checked_in_at: item.checked_in_at,
      checkin_method: item.checkin_method,
    }));
  }
}

module.exports = CourseReportModel;
