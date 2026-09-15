const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const db = require("../config/db");

const PROGRAM_ID = 19;
const APPLY = process.argv.includes("--apply");
const ROOT = path.resolve(__dirname, "../..");
const SOURCE_DIRS = [ROOT, path.join(ROOT, "backend", "uploads", "excel")];
const USER_FIELDS = ["age_group", "company", "position", "gender", "user_type"];
const REGISTRATION_FIELDS = [
  "project_field",
  "startup_stage",
  "program_selection_status",
  "support_needs",
];

function clean(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function comparable(value) {
  return clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEmail(value) {
  const result = clean(value).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result) ? result : "";
}

function normalizePhone(value) {
  let digits = clean(value).split(/[/,;|\n]+/).find(Boolean)?.replace(/\D/g, "") || "";
  if (digits.startsWith("84") && digits.length >= 10) digits = `0${digits.slice(2)}`;
  return digits;
}

function normalizeBoolean(value) {
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;
  const text = comparable(value);
  if (["co", "yes", "true", "x"].includes(text)
    || text.includes("da co y tuong") || text.includes("da co du an")) return true;
  if (["khong", "no", "false"].includes(text)
    || text.includes("chua co y tuong") || text.includes("chua co du an")) return false;
  return null;
}

function normalizeGender(value) {
  const text = comparable(value);
  if (["nam", "male", "m", "1"].includes(text)) return "MALE";
  if (["nu", "female", "f", "0"].includes(text)) return "FEMALE";
  if (["khac", "other"].includes(text)) return "OTHER";
  return null;
}

function normalizeUserType(value) {
  const text = comparable(value);
  if (!text) return null;
  if (text.includes("startup") || text.includes("khoi nghiep") || text.includes("du an")) return "STARTUP";
  if (text.includes("doanh nghiep") || text.includes("business") || text.includes("chu doanh nghiep")) return "BUSINESS";
  if (text.includes("sinh vien") || text.includes("hoc sinh") || text.includes("student")) return "STUDENT";
  if (text.includes("truong") || text.includes("giang vien") || text.includes("giao vien") || text.includes("university")) return "UNIVERSITY";
  return "OTHER";
}

function detectField(header) {
  const text = comparable(header);
  if (!text) return null;
  if (text.includes("email") || text.includes("e mail")) return "email";
  if (text.includes("so dien thoai") || text === "sdt" || text === "so dt" || text === "dien thoai") return "phone";
  if (text.includes("nhom tuoi") || text.includes("do tuoi")) return "age_group";
  if (text === "don vi" || text.includes("don vi cong tac") || text === "organization") return "company";
  if (text.includes("chuc vu") || text.includes("vi tri cong tac") || text === "position") return "position";
  if (text.includes("gioi tinh") || text === "gender") return "gender";
  if (text.includes("nhom doi tuong") || text.includes("doi tuong tham gia")) return "user_type";
  if (text.includes("nghi quyet 20") || text.includes("nq20") || text.includes("tuyen chon vao chuong trinh")) return "program_selection_status";
  if (text.includes("nhu cau ho tro") || text.includes("mong muon ho tro") || text.includes("can ho tro")) return "support_needs";
  if (text.includes("thuoc linh vuc") && (text.includes("du an") || text.includes("y tuong"))) return "project_field";
  if ((text.includes("giai doan") && (text.includes("du an") || text.includes("startup") || text.includes("khoi nghiep")))) return "startup_stage";
  if (text.includes("co du an") || text.includes("co y tuong")) return "has_project";
  return null;
}

function sourceFilename(filename) {
  return filename.replace(/^\d+-/, "");
}

function listSourceFiles() {
  const result = [];
  SOURCE_DIRS.forEach((directory) => {
    fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
      if (!entry.isFile() || !/\.xlsx?$/i.test(entry.name) || entry.name.startsWith("~$")) return;
      result.push(path.join(directory, entry.name));
    });
  });
  return [...new Set(result)];
}

