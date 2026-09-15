const XLSX = require("xlsx");
const registry = require("../config/importPreviewFieldRegistry");
const { normalizeText, decodeFilename } = require("./excelImportHelpers");

const MODULE_LABELS = {
  TRAINING: "Đào tạo",
  SEMINAR: "Hội thảo",
  EXHIBITION: "Triển lãm",
  NETWORKING: "Sự kiện kết nối",
  INCUBATION: "Ươm tạo",
};
const DATE_PATTERN = /(?:^|\D)(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\D|$)/;
const YEAR_PATTERN = /\b(20\d{2})\b/g;
const MODULE_SCORE_THRESHOLD = 28;
const MODULE_SCORE_MARGIN = 12;
const COMMON_FIELDS = new Set([
  "fullname",
  "phone",
  "email",
  "organization",
  "position",
  "gender",
  "age_group",
  "participant_group",
]);

function text(value) {
  return String(value ?? "").trim();
}
function normalized(value) {
  return normalizeText(text(value))
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
function containsNormalizedPhrase(haystack, needle) {
  return Boolean(needle) && ` ${haystack} `.includes(` ${needle} `);
}
function dateKey(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const raw = text(value);
  const iso = raw.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const local = raw.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})\b/);
  if (!local) return null;
  return `${local[3]}-${String(local[2]).padStart(2, "0")}-${String(local[1]).padStart(2, "0")}`;
}
function collectDateKeys(rows) {
  return [...new Set(rows.flat().map(dateKey).filter(Boolean))];
}
function parseTrainingMetadata(rows, header) {
  const metadataRows = rows.slice(0, Math.max(header.rowIndex, 0));
  const lines = metadataRows
    .map((row) => row.map(text).filter(Boolean).join(" ").trim())
    .filter(Boolean);
  const programLine = lines.find((line) =>
    /chương trình\s+huấn luyện/i.test(line),
  );
  const courseLine = lines.find((line) =>
    /danh sách\s+lớp/i.test(line),
  );
  const courseMatch = courseLine?.match(
    /danh sách\s+(lớp\s*\d+)\s*[-–—:]\s*(.+)$/i,
  );
  const timeLine = lines.find((line) => /^thời gian\s*:/i.test(line));
  const yearMatch = timeLine?.match(/\b(20\d{2})\b/);
  const sharedDate = timeLine?.match(
    /(\d{1,2})\s*(?:&|và)\s*(\d{1,2})[\/-](\d{1,2})[\/-](20\d{2})/i,
  );
  const dates = sharedDate
    ? [sharedDate[1], sharedDate[2]].map(
        (day) =>
          `${sharedDate[4]}-${String(sharedDate[3]).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      )
    : metadataRows.flat().map(dateKey).filter(Boolean);

  return {
    programName: programLine || null,
    courseName: courseMatch?.[2]?.trim() || null,
    openingName: courseMatch?.[1]
      ? courseMatch[1].replace(/\s+/g, " ").trim()
      : null,
    year: yearMatch ? Number(yearMatch[1]) : null,
    organizationStartDate: dates[0] || null,
    organizationEndDate: dates.at(-1) || null,
    evidenceRows: lines.slice(0, 3),
  };
}

function mergeMetadataTargets(
  scored,
  items,
  targetType,
  metadataName,
  metadataDates = [],
  allowContains = false,
) {
  if (!metadataName) return scored;
  const wanted = normalized(metadataName);
  const additions = (items || [])
    .filter((item) => {
      const candidate = normalized(item.name);
      return allowContains
        ? containsNormalizedPhrase(wanted, candidate) ||
            containsNormalizedPhrase(candidate, wanted)
        : candidate === wanted;
    })
    .map((item) => {
      const targetDates = [dateKey(item.start_date), dateKey(item.end_date)].filter(
        Boolean,
      );
      const dateMatch = targetDates.some((value) =>
        metadataDates.includes(value),
      );
      return {
        targetType,
        id: item.id,
        name: item.name,
        year: Number(item.year) || null,
        score: 100 + (dateMatch ? 35 : 0),
        parentId: item.mission_id || item.program_id || item.course_id || null,
        evidence: [
          `METADATA_${targetType.toUpperCase()}_MATCH`,
          dateMatch && "DB_DATE_MATCH",
        ].filter(Boolean),
      };
    });
  const merged = new Map(scored.map((item) => [Number(item.id), item]));
  additions.forEach((item) => {
    const current = merged.get(Number(item.id));
    if (!current || item.score > current.score) merged.set(Number(item.id), item);
  });
  return [...merged.values()].sort((a, b) => b.score - a.score);
}
function nonEmptyCount(row) {
  return (row || []).filter((cell) => text(cell)).length;
}

function mapHeader(row, moduleCode) {
  const aliases = registry[moduleCode].aliases;
  const mappings = (row || []).map((cell, columnIndex) => {
    const header = text(cell);
    const value = normalized(header);
    let field = null;
    let matchScore = 0;
    for (const [key, choices] of Object.entries(aliases)) {
      for (const alias of choices) {
        const score =
          value === alias
            ? 10000 + alias.length
            : alias.length >= 6 && value.includes(alias)
              ? 1000 + alias.length
              : 0;
        if (score > matchScore) {
          field = key;
          matchScore = score;
        }
      }
    }
    return { columnIndex, header, field, matchScore };
  });

  const winnerByField = new Map();
  mappings.forEach((mapping) => {
    if (!mapping.field) return;
    const winner = winnerByField.get(mapping.field);
    if (!winner || mapping.matchScore > winner.matchScore) {
      winnerByField.set(mapping.field, mapping);
    }
  });

  return mappings.map(({ matchScore, ...mapping }) => ({
    ...mapping,
    field:
      mapping.field && winnerByField.get(mapping.field)?.columnIndex === mapping.columnIndex
        ? mapping.field
        : null,
  }));
}

function detectHeader(rows) {
  let best = { rowIndex: -1, score: 0, moduleCode: null, columns: [] };
  rows.slice(0, 50).forEach((row, rowIndex) => {
    if (nonEmptyCount(row) < 2) return;
    Object.keys(registry).forEach((moduleCode) => {
      const columns = mapHeader(row, moduleCode);
      const matched = columns.filter((item) => item.field);
      const unique = new Set(matched.map((item) => item.field));
      const identityHit = registry[moduleCode].identity.some((key) =>
        unique.has(key),
      );
      const score =
        unique.size * 10 +
        (identityHit ? 15 : 0) +
        Math.min(nonEmptyCount(row), 10);
      if (score > best.score) best = { rowIndex, score, moduleCode, columns };
    });
  });
  return best.score >= 25
    ? best
    : { rowIndex: -1, score: 0, moduleCode: null, columns: [] };
}

function moduleDbItems(moduleCode, catalog) {
  if (moduleCode === "TRAINING") {
    return [
      ...(catalog.programs || []),
      ...(catalog.courses || []),
      ...(catalog.openings || []),
    ];
  }
  if (["SEMINAR", "EXHIBITION"].includes(moduleCode))
    return (catalog.startupEvents || []).filter(
      (item) => item.type === moduleCode,
    );
  if (moduleCode === "NETWORKING") return catalog.networkingEvents || [];
  return catalog.incubationPrograms || [];
}

function moduleSuggestions(rows, header, fileName, sheetName, catalog = {}) {
  const contentStart = header.rowIndex < 0 ? 0 : header.rowIndex;
  const content = normalized(
    rows
      .slice(contentStart, contentStart + 35)
      .flat()
      .join(" "),
  );
  const metadata = normalized(
    rows.slice(0, Math.max(header.rowIndex, 0)).flat().join(" "),
  );
  const normalizedSheetName = normalized(sheetName);
  const normalizedFileName = normalized(fileName);
  const rules = {
    TRAINING: [
      "khoa dao tao",
      "khoa huan luyen",
      "lop hoc",
      "hoc vien",
      "thuoc chuong trinh",
      "training",
    ],
    SEMINAR: ["hoi thao", "seminar"],
    EXHIBITION: ["trien lam", "exhibition", "gian hang"],
    NETWORKING: ["su kien ket noi", "networking", "ket noi doanh nghiep"],
    INCUBATION: [
      "chuong trinh uom tao",
      "ho so uom tao",
      "doanh thu 3 nam",
      "von da huy dong",
      "bang sang che",
    ],
  };
  return Object.keys(registry)
    .map((moduleCode) => {
      const evidence = [];
      const mappedColumns =
        header.rowIndex < 0
          ? []
          : mapHeader(rows[header.rowIndex], moduleCode).filter(
              (item) => item.field,
            );
      const matchedFields = new Set(mappedColumns.map((item) => item.field));
      const commonCount = [...matchedFields].filter((key) =>
        COMMON_FIELDS.has(key),
      ).length;
      const specificCount = matchedFields.size - commonCount;
      let score = Math.min(commonCount * 2, 12) + specificCount * 8;
      if (score)
        evidence.push({
          source: "CONTENT_HEADER",
          detail: `${commonCount} cột chung, ${specificCount} cột đặc thù khớp registry/alias`,
          weight: score,
        });
      rules[moduleCode].forEach((token) => {
        if (content.includes(token)) {
          score += 24;
          evidence.push({
            source: "CONTENT_HEADER",
            detail: `Nội dung có “${token}”`,
            weight: 24,
          });
        } else if (metadata.includes(token)) {
          score += 24;
          evidence.push({
            source: "SHEET_METADATA",
            detail: `Metadata có “${token}”`,
            weight: 24,
          });
        } else if (normalizedSheetName.includes(token)) {
          score += 3;
          evidence.push({
            source: "SHEET_NAME",
            detail: `Tên sheet có “${token}”`,
            weight: 3,
          });
        } else if (normalizedFileName.includes(token)) {
          score += 1;
          evidence.push({
            source: "FILE_NAME",
            detail: `Tên file có “${token}”`,
            weight: 1,
          });
        }
      });
      if (
        moduleCode === "SEMINAR" &&
        normalizedSheetName.split(" ").includes("ht")
      ) {
        score += 3;
        evidence.push({
          source: "SHEET_NAME",
          detail: "Tên sheet có ký hiệu HT",
          weight: 3,
        });
      }
      const dbMatch = moduleDbItems(moduleCode, catalog).find(
        (item) =>
          normalized(item.name) &&
          normalized(`${metadata} ${content}`).includes(normalized(item.name)),
      );
      if (dbMatch) {
        score += 10;
        evidence.push({
          source: "DB_TARGET",
          detail: `Khớp target “${dbMatch.name}”`,
          weight: 10,
        });
      }
      return {
        module: moduleCode,
        label: MODULE_LABELS[moduleCode],
        score,
        evidence,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
}

function decideModule(suggestions) {
  const top1 = suggestions[0] || null;
  const top2 = suggestions[1] || null;
  const margin = top1 ? top1.score - (top2?.score || 0) : 0;
  const selected =
    top1 &&
    top1.score >= MODULE_SCORE_THRESHOLD &&
    margin >= MODULE_SCORE_MARGIN
      ? top1.module
      : null;
  return {
    selected,
    requiresAdminSelection: !selected,
    top1: top1 ? { module: top1.module, score: top1.score } : null,
    top2: top2 ? { module: top2.module, score: top2.score } : null,
    margin,
    threshold: {
      minimumScore: MODULE_SCORE_THRESHOLD,
      minimumMargin: MODULE_SCORE_MARGIN,
    },
    candidates: suggestions,
  };
}

function parseDateEvidence(rows) {
  const years = new Set();
  let validDates = 0;
  let invalidDates = 0;
  rows.forEach((row) =>
    row.forEach((value) => {
      if (value instanceof Date && !Number.isNaN(value.getTime())) {
        years.add(value.getFullYear());
        validDates += 1;
        return;
      }
      const raw = text(value);
      let match;
      YEAR_PATTERN.lastIndex = 0;
      while ((match = YEAR_PATTERN.exec(raw))) years.add(Number(match[1]));
      const dateMatch = raw.match(DATE_PATTERN);
      if (dateMatch) {
        const day = Number(dateMatch[1]);
        const month = Number(dateMatch[2]);
        const year = Number(dateMatch[3]);
        const date = new Date(Date.UTC(year, month - 1, day));
        if (
          date.getUTCFullYear() === year &&
          date.getUTCMonth() === month - 1 &&
          date.getUTCDate() === day
        )
          validDates += 1;
        else invalidDates += 1;
      }
    }),
  );
  const foundYears = [...years]
    .filter((year) => year >= 2000 && year <= 2100)
    .sort();
  let status = "UNDATED";
  if (foundYears.length > 1) status = "MIXED";
  else if (invalidDates && !validDates) status = "INVALID";
  else if (invalidDates || (foundYears.length === 1 && !validDates))
    status = "PARTIAL";
  else if (foundYears.length === 1 && validDates) status = "SAFE";
  return {
    status,
    years: foundYears,
    validDateCount: validDates,
    invalidDateCount: invalidDates,
  };
}

function isFooter(row) {
  const value = normalized((row || []).join(" "));
  return /^(tong|tong cong|ghi chu|nguoi lap|xac nhan|danh sach co)/.test(
    value,
  );
}

function analyzeRows(rows, header, moduleCode, source) {
  if (header.rowIndex < 0)
    return {
      rows: [],
      sampleRows: [],
      summary: { valid: 0, skipped: 0, review: 0 },
    };
  const mappings = mapHeader(rows[header.rowIndex], moduleCode);
  const analyzed = [];
  rows.slice(header.rowIndex + 1).forEach((row, offset) => {
    const rowNumber = header.rowIndex + offset + 2;
    if (!nonEmptyCount(row)) return;
    const values = {};
    mappings.forEach(({ columnIndex, header: label, field }) => {
      if (field) values[field] = row[columnIndex] ?? "";
      else if (label)
        values[`extra_${columnIndex + 1}`] = row[columnIndex] ?? "";
    });
    const identity = registry[moduleCode].identity
      .map((key) => text(values[key]))
      .filter(Boolean);
    let status = "VALID";
    const reasons = [];
    if (isFooter(row)) {
      status = "SKIPPED";
      reasons.push("FOOTER_OR_SUMMARY");
    } else if (!identity.length) {
      status = "SKIPPED";
      reasons.push("MISSING_PRIMARY_IDENTITY");
    } else if (
      moduleCode !== "INCUBATION" &&
      !text(values.phone) &&
      !text(values.email)
    ) {
      status = "REVIEW";
      reasons.push("MISSING_CONTACT_IDENTITY");
    }
    analyzed.push({
      source: { ...source, rowNumber },
      status,
      reasons,
      values,
      rawCells: [...row],
    });
  });
  const summary = {
    valid: analyzed.filter((row) => row.status === "VALID").length,
    skipped: analyzed.filter((row) => row.status === "SKIPPED").length,
    review: analyzed.filter((row) => row.status === "REVIEW").length,
  };
  return { rows: analyzed, sampleRows: analyzed.slice(0, 5), summary };
}

function scoredTargets(items, targetType, sheetText, years, sourceDateKeys = []) {
  const normalizedSheetText = normalized(sheetText);
  return (items || [])
    .map((item) => {
      const name = normalized(item.name);
      const nameMatch = containsNormalizedPhrase(normalizedSheetText, name);
      let score = nameMatch ? 50 : 0;
      const targetYear = Number(item.year || text(item.start_date).slice(0, 4));
      if (years.includes(targetYear)) score += 20;
      const targetDates = [dateKey(item.start_date), dateKey(item.end_date)].filter(
        Boolean,
      );
      const dateMatch =
        nameMatch && targetDates.some((value) => sourceDateKeys.includes(value));
      if (dateMatch) score += 35;
      return {
        targetType,
        id: item.id,
        name: item.name,
        year: Number.isFinite(targetYear) && targetYear > 0 ? targetYear : null,
        score,
        parentId: item.mission_id || item.program_id || item.course_id || null,
        evidence: [
          nameMatch && "DB_NAME_MATCH",
          dateMatch && "DB_DATE_MATCH",
          years.includes(targetYear) && "DB_YEAR_MATCH",
        ].filter(Boolean),
      };
    })
    .filter((item) => item.score)
    .sort((a, b) => b.score - a.score);
}

function uniqueBest(items) {
  if (!items.length) return null;
  if (items.length === 1) return items[0];
  return Number(items[0].score) - Number(items[1].score) >= 20
    ? items[0]
    : null;
}
function hasNameEvidence(item) {
  return item.evidence.some(
    (value) => value === "DB_NAME_MATCH" || value.startsWith("METADATA_"),
  );
}

function resolveTrainingSelection(
  trainingPrograms,
  courses,
  openings,
  catalog,
) {
  const namedPrograms = trainingPrograms.filter(hasNameEvidence);
  let program = uniqueBest(namedPrograms);
  const programScope = program
    ? new Set([Number(program.id)])
    : new Set(trainingPrograms.map((item) => Number(item.id)));
  const namedCourses = courses.filter(
    (item) =>
      hasNameEvidence(item) &&
      (!programScope.size || programScope.has(Number(item.parentId))),
  );
  let course = uniqueBest(namedCourses);

  if (course) {
    program = trainingPrograms.find(
      (item) => Number(item.id) === Number(course.parentId),
    ) || (catalog.programs || []).find(
      (item) => Number(item.id) === Number(course.parentId),
    );
  }

  const scopedCourseIds = new Set(
    course
      ? [Number(course.id)]
      : program
        ? (catalog.courses || [])
            .filter((item) => Number(item.program_id) === Number(program.id))
            .map((item) => Number(item.id))
        : [],
  );
  const namedOpenings = openings.filter(
    (item) =>
      hasNameEvidence(item) &&
      (!scopedCourseIds.size || scopedCourseIds.has(Number(item.parentId))),
  );
  const opening = uniqueBest(namedOpenings);

  if (opening && !course) {
    const catalogCourse = (catalog.courses || []).find(
      (item) => Number(item.id) === Number(opening.parentId),
    );
    course = catalogCourse
      ? {
          targetType: "course",
          id: catalogCourse.id,
          name: catalogCourse.name,
          year: null,
          score: opening.score,
          parentId: catalogCourse.program_id,
          evidence: ["DB_RELATION_MATCH"],
        }
      : null;
    program = course
      ? trainingPrograms.find(
          (item) => Number(item.id) === Number(course.parentId),
        ) ||
        (catalog.programs || []).find(
          (item) => Number(item.id) === Number(course.parentId),
        )
      : program;
  }

  const relationCertain = Boolean(program && course);
  const programCertain = Boolean(program);
  return {
    trainingProgramId: programCertain ? program.id : null,
    courseId: relationCertain ? course.id : null,
    openingId: relationCertain && opening ? opening.id : null,
    confidence: relationCertain
      ? "CERTAIN_DB_RELATION"
      : programCertain
        ? "CERTAIN_DB_PROGRAM"
        : "AMBIGUOUS",
    requiresAdminSelection: !relationCertain,
    missingOpening: relationCertain && !opening,
    evidence: programCertain
      ? [
          relationCertain
            ? "DB_COURSE_PROGRAM_RELATION"
            : "DB_PROGRAM_METADATA_MATCH",
          relationCertain &&
            (opening ? "DB_OPENING_COURSE_RELATION" : "DB_OPENING_MISSING"),
        ]
          .filter(Boolean)
      : [],
  };
}

function targetSuggestions(
  moduleCode,
  sheetText,
  years,
  catalog = {},
  sourceDateKeys = [],
  trainingMetadata = null,
) {
  if (moduleCode === "TRAINING") {
    let trainingPrograms = scoredTargets(
      catalog.programs,
      "trainingProgram",
      sheetText,
      years,
      sourceDateKeys,
    );
    trainingPrograms = mergeMetadataTargets(
      trainingPrograms,
      catalog.programs,
      "trainingProgram",
      trainingMetadata?.programName,
      sourceDateKeys,
      true,
    );
    if (trainingMetadata?.year) {
      trainingPrograms = trainingPrograms
        .map((item) =>
          Number(item.year) === Number(trainingMetadata.year)
            ? {
                ...item,
                score: item.score + 20,
                evidence: [...new Set([...item.evidence, "METADATA_YEAR_MATCH"])],
              }
            : item,
        )
        .sort((a, b) => b.score - a.score);
    }
    const namedTrainingPrograms = trainingPrograms.filter(hasNameEvidence);

    if (namedTrainingPrograms.length) {
      trainingPrograms = namedTrainingPrograms;
    }
    let courses = scoredTargets(
      catalog.courses,
      "course",
      sheetText,
      years,
      sourceDateKeys,
    );
    courses = mergeMetadataTargets(
      courses,
      catalog.courses,
      "course",
      trainingMetadata?.courseName,
    );

    let openings = scoredTargets(
      catalog.openings,
      "opening",
      sheetText,
      years,
      sourceDateKeys,
    );
    openings = mergeMetadataTargets(
      openings,
      catalog.openings,
      "opening",
      trainingMetadata?.openingName,
      sourceDateKeys,
    );

    if (trainingPrograms.length) {
      courses = courses.filter(
        (item) =>
          !item.parentId ||
          trainingPrograms.some(
            (program) => Number(program.id) === Number(item.parentId),
          ),
      );
    }

    if (courses.length) {
      openings = openings.filter(
        (item) =>
          !item.parentId ||
          courses.some((course) => Number(course.id) === Number(item.parentId)),
      );
    }

    const selection = resolveTrainingSelection(
      trainingPrograms,
      courses,
      openings,
      catalog,
    );

    return {
      module: moduleCode,
      selection,
      hierarchy: {
        trainingPrograms: trainingPrograms.slice(0, 5),
        courses: courses.slice(0, 5),
        openings: openings.slice(0, 5),
      },
      flat: [...trainingPrograms, ...courses, ...openings].slice(0, 15),
    };
  }

  const items =
    moduleCode === "SEMINAR" || moduleCode === "EXHIBITION"
      ? (catalog.startupEvents || []).filter((item) => item.type === moduleCode)
      : moduleCode === "NETWORKING"
        ? catalog.networkingEvents
        : catalog.incubationPrograms;

  const flat = scoredTargets(
    items,
    moduleCode === "INCUBATION" ? "program" : "event",
    sheetText,
    years,
  ).slice(0, 10);

  return {
    module: moduleCode,
    hierarchy: null,
    flat,
  };
}

function previewWorkbook(file, fileIndex, catalog = {}) {
  const fileName = decodeFilename(
    file.originalname || `file-${fileIndex + 1}.xlsx`,
  );
  const signature = file.buffer?.subarray(0, 4).toString("hex");
  if (!signature?.startsWith("504b") && signature !== "d0cf11e0")
    throw new Error("Nội dung không phải workbook Excel hợp lệ.");
  const workbook = XLSX.read(file.buffer, {
    type: "buffer",
    cellDates: true,
    raw: true,
  });
  const sheets = workbook.SheetNames.map((sheetName, sheetIndex) => {
    const source = { fileIndex, fileName, sheetIndex, sheetName };
    try {
      const worksheet = workbook.Sheets[sheetName];
      const rows = worksheet
        ? XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: "",
            blankrows: true,
            raw: true,
          })
        : [];
      const header = detectHeader(rows);
      const suggestions = moduleSuggestions(
        rows,
        header,
        fileName,
        sheetName,
        catalog,
      );
      const decision = decideModule(suggestions);
      let moduleCode = decision.selected;
      const initialAnalysisModule = moduleCode || header.moduleCode;
      const year = parseDateEvidence(rows);
      const trainingMetadata = parseTrainingMetadata(rows, header);
      if (initialAnalysisModule === "TRAINING" && trainingMetadata.year) {
        year.metadataYear = trainingMetadata.year;
        year.metadataEvidence = "TRAINING_SOURCE_METADATA";
      }
      const hasContent = rows.some((row) => nonEmptyCount(row) > 0);
      const analysis = initialAnalysisModule
        ? analyzeRows(rows, header, initialAnalysisModule, source)
        : {
            rows: [],
            sampleRows: [],
            summary: { valid: 0, skipped: 0, review: hasContent ? 1 : 0 },
          };
      const columns =
        header.rowIndex < 0
          ? []
          : header.columns.map((item) => ({
              index: item.columnIndex + 1,
              columnIndex: item.columnIndex,
              name: item.header,
              mappedField: item.field,
              mappingConfidence: item.field ? "ALIAS" : "UNKNOWN",
              evidence: item.field ? "REGISTRY_ALIAS" : "NO_ALIAS_MATCH",
              sampleValue:
                analysis.rows.find((row) =>
                  text(row.rawCells[item.columnIndex]),
                )?.rawCells[item.columnIndex] ?? "",
            }));
      const targets = initialAnalysisModule
        ? targetSuggestions(
            initialAnalysisModule,
            rows.slice(0, 35).flat().join(" "),
              year.years,
              catalog,
              collectDateKeys(rows),
              trainingMetadata,
            )
        : { module: null, hierarchy: null, flat: [] };
      if (
        !moduleCode &&
        initialAnalysisModule === "TRAINING" &&
        targets.selection?.confidence?.startsWith("CERTAIN_DB_")
      ) {
        moduleCode = "TRAINING";
        decision.selected = "TRAINING";
        decision.requiresAdminSelection = false;
        decision.evidence = ["CERTAIN_DB_TARGET_RELATION"];
      }
      return {
        source,
        sheetName,
        status: "READY",
        error: null,
        empty: !hasContent,
        header: {
          rowNumber: header.rowIndex < 0 ? null : header.rowIndex + 1,
          columns,
        },
        headerRow: header.rowIndex < 0 ? null : header.rowIndex + 1,
        totalDataRows: analysis.rows.length,
        sampleRows: analysis.sampleRows,
        rows: analysis.rows,
        summary: analysis.summary,
        moduleSuggestion: decision,
        targetSuggestions: targets,
        trainingMetadata,
        year,
      };
    } catch (error) {
      return {
        source,
        sheetName,
        status: "ERROR",
        error: { code: "SHEET_READ_ERROR", message: error.message },
        empty: false,
        header: { rowNumber: null, columns: [] },
        headerRow: null,
        totalDataRows: 0,
        sampleRows: [],
        rows: [],
        summary: { valid: 0, skipped: 0, review: 0 },
        moduleSuggestion: decideModule([]),
        targetSuggestions: { module: null, hierarchy: null, flat: [] },
        year: {
          status: "UNDATED",
          years: [],
          validDateCount: 0,
          invalidDateCount: 0,
        },
      };
    }
  });
  return {
    fileIndex,
    fileName,
    status: sheets.some((sheet) => sheet.status === "ERROR")
      ? "PARTIAL"
      : "READY",
    error: null,
    sheetCount: sheets.length,
    sheets,
  };
}

async function previewFiles(files, catalog = {}) {
  const result = files.map((file, fileIndex) => {
    const fileName = decodeFilename(
      file.originalname || `file-${fileIndex + 1}.xlsx`,
    );
    if (fileName.startsWith("~$"))
      return {
        fileIndex,
        fileName,
        status: "SKIPPED",
        error: {
          code: "TEMPORARY_EXCEL_FILE",
          message: "Bỏ qua file tạm của Excel.",
        },
        sheetCount: 0,
        sheets: [],
      };
    try {
      return previewWorkbook(file, fileIndex, catalog);
    } catch (error) {
      return {
        fileIndex,
        fileName,
        status: "ERROR",
        error: { code: "FILE_READ_ERROR", message: error.message },
        sheetCount: 0,
        sheets: [],
      };
    }
  });
  const allSheets = result.flatMap((file) => file.sheets);
  const summary = {
    totalFiles: result.length,
    totalSheets: allSheets.length,
    totalRows: allSheets.reduce((sum, sheet) => sum + sheet.totalDataRows, 0),
    valid: allSheets.reduce((sum, sheet) => sum + sheet.summary.valid, 0),
    skipped: allSheets.reduce((sum, sheet) => sum + sheet.summary.skipped, 0),
    review: allSheets.reduce((sum, sheet) => sum + sheet.summary.review, 0),
    errors:
      result.filter((file) => file.status === "ERROR").length +
      allSheets.filter((sheet) => sheet.status === "ERROR").length,
  };
  return {
    mode: "PREVIEW_ONLY",
    canCommit: false,
    ...summary,
    summary,
    files: result,
  };
}

module.exports = {
  previewFiles,
  previewWorkbook,
  detectHeader,
  parseDateEvidence,
  moduleSuggestions,
  decideModule,
  targetSuggestions,
  MODULE_SCORE_THRESHOLD,
  MODULE_SCORE_MARGIN,
};
