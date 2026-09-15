const { after, test } = require("node:test");
const assert = require("node:assert/strict");

const db = require("../config/db");
const MissionModel = require("../models/missionModel");
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

test("mission_id parser accepts omission, unlink and positive numeric values", () => {
  const parse = TrainingCourseController._test.parseMissionId;
  assert.deepEqual(parse({}), { provided: false, value: null });
  assert.deepEqual(parse({ mission_id: null }), { provided: true, value: null });
  assert.deepEqual(parse({ mission_id: " " }), { provided: true, value: null });
  assert.deepEqual(parse({ mission_id: "12" }), { provided: true, value: 12 });
  assert.deepEqual(parse({ mission_id: 12 }), { provided: true, value: 12 });
  for (const value of [0, -1, 1.5, "1.5", "bad", {}, [], true]) {
    assert.match(parse({ mission_id: value }).error, /mission_id/);
  }
  assert.match(parse({ mission_source: "A" }).error, /mission_source/);
});

test("assignment rejects missing/inactive and allows same inactive or ACTIVE A-B reassignment", async () => {
  await withMethod(MissionModel, "findById", async (id) => {
    if (id === 1) return { id, mission_source: "A", status: "ACTIVE" };
    if (id === 2) return { id, mission_source: "B", status: "ACTIVE" };
    if (id === 3) return { id, mission_source: "B", status: "INACTIVE" };
    return null;
  }, async () => {
    const validate = TrainingCourseController._test.validateMissionAssignment;
    assert.equal(await validate({ provided: true, value: 1 }), null);
    assert.equal(await validate({ provided: true, value: 2 }, 1), null);
    assert.equal((await validate({ provided: true, value: 99 })).code, "INVALID_MISSION_ID");
    assert.equal((await validate({ provided: true, value: 3 })).code, "INACTIVE_MISSION");
    assert.equal(await validate({ provided: true, value: 3 }, 3), null);
  });
});

test("create stores canonical Mission only on training_programs", async () => {
  let captured;
  await withMethod(db, "query", async (sql, params) => {
    captured = { sql, params };
    return [{ insertId: 5 }];
  }, async () => {
    assert.equal(await TrainingCourseModel.create({
      training_course_name: "Khóa",
      description: null,
      mission_id: 7,
      status: "ACTIVE",
    }), 5);
  });
  assert.match(captured.sql, /INSERT INTO training_programs/);
  assert.match(captured.sql, /mission_id/);
  assert.doesNotMatch(captured.sql, /INSERT INTO courses|course_classes/);
  assert.equal(captured.params[3], 7);
});

test("update omission preserves and explicit null unlinks mission_id", async () => {
  const calls = [];
  await withMethod(db, "query", async (sql, params) => {
    calls.push({ sql, params });
    return [{ affectedRows: 1 }];
  }, async () => {
    const base = { training_course_name: "Khóa", status: "ACTIVE" };
    await TrainingCourseModel.update(5, {
      ...base,
      mission_id_provided: false,
      mission_id: null,
    });
    await TrainingCourseModel.update(5, {
      ...base,
      mission_id_provided: true,
      mission_id: null,
    });
  });
  assert.match(calls[0].sql, /UPDATE training_programs/);
  assert.match(calls[0].sql, /mission_id = IF\(\?, \?, mission_id\)/);
  assert.doesNotMatch(calls[0].sql, /UPDATE courses|course_classes/);
  assert.deepEqual(calls[0].params.slice(4, 6), [0, null]);
  assert.deepEqual(calls[1].params.slice(4, 6), [1, null]);
});

test("response is additive with canonical_mission", async () => {
  await withMethod(db, "query", async () => [[{
    id: 4,
    training_course_name: "Khóa",
    mission_id: 8,
    canonical_mission_name: "Mission",
    canonical_mission_source: "B",
    canonical_mission_status: "ACTIVE",
    total_course_groups: 2,
    total_classes: 3,
  }]], async () => {
    const item = await TrainingCourseModel.findById(4);
    assert.equal(item.mission_id, 8);
    assert.deepEqual(item.canonical_mission, {
      id: 8,
      mission_name: "Mission",
      mission_source: "B",
      status: "ACTIVE",
    });
    assert.equal(item.total_course_groups, 2);
    assert.equal(item.total_classes, 3);
  });
});

test("create omission defaults Mission to NULL without touching child entities", async () => {
  let captured;
  await withMethod(db, "query", async (sql, params) => {
    captured = { sql, params };
    return [{ insertId: 6 }];
  }, async () => {
    await TrainingCourseModel.create({ training_course_name: "Khóa mới" });
  });
  assert.equal(captured.params[3], null);
  assert.doesNotMatch(captured.sql, /courses\s|course_classes/);
});
