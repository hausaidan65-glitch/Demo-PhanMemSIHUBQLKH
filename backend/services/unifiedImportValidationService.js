const registry = require("../config/importPreviewFieldRegistry");
const { normalizeText } = require("./excelImportHelpers");

const STATUSES = [
  "VALID",
  "SKIPPED_BLANK_IDENTITY",
  "SKIPPED_DUPLICATE",
  "DUPLICATE",
  "CONFLICT",
  "NEEDS_REVIEW",
  "ERROR",
];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUS_PRIORITY = {
  VALID: 0,
  NEEDS_REVIEW: 1,
  SKIPPED_DUPLICATE: 2,
  DUPLICATE: 3,
  ERROR: 4,
  CONFLICT: 5,
};

function clean(value) {
  return String(value ?? "").trim();
}
function email(value) {
  return clean(value).toLowerCase();
}
function phone(value) {
  const digits = clean(value).replace(/\D/g, "");
  return digits.startsWith("84") ? `0${digits.slice(2)}` : digits;
}
function truthy(value) {
  return ["1", "true", "yes", "co", "có", "x"].includes(
    clean(value).toLowerCase(),
  );
}
function promote(current, next) {
  return STATUS_PRIORITY[next] > STATUS_PRIORITY[current] ? next : current;
}
function footer(values) {
  return /^(tong|tong cong|ghi chu|nguoi lap|xac nhan)/.test(
    normalizeText(Object.values(values).join(" ")),
  );
}
function sheetKey(source = {}) {
  return `${source.fileIndex}:${source.sheetIndex}`;
}

function relevantLookupErrors(sheet, snapshot) {
  const key = sheetKey(sheet.source);
  const scopes =
    sheet.module === "INCUBATION"
      ? [`TARGET:${key}`, "INCUBATION_PROFILE"]
      : [
          `TARGET:${key}`,
          "PARTICIPANT_IDENTITY",
          sheet.module === "TRAINING"
            ? "TRAINING_REGISTRATION"
            : sheet.module === "NETWORKING"
              ? "NETWORKING_PARTICIPANT"
              : "STARTUP_EVENT_PARTICIPANT",
        ];
  return (snapshot.lookupErrors || []).filter((item) =>
    scopes.includes(item.scope),
  );
}

function validateMapping(sheet) {
  if (!registry[sheet.module])
    return {
      valid: false,
      errors: [{ code: "MODULE_REQUIRED" }],
      warnings: [],
    };
  const allowed = new Set(Object.keys(registry[sheet.module]?.aliases || {}));
  const seen = new Set();
  const errors = [];
  const warnings = [];
  (sheet.mapping || []).forEach((item) => {
    if (["__IGNORE__", "__EXTRA__"].includes(item.field)) return;
    if (!item.field) {
      warnings.push({
        code: "UNKNOWN_COLUMN_UNRESOLVED",
        columnIndex: item.columnIndex,
      });
      return;
    }
    if (!allowed.has(item.field))
      errors.push({ code: "FIELD_NOT_ALLOWED_FOR_MODULE", field: item.field });
    if (seen.has(item.field))
      errors.push({ code: "DUPLICATE_CANONICAL_MAPPING", field: item.field });
    seen.add(item.field);
  });
  const required =
    sheet.module === "INCUBATION"
      ? ["project_name", "contact_fullname"]
      : ["fullname"];
  required.forEach((field) => {
    if (!seen.has(field))
      errors.push({ code: "REQUIRED_MAPPING_MISSING", field });
  });
  return { valid: errors.length === 0, errors, warnings };
}

function mapRow(row, mapping) {
  const values = {};
  const extras = {};
  mapping.forEach((item) => {
    if (item.field === "__IGNORE__" || !item.field) return;
    if (item.field === "__EXTRA__")
      extras[item.header || `column_${item.columnIndex + 1}`] =
        row.rawCells?.[item.columnIndex] ?? "";
    else values[item.field] = row.rawCells?.[item.columnIndex] ?? "";
  });
  return { values, extras };
}

function identityFor(module, values) {
  if (module === "INCUBATION")
    return clean(values.project_name) || clean(values.contact_fullname);
  return clean(values.fullname);
}