function findHeader(rows) {
  for (let index = 0; index < Math.min(rows.length, 20); index += 1) {
    const mapping = new Map();
    rows[index].forEach((header, column) => {
      const field = detectField(header);
      if (field && !mapping.has(field)) mapping.set(field, column);
    });
    const analyticCount = [...mapping.keys()].filter((field) => (
      USER_FIELDS.includes(field) || REGISTRATION_FIELDS.includes(field) || field === "has_project"
    )).length;
    if ((mapping.has("email") || mapping.has("phone")) && analyticCount > 0) {
      return { rowIndex: index, mapping };
    }
  }
  return null;
}

function readSources() {
  const records = [];
  const files = [];
  listSourceFiles().forEach((filename) => {
    let workbook;
    try {
      workbook = XLSX.readFile(filename, { cellDates: false });
    } catch (error) {
      files.push({ filename, error: error.message });
      return;
    }
    workbook.SheetNames.forEach((sheetName) => {
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" });
      const header = findHeader(rows);
      if (!header) return;
      const mappedFields = [...header.mapping.keys()];
      files.push({ filename, sheetName, headerRow: header.rowIndex + 1, mappedFields });
      for (let rowIndex = header.rowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
        const row = rows[rowIndex];
        const value = (field) => row[header.mapping.get(field)];
        const email = header.mapping.has("email") ? normalizeEmail(value("email")) : "";
        const phone = header.mapping.has("phone") ? normalizePhone(value("phone")) : "";
        if (!email && !phone) continue;
        const data = {};
        USER_FIELDS.forEach((field) => {
          if (!header.mapping.has(field)) return;
          const raw = value(field);
          const normalized = field === "gender" ? normalizeGender(raw)
            : field === "user_type" ? normalizeUserType(raw) : clean(raw) || null;
          if (normalized !== null) data[field] = normalized;
        });
        REGISTRATION_FIELDS.forEach((field) => {
          if (header.mapping.has(field)) data[field] = clean(value(field)) || null;
        });
        if (header.mapping.has("has_project")) data.has_project = normalizeBoolean(value("has_project"));
        records.push({
          filePath: filename,
          sourceFile: sourceFilename(path.basename(filename)),
          sheetName,
          sourceRow: rowIndex + 1,
          email,
          phone,
          data,
        });
      }
    });
  });
  return { records, files };
}

function addIndex(map, key, record) {
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(record);
}

function distinctValues(records, field) {
  const values = new Map();
  records.forEach((record) => {
    const value = record.data[field];
    if (value === null || value === undefined || (typeof value === "string" && !clean(value))) return;
    const key = typeof value === "string" ? comparable(value) : String(value);
    if (!values.has(key)) values.set(key, value);
  });
  return [...values.values()];
}

async function loadTargets() {
  const [rows] = await db.query(
    `
      SELECT
        r.id AS registration_id, r.user_id, r.has_project,
        r.project_field, r.startup_stage, r.program_selection_status, r.support_needs,
        u.email, u.phone, u.age_group, u.company, u.position, u.gender, u.user_type,
        g.source_file, g.source_sheet, g.source_row
      FROM registrations r
      INNER JOIN course_classes cc ON cc.id = r.class_id AND cc.deleted_at IS NULL
      INNER JOIN courses c ON c.id = cc.course_id AND c.deleted_at IS NULL
      INNER JOIN users u ON u.id = r.user_id
      LEFT JOIN google_form_import_extras g ON g.registration_id = r.id
      WHERE c.program_id = ?
        AND r.register_status IN ('PENDING', 'CONFIRMED')
        AND r.user_id IS NOT NULL
      ORDER BY r.id
    `,
    [PROGRAM_ID],
  );
  return rows;
}

