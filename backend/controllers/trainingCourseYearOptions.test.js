const { after, test } = require("node:test");
const assert = require("node:assert/strict");

const db = require("../config/db");
const TrainingCourseModel = require("../models/trainingCourseModel");
const TrainingCourseController = require("./trainingCourseController");

async function withMethod(target, name, replacement, callback) {
  const original = target[name];
  target[name] = replacement;
  try {
    return await callback();
  } finally {
    target[name] = original;
  }
}

after(async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  await db.end();
});

test("distinct years use only non-null training_programs.year newest first", async () => {
  let capturedSql = "";
  await withMethod(db, "query", async (sql) => {
    capturedSql = sql;
    return [[{ year: 2026 }, { year: 2025 }]];
  }, async () => {
    assert.deepEqual(await TrainingCourseModel.getDistinctYears(), [2026, 2025]);
  });

  assert.match(capturedSql, /SELECT DISTINCT year/);
  assert.match(capturedSql, /FROM training_programs/);
  assert.match(capturedSql, /year IS NOT NULL/);
  assert.match(capturedSql, /ORDER BY year DESC/);
  assert.doesNotMatch(capturedSql, /courses|course_classes/);
});

test("years endpoint returns model values without adding defaults", async () => {
  await withMethod(TrainingCourseModel, "getDistinctYears", async () => [2026, 2024], async () => {
    let payload;
    const res = {
      statusCode: null,
      status(code) { this.statusCode = code; return this; },
      json(value) { payload = value; return value; },
    };

    await TrainingCourseController.years({}, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(payload, { success: true, data: [2026, 2024] });
  });
});