function duplicateKey(module, target, values) {
  const targetId =
    target?.openingId || target?.eventId || target?.programId || "NO_TARGET";
  if (module === "INCUBATION")
    return `${module}|${targetId}|${email(values.contact_email) || normalizeText(clean(values.project_name))}`;
  return `${module}|${targetId}|${email(values.email) || phone(values.phone) || normalizeText(clean(values.fullname))}`;
}

function moduleErrors(module, values) {
  const errors = [];
  const review = [];
  if (module === "TRAINING") {
    if (!phone(values.phone) && !email(values.email))
      errors.push("STUDENT_CONTACT_REQUIRED");

    if (values.email && !EMAIL.test(email(values.email)))
      errors.push("EMAIL_INVALID");

    if (truthy(values.has_project) && !clean(values.project_name))
      errors.push("PROJECT_NAME_REQUIRED_WHEN_HAS_PROJECT");
  } else if (["SEMINAR", "NETWORKING"].includes(module)) {
    if (!phone(values.phone) && !email(values.email))
      errors.push("PARTICIPANT_CONTACT_REQUIRED");
    if (values.email && !EMAIL.test(email(values.email)))
      errors.push("EMAIL_INVALID");
  } else if (module === "EXHIBITION") {
    const survey = [
      "visitor_count",
      "exhibition_product_name",
      "organizer_feedback",
      "highlight_impression",
    ].some((field) => clean(values[field]));
    if (!survey && !phone(values.phone) && !email(values.email))
      errors.push("PARTICIPANT_CONTACT_REQUIRED");
    if (survey && !clean(values.exhibition_product_name))
      review.push("SURVEY_PRODUCT_NAME_MISSING");
  } else if (module === "INCUBATION") {
    if (!clean(values.project_name)) errors.push("PROJECT_NAME_REQUIRED");
    if (!clean(values.contact_fullname))
      errors.push("CONTACT_FULLNAME_REQUIRED");
    if (values.contact_email && !EMAIL.test(email(values.contact_email)))
      errors.push("EMAIL_INVALID");
    if (
      clean(values.contact_position) === "OTHER" &&
      !clean(values.contact_position_other)
    )
      errors.push("CONTACT_POSITION_OTHER_REQUIRED");
    if (
      truthy(values.has_raised_fund) &&
      !clean(values.raised_amount) &&
      !clean(values.fundraising_stage)
    )
      review.push("FUNDRAISING_DETAIL_REQUIRED");
    if (
      truthy(values.has_intellectual_property) &&
      !clean(values.intellectual_property_detail)
    )
      review.push("INTELLECTUAL_PROPERTY_DETAIL_REQUIRED");
  }
  return { errors, review };
}

function dbFinding(module, target, values, snapshot = {}) {
  if (module === "INCUBATION") {
    const match = (snapshot.profiles || []).find(
      (item) =>
        Number(item.program_id) === Number(target?.programId) &&
        email(item.email) &&
        email(item.email) === email(values.contact_email),
    );
    if (!match) return null;
    return normalizeText(match.project_name) ===
      normalizeText(values.project_name)
      ? { status: "DUPLICATE", reason: "EXISTING_DB_PROFILE" }
      : { status: "CONFLICT", reason: "DB_PROFILE_IDENTITY_CONFLICT" };
  }
  const byEmail = (snapshot.users || []).find(
    (item) => email(item.email) && email(item.email) === email(values.email),
  );

  const byPhone = (snapshot.users || []).find(
    (item) => phone(item.phone) && phone(item.phone) === phone(values.phone),
  );

  /*
   * Giữ cùng semantics với UnifiedImportTrainingAdapter:
   * email + phone trỏ hai user khác nhau.
   */
  if (byEmail && byPhone && Number(byEmail.id) !== Number(byPhone.id)) {
    return {
      status: "CONFLICT",
      reason: "DB_EMAIL_PHONE_CONFLICT",
    };
  }

  /*
   * Legacy STUDENT_PHONE_CONFLICT:
   * không match email, nhưng phone đã thuộc user khác
   * và email nguồn không giống email đang lưu.
   */
  if (
    !byEmail &&
    byPhone &&
    email(values.email) &&
    email(byPhone.email) &&
    email(byPhone.email) !== email(values.email)
  ) {
    return {
      status: "CONFLICT",
      reason: "DB_PHONE_EMAIL_CONFLICT",
    };
  }

  /*
   * Legacy STUDENT_NAME_CONFLICT:
   * CHỈ khi cả email + phone cùng match đúng một user
   * nhưng fullname khác.
   */
  if (
    byEmail &&
    byPhone &&
    Number(byEmail.id) === Number(byPhone.id) &&
    byEmail.fullname &&
    normalizeText(byEmail.fullname) !== normalizeText(values.fullname)
  ) {
    return {
      status: "CONFLICT",
      reason: "DB_NAME_CONFLICT",
    };
  }

  const user = byEmail || byPhone;

  if (
    user &&
    (snapshot.registrations || []).some(
      (item) =>
        Number(item.user_id) === Number(user.id) &&
        Number(item.target_id) === Number(target?.openingId || target?.eventId),
    )
  ) {
    return {
      status: "DUPLICATE",
      reason: "EXISTING_DB_TARGET_REGISTRATION",
    };
  }

  return null;
}

