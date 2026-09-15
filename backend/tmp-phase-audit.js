const db = require("./config/db");

async function values(column) {
  const allowed = new Set(["project_field", "startup_stage", "program_selection_status", "has_project"]);
  if (!allowed.has(column)) throw new Error("Unsupported column");
  const [rows] = await db.query(`
    SELECT
      CASE WHEN ${column} IS NULL THEN '__NULL__'
           WHEN TRIM(CAST(${column} AS CHAR)) = '' THEN '__EMPTY__'
           ELSE TRIM(CAST(${column} AS CHAR)) END AS value,
      COUNT(*) AS count
    FROM registrations r
    INNER JOIN course_classes cc ON cc.id = r.class_id
    INNER JOIN courses c ON c.id = cc.course_id
    WHERE r.register_status IN ('PENDING', 'CONFIRMED')
      AND r.user_id IS NOT NULL
      AND cc.deleted_at IS NULL
      AND c.deleted_at IS NULL
    GROUP BY value
    ORDER BY count DESC, value
  `);
  return rows;
}

async function main() {
  const [evidence] = await db.query(`
    SELECT
      CASE
        WHEN r.project_field IS NULL OR TRIM(r.project_field) = '' THEN '__MISSING__'
        ELSE TRIM(r.project_field)
      END AS project_field,
      CASE WHEN r.has_project IS NULL THEN '__NULL__' ELSE CAST(r.has_project AS CHAR) END AS has_project,
      COUNT(*) AS count
    FROM registrations r
    INNER JOIN course_classes cc ON cc.id = r.class_id
    INNER JOIN courses c ON c.id = cc.course_id
    WHERE r.register_status IN ('PENDING', 'CONFIRMED')
      AND r.user_id IS NOT NULL
      AND cc.deleted_at IS NULL
      AND c.deleted_at IS NULL
    GROUP BY project_field, has_project
    ORDER BY count DESC
  `);
  const [topUsers] = await db.query(`
    SELECT r.user_id, u.fullname, u.email, u.phone,
           COUNT(*) AS registration_rows,
           COUNT(DISTINCT r.id) AS distinct_registration_ids,
           COUNT(DISTINCT r.class_id) AS distinct_openings,
           COUNT(DISTINCT c.id) AS distinct_courses,
           COUNT(DISTINCT tp.id) AS distinct_programs
    FROM registrations r
    INNER JOIN users u ON u.id = r.user_id
    INNER JOIN course_classes cc ON cc.id = r.class_id
    INNER JOIN courses c ON c.id = cc.course_id
    INNER JOIN training_programs tp ON tp.id = c.program_id
    GROUP BY r.user_id, u.fullname, u.email, u.phone
    ORDER BY registration_rows DESC
    LIMIT 10
  `);
  const tested = topUsers[0];
  const [groups] = await db.query(`
    SELECT c.id AS course_id, c.course_name, cc.id AS opening_id,
           COALESCE(NULLIF(TRIM(cc.intake_name), ''), NULLIF(TRIM(cc.class_name), ''), CONCAT('Đợt #', cc.id)) AS opening_name,
           COUNT(*) AS registrations,
           MIN(r.created_at) AS earliest_created_at,
           MAX(r.created_at) AS latest_created_at
    FROM registrations r
    INNER JOIN course_classes cc ON cc.id = r.class_id
    INNER JOIN courses c ON c.id = cc.course_id
    WHERE r.user_id = ?
    GROUP BY c.id, c.course_name, cc.id, opening_name
    ORDER BY registrations DESC, cc.id
  `, [tested.user_id]);
  const [provenance] = await db.query(`
    SELECT COUNT(*) AS provenance_rows,
           COUNT(DISTINCT gie.registration_id) AS registration_ids,
           COUNT(DISTINCT CONCAT_WS('|', gie.source_file, gie.source_sheet, gie.source_row)) AS source_rows
    FROM google_form_import_extras gie
    INNER JOIN registrations r ON r.id = gie.registration_id
    WHERE r.user_id = ?
  `, [tested.user_id]);
  const [duplicateGroups] = await db.query(`
    SELECT class_id, COUNT(*) AS registrations,
           GROUP_CONCAT(id ORDER BY id) AS registration_ids,
           MIN(created_at) AS earliest_created_at,
           MAX(created_at) AS latest_created_at
    FROM registrations
    WHERE user_id = ?
    GROUP BY class_id
    HAVING COUNT(*) > 1
    ORDER BY registrations DESC
  `, [tested.user_id]);
  const [allDuplicateGroups] = await db.query(`
    SELECT COUNT(*) AS duplicate_groups, COALESCE(SUM(registrations - 1), 0) AS excess_rows
    FROM (
      SELECT user_id, class_id, COUNT(*) AS registrations
      FROM registrations
      GROUP BY user_id, class_id
      HAVING COUNT(*) > 1
    ) duplicate_registration_groups
  `);
  const [schemaRows] = await db.query(`SHOW COLUMNS FROM users LIKE 'user_type'`);
  const [projectFieldSchemaRows] = await db.query(`SHOW COLUMNS FROM registrations LIKE 'project_field'`);
  console.log(JSON.stringify({
    project_field: await values("project_field"),
    has_project: await values("has_project"),
    project_evidence: evidence,
    startup_stage: await values("startup_stage"),
    nq20: await values("program_selection_status"),
    top_users: topUsers,
    history_user: tested,
    history_groups: groups,
    history_provenance: provenance[0],
    duplicate_opening_groups: duplicateGroups,
    all_duplicate_opening_groups: allDuplicateGroups[0],
    user_type_schema: schemaRows[0],
    project_field_schema: projectFieldSchemaRows[0],
  }, null, 2));
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
