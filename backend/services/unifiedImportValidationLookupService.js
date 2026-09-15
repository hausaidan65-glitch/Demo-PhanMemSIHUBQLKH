const db = require("../config/db");

function placeholders(values) {
  return values.map(() => "?").join(",");
}
function sourceKey(source = {}) {
  return `${source.fileIndex}:${source.sheetIndex}`;
}

async function query(database, scope, sql, params, lookupErrors) {
  try {
    const [rows] = await database.query(sql, params);
    return rows;
  } catch (error) {
    lookupErrors.push({
      code: "LOOKUP_ERROR",
      scope,
      message: error.message || "DB lookup failed",
    });
    return [];
  }
}

async function validateTarget(database, sheet, lookupErrors) {
  const key = sourceKey(sheet.source);
  const fail = (reason) => ({ key, valid: false, reason });
  if (sheet.module === "TRAINING") {
    const { trainingProgramId, courseId, openingId } = sheet.target || {};

    if (!trainingProgramId || !courseId || !openingId) {
      return fail("TARGET_REQUIRED");
    }

    const rows = await query(
      database,
      `TARGET:${key}`,
      `
      SELECT tp.year
      FROM training_programs tp
      INNER JOIN courses c
        ON c.program_id = tp.id
      INNER JOIN course_classes cc
        ON cc.course_id = c.id
    WHERE tp.id = ?
  AND c.id = ?
  AND cc.id = ?
  AND c.deleted_at IS NULL
  AND cc.deleted_at IS NULL
LIMIT 1
    `,
      [trainingProgramId, courseId, openingId],
      lookupErrors,
    );

    if (lookupErrors.some((item) => item.scope === `TARGET:${key}`)) {
      return fail("TARGET_LOOKUP_ERROR");
    }

    return rows[0]
      ? {
          key,
          valid: true,
          year: Number(rows[0].year) || null,
        }
      : fail("TARGET_HIERARCHY_INVALID");
  }
  if (sheet.module === "INCUBATION") {
    if (!sheet.target?.programId) return fail("TARGET_REQUIRED");
    const rows = await query(
      database,
      `TARGET:${key}`,
      "SELECT id FROM incubation_programs WHERE id = ? LIMIT 1",
      [sheet.target.programId],
      lookupErrors,
    );
    if (lookupErrors.some((item) => item.scope === `TARGET:${key}`))
      return fail("TARGET_LOOKUP_ERROR");
    return rows[0] ? { key, valid: true } : fail("TARGET_MODULE_INVALID");
  }
  if (!["SEMINAR", "EXHIBITION", "NETWORKING"].includes(sheet.module))
    return fail("MODULE_REQUIRED");
  if (!sheet.target?.eventId) return fail("TARGET_REQUIRED");
  const networking = sheet.module === "NETWORKING";
  const sql = networking
    ? "SELECT id FROM networking_events WHERE id = ? LIMIT 1"
    : "SELECT id FROM startup_connection_events WHERE id = ? AND event_type = ? LIMIT 1";
  const params = networking
    ? [sheet.target.eventId]
    : [sheet.target.eventId, sheet.module];
  const rows = await query(
    database,
    `TARGET:${key}`,
    sql,
    params,
    lookupErrors,
  );
  if (lookupErrors.some((item) => item.scope === `TARGET:${key}`))
    return fail("TARGET_LOOKUP_ERROR");
  return rows[0] ? { key, valid: true } : fail("TARGET_MODULE_INVALID");
}

async function loadSnapshot(sheets = [], database = db) {
  const lookupErrors = [];
  const emails = new Set();
  const phones = new Set();
  const openingIds = new Set();
  const eventIds = new Set();
  const networkingIds = new Set();
  const programIds = new Set();
  sheets.forEach((sheet) => {
    if (sheet.target?.openingId) openingIds.add(Number(sheet.target.openingId));
    if (sheet.target?.eventId)
      (sheet.module === "NETWORKING" ? networkingIds : eventIds).add(
        Number(sheet.target.eventId),
      );
    if (sheet.target?.programId) programIds.add(Number(sheet.target.programId));
    (sheet.rows || []).forEach((row) =>
      (sheet.mapping || []).forEach((map) => {
        const value = String(row.rawCells?.[map.columnIndex] ?? "").trim();
        if (["email", "contact_email"].includes(map.field) && value)
          emails.add(value.toLowerCase());
        if (["phone", "contact_phone"].includes(map.field) && value)
          phones.add(value.replace(/\D/g, ""));
      }),
    );
  });
  const targetChecks = {};
  for (const sheet of sheets) {
    const check = await validateTarget(database, sheet, lookupErrors);
    targetChecks[check.key] = check;
  }
  const conditions = [];
  const identityParams = [];
  if (emails.size) {
    conditions.push(`LOWER(email) IN (${placeholders([...emails])})`);
    identityParams.push(...emails);
  }
  if (phones.size) {
    conditions.push(
      `REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '.', '') IN (${placeholders([...phones])})`,
    );
    identityParams.push(...phones);
  }
  const users = conditions.length
    ? await query(
        database,
        "PARTICIPANT_IDENTITY",
        `SELECT id, fullname, phone, email FROM users WHERE ${conditions.join(" OR ")}`,
        identityParams,
        lookupErrors,
      )
    : [];
  const userIds = users.map((user) => Number(user.id));
  const registrations = [];
  const registrationLookups = [
    [openingIds, "TRAINING_REGISTRATION", "registrations", "class_id"],
    [
      eventIds,
      "STARTUP_EVENT_PARTICIPANT",
      "startup_connection_participants",
      "event_id",
    ],
    [
      networkingIds,
      "NETWORKING_PARTICIPANT",
      "networking_event_participants",
      "event_id",
    ],
  ];
  for (const [targetIds, scope, table, column] of registrationLookups) {
    if (!userIds.length || !targetIds.size) continue;
    const rows = await query(
      database,
      scope,
      `SELECT user_id, ${column} AS target_id FROM ${table} WHERE user_id IN (${placeholders(userIds)}) AND ${column} IN (${placeholders([...targetIds])})`,
      [...userIds, ...targetIds],
      lookupErrors,
    );
    registrations.push(...rows);
  }
  const profiles =
    emails.size && programIds.size
      ? await query(
          database,
          "INCUBATION_PROFILE",
          `SELECT incubation_program_id AS program_id, project_name, contact_email AS email FROM incubation_profiles WHERE incubation_program_id IN (${placeholders([...programIds])}) AND LOWER(contact_email) IN (${placeholders([...emails])})`,
          [...programIds, ...emails],
          lookupErrors,
        )
      : [];
  return { users, registrations, profiles, targetChecks, lookupErrors };
}

module.exports = { loadSnapshot, validateTarget, sourceKey };