async function validateBatch(payload, dbSnapshot = {}) {
  const globalSeen = new Map();
  const sheets = [];
  for (const sheet of payload.sheets || []) {
    try {
      const mappingValidation = validateMapping(sheet);
      const targetMissing =
        sheet.module === "TRAINING"
          ? !sheet.target?.trainingProgramId ||
            !sheet.target?.courseId ||
            !sheet.target?.openingId
          : sheet.module === "INCUBATION"
            ? !sheet.target?.programId
            : !sheet.target?.eventId;
      const targetCheck = dbSnapshot.targetChecks?.[sheetKey(sheet.source)];
      const targetInvalidReason = targetMissing
        ? "TARGET_REQUIRED"
        : targetCheck && !targetCheck.valid
          ? targetCheck.reason
          : null;
      if (targetInvalidReason)
        mappingValidation.errors.push({ code: targetInvalidReason });
      mappingValidation.valid = mappingValidation.errors.length === 0;
      const lookupErrors = relevantLookupErrors(sheet, dbSnapshot);
      const participantIdentityLookupFailed = lookupErrors.some(
        (item) => item.scope === "PARTICIPANT_IDENTITY",
      );

      const localSeen = new Map();
      const rows = [];
      const metadataYear = Number(sheet.year?.metadataYear) || null;
      const dbTargetYear = Number(targetCheck?.year) || null;
      const auditedMetadataYear =
        metadataYear && dbTargetYear && metadataYear === dbTargetYear
          ? metadataYear
          : null;
      for (const row of sheet.rows || []) {
        const mapped = mapRow(row, sheet.mapping || []);
        const identity = identityFor(sheet.module, mapped.values);
        let status = "VALID";
        const reasons = [];
        if (!identity || footer(mapped.values)) {
          status = "SKIPPED_BLANK_IDENTITY";
          reasons.push(
            !identity ? "PRIMARY_IDENTITY_MISSING" : "FOOTER_OR_SUMMARY",
          );
        } else if (!mappingValidation.valid) {
          status = "ERROR";
          reasons.push("SHEET_MAPPING_INVALID");
          if (lookupErrors.length) reasons.push("LOOKUP_ERROR");
        } else {
          const rules = moduleErrors(sheet.module, mapped.values);
          if (rules.errors.length) {
            status = promote(status, "ERROR");
            reasons.push(...rules.errors);
          } else if (rules.review.length || mappingValidation.warnings.length) {
            status = promote(status, "NEEDS_REVIEW");
            reasons.push(
              ...rules.review,
              ...mappingValidation.warnings.map((item) => item.code),
            );
          }
          /*
           * Giữ đúng semantics import Training cũ:
           *
           * - Học viên cũ đã tồn tại theo email:
           *   có thể không có phone.
           *
           * - Học viên mới:
           *   users.phone là bắt buộc nên phải chặn.
           *
           * Nếu lookup identity lỗi thì không kết luận đây là user mới,
           * để logic LOOKUP_ERROR phía dưới xử lý fail-closed.
           */
          if (
            sheet.module === "TRAINING" &&
            !phone(mapped.values.phone) &&
            email(mapped.values.email) &&
            !participantIdentityLookupFailed
          ) {
            const existedByEmail = (dbSnapshot.users || []).some(
              (item) =>
                email(item.email) &&
                email(item.email) === email(mapped.values.email),
            );

            if (!existedByEmail) {
              status = promote(status, "ERROR");
              reasons.push("STUDENT_PHONE_REQUIRED");
            }
          }
          const key = duplicateKey(sheet.module, sheet.target, mapped.values);
          if (localSeen.has(key)) {
            status = promote(status, "SKIPPED_DUPLICATE");
            reasons.push("DUPLICATE_IN_SHEET");
          } else if (globalSeen.has(key)) {
            status = promote(status, "DUPLICATE");
            reasons.push("DUPLICATE_IN_BATCH");
          } else {
            localSeen.set(key, row.source);
            globalSeen.set(key, row.source);
          }
          const finding = dbFinding(
            sheet.module,
            sheet.target,
            mapped.values,
            dbSnapshot,
          );
          if (finding) {
            status = promote(status, finding.status);
            reasons.push(finding.reason);
          }
          if (
            !auditedMetadataYear &&
            ["MIXED", "INVALID"].includes(sheet.year?.status)
          ) {
            status = promote(status, "NEEDS_REVIEW");
            reasons.push(`YEAR_${sheet.year.status}`);
          }
          const targetYear = dbTargetYear || Number(sheet.target?.year);
          const sourceYears = auditedMetadataYear
            ? [auditedMetadataYear]
            : sheet.year?.years || [];
          if (
            targetYear &&
            sourceYears.length === 1 &&
            targetYear !== sourceYears[0]
          ) {
            status = "CONFLICT";
            reasons.push("TARGET_YEAR_CONFLICT");
          }
          if (lookupErrors.length) {
            status = promote(status, "NEEDS_REVIEW");
            reasons.push(...lookupErrors.map(() => "LOOKUP_ERROR"));
          }
        }
        rows.push({
          source: row.source,
          status,
          reasons: [...new Set(reasons)],
          values: mapped.values,
          extras: mapped.extras,
        });
      }

      console.log("VALIDATION SHEET CHECK", {
        source: sheet.source,
        inputRows: (sheet.rows || []).length,
        validatedRows: rows.length,
        valid: rows.filter((row) => row?.status === "VALID").length,
        conflict: rows.filter((row) => row?.status === "CONFLICT").length,
        error: rows.filter((row) => row?.status === "ERROR").length,
      });

      sheets.push({
        source: sheet.source,
        status: "VALIDATED",
        validationReady: mappingValidation.valid && !lookupErrors.length,
        commitReady: false,
        module: sheet.module,
        target: sheet.target,
        mappingValidation,
        lookupErrors,
        year: sheet.year,
        rows,
      });
    } catch (error) {
      console.error("UNIFIED SHEET VALIDATION ERROR:", {
        source: sheet?.source,
        module: sheet?.module,
        message: error?.message,
        stack: error?.stack,
      });

      sheets.push({
        source: sheet?.source,
        status: "ERROR",
        error: {
          code: "SHEET_VALIDATION_ERROR",
          message: error?.message || "Không thể validate sheet.",
        },
        rows: [],
      });
    }
  }
  const allRows = sheets.flatMap((sheet) =>
    Array.isArray(sheet?.rows) ? sheet.rows.filter(Boolean) : [],
  );

  const summary = Object.fromEntries(
    STATUSES.map((status) => [
      status,
      allRows.filter((row) => row?.status === status).length,
    ]),
  );
  return {
    mode: "VALIDATE_ONLY",
    canCommit: false,
    totalSheets: sheets.length,
    totalRows: allRows.length,
    summary,
    lookupErrorCount: (dbSnapshot.lookupErrors || []).length,
    sheets,
  };
}

module.exports = {
  validateBatch,
  validateMapping,
  mapRow,
  moduleErrors,
  STATUSES,
};
