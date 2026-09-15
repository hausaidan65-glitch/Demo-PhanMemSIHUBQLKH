const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const { PassThrough } = require("node:stream");
const ExcelJS = require("exceljs");

const db = require("../config/db");
const TrainingCourseModel = require("../models/trainingCourseModel");
const TrainingProgramModel = require("../models/trainingProgramModel");
const TrainingCourseController = require("./trainingCourseController");
const { parseTrainingProgramYear } = require("../utils/trainingProgramYear");

async function withDbQuery(replacement, callback) {
  const original = db.query;
  db.query = replacement;
  try {
    return await callback();
  } finally {
    db.query = original;
  }
}

function responseStub() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

after(async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  await db.end();
});

test("year parser distinguishes omitted, clear, valid and invalid values", () => {
  assert.deepEqual(parseTrainingProgramYear({}), { provided: false, value: null });
  assert.deepEqual(parseTrainingProgramYear({ year: null }), { provided: true, value: null });
  assert.deepEqual(parseTrainingProgramYear({ year: "" }), { provided: true, value: null });
  assert.deepEqual(parseTrainingProgramYear({ year: "  " }), { provided: true, value: null });
  assert.deepEqual(parseTrainingProgramYear({ year: "2026" }), { provided: true, value: 2026 });
  assert.deepEqual(parseTrainingProgramYear({ year: 2000 }), { provided: true, value: 2000 });
  assert.deepEqual(parseTrainingProgramYear({ year: 2100 }), { provided: true, value: 2100 });

  for (const value of [1999, 2101, 2026.5, "2026.5", "bad", {}, [], true]) {
    assert.ok(parseTrainingProgramYear({ year: value }).error);
  }
});

test("training-courses list filters directly on training_programs.year", async () => {
  let captured;
  await withDbQuery(async (sql, params) => {
    captured = { sql, params };
    return [[]];
  }, () => TrainingCourseModel.getAll({ year: 2026 }));

  assert.match(captured.sql, /tp\.year = \?/);
  assert.deepEqual(captured.params, [2026]);
});

test("training-course create persists nullable year without changing Mission placement", async () => {
  const calls = [];
  await withDbQuery(async (sql, params) => {
    calls.push({ sql, params });
    return [{ insertId: 12 }];
  }, async () => {
    await TrainingCourseModel.create({
      training_course_name: "Khóa",
      year: null,
      mission_id: 8,
      status: "ACTIVE",
    });
    await TrainingCourseModel.create({
      training_course_name: "Khóa 2026",
      year: 2026,
      mission_id: 8,
      status: "ACTIVE",
    });
  });

  assert.match(calls[0].sql, /INSERT INTO training_programs/);
  assert.doesNotMatch(calls[0].sql, /INSERT INTO courses|course_classes/);
  assert.equal(calls[0].params[2], null);
  assert.equal(calls[0].params[3], 8);
  assert.equal(calls[1].params[2], 2026);
  assert.equal(calls[1].params[3], 8);
});

test("training-course update preserves omitted year and clears explicit empty/null year", async () => {
  const calls = [];
  await withDbQuery(async (sql, params) => {
    calls.push({ sql, params });
    return [{ affectedRows: 1 }];
  }, async () => {
    const base = {
      training_course_name: "Khóa",
      mission_id_provided: false,
      mission_id: null,
      status: "ACTIVE",
    };
    await TrainingCourseModel.update(1, {
      ...base,
      year_provided: false,
      year: null,
    });
    await TrainingCourseModel.update(1, {
      ...base,
      year_provided: true,
      year: null,
    });
  });

  assert.match(calls[0].sql, /year = IF\(\?, \?, year\)/);
  assert.deepEqual(calls[0].params.slice(2, 4), [0, null]);
  assert.deepEqual(calls[1].params.slice(2, 4), [1, null]);
  assert.deepEqual(calls[0].params.slice(4, 6), [0, null]);
});

test("invalid list year returns 400 before querying", async () => {
  const original = TrainingCourseModel.getAll;
  TrainingCourseModel.getAll = async () => assert.fail("model must not be called");
  try {
    const res = responseStub();
    await TrainingCourseController.index({ query: { year: "1999" } }, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /2000.*2100/);
  } finally {
    TrainingCourseModel.getAll = original;
  }
});

test("training-course export applies year filter and includes Năm", async () => {
  const original = TrainingCourseModel.getExportData;
  let receivedQuery;
  TrainingCourseModel.getExportData = async (query) => {
    receivedQuery = query;
    return [{
      training_course_name: "Khóa 2026",
      year: 2026,
      status: "ACTIVE",
      total_course_groups: 0,
      total_classes: 0,
    }];
  };

  const chunks = [];
  const res = new PassThrough();
  res.setHeader = () => undefined;
  res.on("data", (chunk) => chunks.push(chunk));

  try {
    await TrainingCourseController.exportExcel({ query: { year: "2026" } }, res);
    assert.equal(receivedQuery.year, 2026);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.concat(chunks));
    const sheet = workbook.worksheets[0];
    assert.equal(sheet.getRow(1).values.includes("Năm"), true);
    assert.equal(sheet.getRow(2).getCell(3).value, 2026);
  } finally {
    TrainingCourseModel.getExportData = original;
  }
});

test("legacy training-program model returns, filters and saves year with same semantics", async () => {
  const calls = [];
  await withDbQuery(async (sql, params) => {
    calls.push({ sql, params });
    if (/SELECT/.test(sql)) return [[{ id: 1, year: "2026", total_courses: 0, total_classes: 0 }]];
    return [{ affectedRows: 1, insertId: 1 }];
  }, async () => {
    const rows = await TrainingProgramModel.getAll({ year: 2026 });
    assert.equal(rows[0].year, 2026);
    await TrainingProgramModel.create({ program_name: "Khóa", year: null });
    await TrainingProgramModel.update(1, {
      program_name: "Khóa",
      year_provided: false,
      year: null,
    });
  });

  assert.match(calls[0].sql, /tp\.year = \?/);
  assert.deepEqual(calls[0].params, [2026]);
  assert.equal(calls[1].params[2], null);
  assert.match(calls[2].sql, /year = IF\(\?, \?, year\)/);
  assert.deepEqual(calls[2].params.slice(2, 4), [0, null]);
});
