const { after, test } = require("node:test");
const assert = require("node:assert/strict");

const db = require("../config/db");
const CourseModel = require("../models/courseModel");
const TrainingClassModel = require("../models/trainingClassModel");
const MissionModel = require("../models/missionModel");
const CourseController = require("./courseController");
const TrainingClassController = require("./trainingClassController");

const parsers = [
  CourseController._test.parseMissionId,
  TrainingClassController._test.parseMissionId,
];
const validators = [
  CourseController._test.validateMissionAssignment,
  TrainingClassController._test.validateMissionAssignment,
];

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

test("mission_id parsing covers omitted, unlink, numeric and malformed values", () => {
  for (const parse of parsers) {
    assert.deepEqual(parse({}), { provided: false, value: null });
    assert.deepEqual(parse({ mission_id: null }), { provided: true, value: null });
    assert.deepEqual(parse({ mission_id: "  " }), { provided: true, value: null });
    assert.deepEqual(parse({ mission_id: "12" }), { provided: true, value: 12 });
    assert.deepEqual(parse({ mission_id: 12 }), { provided: true, value: 12 });
    for (const value of [0, -1, 1.5, "1.5", "abc", {}, [], true]) {
      assert.match(parse({ mission_id: value }).error, /mission_id/);
    }
    assert.match(parse({ mission_source: "A" }).error, /mission_source/);
  }
});

test("assignment accepts ACTIVE Mission and rejects missing or INACTIVE Mission", async () => {
  await withMethod(
    MissionModel,
    "findById",
    async (id) => {
      if (id === 1) return { id, mission_source: "A", status: "ACTIVE" };
      if (id === 2) return { id, mission_source: "B", status: "INACTIVE" };
      return null;
    },
    async () => {
      for (const validate of validators) {
        assert.equal(await validate({ provided: true, value: 1 }), null);
        assert.equal(
          (await validate({ provided: true, value: 99 })).code,
          "INVALID_MISSION_ID",
        );
        assert.equal(
          (await validate({ provided: true, value: 2 })).code,
          "INACTIVE_MISSION",
        );
      }
    },
  );
});

test("same linked INACTIVE Mission is preserved without revalidation", async () => {
  await withMethod(
    MissionModel,
    "findById",
    async () => {
      throw new Error("same mission must not be looked up for ACTIVE status");
    },
    async () => {
      for (const validate of validators) {
        assert.equal(
          await validate({ provided: true, value: 7 }, 7),
          null,
        );
      }
    },
  );
});

test("ACTIVE reassignment is allowed regardless of A or B source", async () => {
  await withMethod(
    MissionModel,
    "findById",
    async (id) => ({ id, mission_source: "B", status: "ACTIVE" }),
    async () => {
      for (const validate of validators) {
        assert.equal(
          await validate({ provided: true, value: 8 }, 7),
          null,
        );
      }
    },
  );
});

test("CourseModel update preserves omitted mission_id and unlinks explicit null", async () => {
  const calls = [];
  await withMethod(
    db,
    "query",
    async (sql, params) => {
      calls.push({ sql, params });
      return [{ affectedRows: 1 }];
    },
    async () => {
      const base = {
        program_id: 1,
        course_name: "Course",
        status: "OPEN",
      };
      await CourseModel.update(10, {
        ...base,
        mission_id_provided: false,
        mission_id: null,
      });
      await CourseModel.update(10, {
        ...base,
        mission_id_provided: true,
        mission_id: null,
      });
    },
  );

  assert.match(calls[0].sql, /mission_id = IF\(\?, \?, mission_id\)/);
  assert.equal(calls[0].params.at(-4), 0);
  assert.equal(calls[0].params.at(-3), null);
  assert.equal(calls[1].params.at(-4), 1);
  assert.equal(calls[1].params.at(-3), null);
});

test("Training update preserves legacy mission and canonical mission when omitted", async () => {
  let captured;
  await withMethod(
    db,
    "query",
    async (sql, params) => {
      captured = { sql, params };
      return [{ affectedRows: 1 }];
    },
    async () => {
      await TrainingClassModel.updateCourse(10, {
        training_course_id: 1,
        class_name: "Course",
        status: "OPEN",
        mission_provided: false,
        mission: null,
        mission_id_provided: false,
        mission_id: null,
      });
    },
  );

  assert.match(captured.sql, /mission = IF\(\?, \?, mission\)/);
  assert.match(captured.sql, /mission_id = IF\(\?, \?, mission_id\)/);
  assert.equal(captured.params.at(-6), 0);
  assert.equal(captured.params.at(-5), null);
  assert.equal(captured.params.at(-4), 0);
  assert.equal(captured.params.at(-3), null);
  assert.doesNotMatch(captured.sql, /course_classes/);
});

test("Training create writes canonical FK only on courses and keeps legacy input separate", async () => {
  let captured;
  const connection = {
    async query(sql, params) {
      captured = { sql, params };
      return [{ insertId: 15 }];
    },
  };
  const id = await TrainingClassModel.createCourse(connection, {
    training_course_id: 1,
    class_name: "Course",
    slug: "course",
    mission: "Legacy unchanged contract",
    mission_id: 8,
    status: "OPEN",
  });

  assert.equal(id, 15);
  assert.match(captured.sql, /INSERT INTO courses/);
  assert.match(captured.sql, /mission,\s+mission_id,/);
  assert.doesNotMatch(captured.sql, /course_classes/);
  assert.equal(captured.params.at(-3), "Legacy unchanged contract");
  assert.equal(captured.params.at(-2), 8);
});

test("Course response retains legacy mission and adds canonical_mission", async () => {
  await withMethod(
    db,
    "query",
    async () => [[{
      id: 10,
      mission: "Legacy text",
      mission_id: 8,
      canonical_mission_name: "Canonical",
      canonical_mission_source: "B",
      canonical_mission_status: "ACTIVE",
      total_classes: 0,
    }]],
    async () => {
      const course = await CourseModel.getById(10);
      assert.equal(course.mission, "Legacy text");
      assert.equal(course.mission_id, 8);
      assert.deepEqual(course.canonical_mission, {
        id: 8,
        mission_name: "Canonical",
        mission_source: "B",
        status: "ACTIVE",
      });
    },
  );
});