async function metrics(connection = db) {
  const [[row]] = await connection.query(
    `
      SELECT
        COUNT(DISTINCT CASE WHEN NULLIF(TRIM(u.age_group), '') IS NOT NULL THEN u.id END) age_group,
        COUNT(DISTINCT CASE WHEN NULLIF(TRIM(u.company), '') IS NOT NULL THEN u.id END) company,
        COUNT(DISTINCT CASE WHEN NULLIF(TRIM(u.position), '') IS NOT NULL THEN u.id END) position,
        COUNT(DISTINCT CASE WHEN NULLIF(TRIM(u.gender), '') IS NOT NULL THEN u.id END) gender,
        COUNT(DISTINCT CASE WHEN NULLIF(TRIM(u.user_type), '') IS NOT NULL THEN u.id END) user_type,
        COUNT(DISTINCT CASE WHEN NULLIF(TRIM(r.project_field), '') IS NOT NULL THEN r.id END) project_field,
        COUNT(DISTINCT CASE WHEN NULLIF(TRIM(r.startup_stage), '') IS NOT NULL THEN r.id END) startup_stage,
        COUNT(DISTINCT CASE WHEN NULLIF(TRIM(r.program_selection_status), '') IS NOT NULL THEN r.id END) program_selection_status,
        COUNT(DISTINCT CASE WHEN NULLIF(TRIM(r.support_needs), '') IS NOT NULL THEN r.id END) support_needs
      FROM registrations r
      INNER JOIN course_classes cc ON cc.id = r.class_id AND cc.deleted_at IS NULL
      INNER JOIN courses c ON c.id = cc.course_id AND c.deleted_at IS NULL
      INNER JOIN users u ON u.id = r.user_id
      WHERE c.program_id = ?
        AND r.register_status IN ('PENDING', 'CONFIRMED')
        AND r.user_id IS NOT NULL
    `,
    [PROGRAM_ID],
  );
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value)]));
}

function buildPlan(targets, sourceRecords) {
  const emailIndex = new Map();
  const phoneIndex = new Map();
  const provenanceIndex = new Map();
  sourceRecords.forEach((record) => {
    addIndex(emailIndex, record.email, record);
    addIndex(phoneIndex, record.phone, record);
    addIndex(provenanceIndex, `${record.sourceFile}|${record.sheetName}|${record.sourceRow}`, record);
  });

  const matches = new Map();
  const unmatched = [];
  targets.forEach((target) => {
    const provenanceKey = `${target.source_file || ""}|${target.source_sheet || ""}|${target.source_row || ""}`;
    let candidates = provenanceIndex.get(provenanceKey) || [];
    let method = candidates.length ? "PROVENANCE" : "";
    if (!candidates.length) {
      const email = normalizeEmail(target.email);
      candidates = email ? (emailIndex.get(email) || []) : [];
      if (candidates.length) method = "EMAIL";
    }
    if (!candidates.length) {
      const phone = normalizePhone(target.phone);
      candidates = phone ? (phoneIndex.get(phone) || []) : [];
      if (candidates.length) method = "PHONE";
    }
    if (!candidates.length) unmatched.push(target.registration_id);
    matches.set(target.registration_id, { candidates, method });
  });

  const ambiguous = [];
  const conflicts = [];
  const userPlans = new Map();
  const registrationPlans = new Map();
  const targetsByUser = new Map();
  targets.forEach((target) => {
    if (!targetsByUser.has(target.user_id)) targetsByUser.set(target.user_id, []);
    targetsByUser.get(target.user_id).push(target);
  });

  targetsByUser.forEach((userTargets, userId) => {
    const candidates = [...new Set(userTargets.flatMap((target) => matches.get(target.registration_id).candidates))];
    const current = userTargets[0];
    const changes = {};
    let isAmbiguous = false;
    USER_FIELDS.forEach((field) => {
      if (clean(current[field])) return;
      const values = distinctValues(candidates, field);
      if (values.length === 1) changes[field] = values[0];
      if (values.length > 1) {
        isAmbiguous = true;
        ambiguous.push({ scope: "USER", id: Number(userId), field, values });
      }
    });
    if (!isAmbiguous && Object.keys(changes).length) userPlans.set(Number(userId), changes);
  });

  targets.forEach((target) => {
    const candidates = matches.get(target.registration_id).candidates;
    const changes = {};
    let isAmbiguous = false;
    REGISTRATION_FIELDS.forEach((field) => {
      if (clean(target[field])) return;
      const values = distinctValues(candidates, field);
      if (values.length === 1) changes[field] = values[0];
      if (values.length > 1) {
        isAmbiguous = true;
        ambiguous.push({ scope: "REGISTRATION", id: target.registration_id, field, values });
      }
    });
    const projectEvidence = distinctValues(candidates, "project_field").length > 0
      || distinctValues(candidates, "startup_stage").length > 0
      || distinctValues(candidates, "has_project").includes(true);
    if (!Boolean(Number(target.has_project)) && projectEvidence) {
      conflicts.push({ registration_id: target.registration_id, user_id: target.user_id });
    }
    if (!isAmbiguous && Object.keys(changes).length) registrationPlans.set(target.registration_id, changes);
  });

  return { userPlans, registrationPlans, ambiguous, conflicts, unmatched, matches };
}

function plannedCounts(plan) {
  const counts = Object.fromEntries([...USER_FIELDS, ...REGISTRATION_FIELDS].map((field) => [field, 0]));
  plan.userPlans.forEach((changes) => Object.keys(changes).forEach((field) => { counts[field] += 1; }));
  plan.registrationPlans.forEach((changes) => Object.keys(changes).forEach((field) => { counts[field] += 1; }));
  return counts;
}

function plannedValueCounts(plan) {
  const result = Object.fromEntries([...USER_FIELDS, ...REGISTRATION_FIELDS].map((field) => [field, {}]));
  [...plan.userPlans.values(), ...plan.registrationPlans.values()].forEach((changes) => {
    Object.entries(changes).forEach(([field, value]) => {
      const label = String(value);
      result[field][label] = (result[field][label] || 0) + 1;
    });
  });
  return result;
}

async function applyPlan(plan) {
  const connection = await db.getConnection();
  const updated = Object.fromEntries([...USER_FIELDS, ...REGISTRATION_FIELDS].map((field) => [field, 0]));
  try {
    await connection.beginTransaction();
    for (const [userId, changes] of plan.userPlans) {
      for (const [field, value] of Object.entries(changes)) {
        const [result] = await connection.query(
          `UPDATE users SET ${field} = ? WHERE id = ? AND (${field} IS NULL OR TRIM(${field}) = '')`,
          [value, userId],
        );
        updated[field] += result.affectedRows;
      }
    }
    for (const [registrationId, changes] of plan.registrationPlans) {
      for (const [field, value] of Object.entries(changes)) {
        const [result] = await connection.query(
          `UPDATE registrations SET ${field} = ? WHERE id = ? AND (${field} IS NULL OR TRIM(${field}) = '')`,
          [value, registrationId],
        );
        updated[field] += result.affectedRows;
      }
    }
    await connection.commit();
    return updated;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function main() {
  const before = await metrics();
  const targets = await loadTargets();
  const { records, files } = readSources();
  const plan = buildPlan(targets, records);
  const matchMethods = {};
  plan.matches.forEach(({ candidates, method }) => {
    const key = candidates.length ? method : "UNMATCHED";
    matchMethods[key] = (matchMethods[key] || 0) + 1;
  });
  const preview = {
    mode: APPLY ? "APPLY" : "PREVIEW",
    program_id: PROGRAM_ID,
    target_registrations: targets.length,
    source_files_scanned: listSourceFiles().length,
    source_sheets_with_analytic_fields: files.filter((file) => !file.error).length,
    source_identity_rows: records.length,
    before,
    match_methods: matchMethods,
    planned_updates: plannedCounts(plan),
    planned_value_counts: plannedValueCounts(plan),
    unmatched: plan.unmatched.length,
    ambiguous: plan.ambiguous.length,
    ambiguous_entities: new Set(plan.ambiguous.map((item) => `${item.scope}:${item.id}`)).size,
    has_project_conflict: plan.conflicts.length,
    overwritten_existing: 0,
  };
  console.log(JSON.stringify(preview, null, 2));

  if (!APPLY) return;
  const updated = await applyPlan(plan);
  const after = await metrics();
  const report = {
    ...preview,
    updated,
    after,
    ambiguous_rows: plan.ambiguous,
    has_project_conflicts: plan.conflicts,
    unmatched_registration_ids: plan.unmatched,
  };
  const reportDir = path.join(ROOT, "backend", "backfill-reports");
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `program-${PROGRAM_ID}-analytics-backfill.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ updated, after, report: reportPath }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
