const { after, test } = require("node:test");
const assert = require("node:assert/strict");

const db = require("../config/db");
const MissionModel = require("../models/missionModel");
const StartupConnectionModel = require("../models/startupConnectionModel");
const Controller = require("./startupConnectionController");

async function withMethods(replacements, callback) {
  const originals = replacements.map(({ target, name }) => ({
    target,
    name,
    value: target[name],
  }));
  for (const replacement of replacements) {
    replacement.target[replacement.name] = replacement.value;
  }
  try {
    return await callback();
  } finally {
    for (const original of originals) original.target[original.name] = original.value;
  }
}

function response() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
}

after(async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  await db.end();
});

test("mission_id parser accepts omission, unlink and positive numeric values", () => {
  const parse = Controller._test.parseMissionId;
  assert.deepEqual(parse({}), { provided: false, value: null });
  assert.deepEqual(parse({ mission_id: null }), { provided: true, value: null });
  assert.deepEqual(parse({ mission_id: " " }), { provided: true, value: null });
  assert.deepEqual(parse({ mission_id: "12" }), { provided: true, value: 12 });
  assert.deepEqual(parse({ mission_id: 12 }), { provided: true, value: 12 });
  for (const value of [0, -1, 1.5, "1.5", "x", {}, [], true]) {
    assert.match(parse({ mission_id: value }).error, /mission_id/);
  }
  assert.match(parse({ mission_source: "A" }).error, /mission_source/);
});

test("assignment enforces existence and ACTIVE while allowing same inactive link", async () => {
  await withMethods([
    {
      target: MissionModel,
      name: "findById",
      value: async (id) => {
        if (id === 1) return { id, mission_source: "A", status: "ACTIVE" };
        if (id === 2) return { id, mission_source: "B", status: "INACTIVE" };
        return null;
      },
    },
  ], async () => {
    const validate = Controller._test.validateMissionAssignment;
    assert.equal(await validate({ provided: true, value: 1 }), null);
    assert.equal((await validate({ provided: true, value: 99 })).code, "INVALID_MISSION_ID");
    assert.equal((await validate({ provided: true, value: 2 })).code, "INACTIVE_MISSION");
    assert.equal(await validate({ provided: true, value: 2 }, 2), null);
    assert.equal(await validate({ provided: true, value: 1 }, 2), null);
  });
});

test("SEMINAR and EXHIBITION create use identical canonical Mission rules", async () => {
  const created = [];
  await withMethods([
    {
      target: MissionModel,
      name: "findById",
      value: async (id) => ({ id, mission_source: "A", status: "ACTIVE" }),
    },
    {
      target: StartupConnectionModel,
      name: "create",
      value: async (data) => {
        created.push(data);
        return created.length;
      },
    },
    {
      target: StartupConnectionModel,
      name: "findById",
      value: async (id) => ({ id, ...created[id - 1] }),
    },
  ], async () => {
    for (const eventType of ["SEMINAR", "EXHIBITION"]) {
      const res = response();
      await Controller.createEvent({
        body: { event_name: eventType, event_type: eventType, mission_id: "1" },
      }, res);
      assert.equal(res.statusCode, 201);
      assert.equal(res.payload.data.mission_id, 1);
    }
  });
  assert.deepEqual(created.map((item) => item.event_type), ["SEMINAR", "EXHIBITION"]);
});

test("model create stores Mission only on startup_connection_events", async () => {
  const calls = [];
  await withMethods([
    {
      target: db,
      name: "query",
      value: async (sql, params) => {
        calls.push({ sql, params });
        return [{ insertId: 20 }];
      },
    },
  ], async () => {
    for (const eventType of ["SEMINAR", "EXHIBITION"]) {
      await StartupConnectionModel.create({
        event_name: eventType,
        event_type: eventType,
        mission: "Legacy",
        mission_id: 7,
      });
    }
  });
  for (const call of calls) {
    assert.match(call.sql, /INSERT INTO startup_connection_events/);
    assert.match(call.sql, /mission,\s+mission_id,/);
    assert.doesNotMatch(
      call.sql,
      /startup_connection_participants|exhibition_surveys/,
    );
    assert.equal(call.params[6], "Legacy");
    assert.equal(call.params[7], 7);
  }
});

test("update preserves omitted legacy/canonical and unlinks explicit mission_id", async () => {
  const calls = [];
  await withMethods([
    {
      target: db,
      name: "query",
      value: async (sql, params) => {
        calls.push({ sql, params });
        return [{ affectedRows: 1 }];
      },
    },
  ], async () => {
    const base = { event_name: "Event", event_type: "SEMINAR", status: "OPEN" };
    await StartupConnectionModel.update(1, {
      ...base,
      mission_provided: false,
      mission: null,
      mission_id_provided: false,
      mission_id: null,
    });
    await StartupConnectionModel.update(1, {
      ...base,
      mission_provided: false,
      mission: null,
      mission_id_provided: true,
      mission_id: null,
    });
  });
  assert.match(calls[0].sql, /mission = IF\(\?, \?, mission\)/);
  assert.match(calls[0].sql, /mission_id = IF\(\?, \?, mission_id\)/);
  assert.deepEqual(calls[0].params.slice(6, 10), [0, null, 0, null]);
  assert.deepEqual(calls[1].params.slice(6, 10), [0, null, 1, null]);
});

test("Seminar child does not inherit canonical Mission from parent Exhibition", async () => {
  let updated;
  await withMethods([
    {
      target: StartupConnectionModel,
      name: "findById",
      value: async () => ({ id: 2, event_type: "SEMINAR", mission: "Legacy", mission_id: null }),
    },
    {
      target: StartupConnectionModel,
      name: "findExhibitionById",
      value: async () => ({ id: 1, event_type: "EXHIBITION", mission_id: 9 }),
    },
    {
      target: StartupConnectionModel,
      name: "update",
      value: async (_id, data) => {
        updated = data;
        return 1;
      },
    },
  ], async () => {
    const res = response();
    await Controller.updateEvent({
      params: { id: "2" },
      body: {
        event_name: "Child seminar",
        event_type: "SEMINAR",
        parent_event_id: 1,
        status: "OPEN",
      },
    }, res);
    assert.equal(res.statusCode, 200);
  });
  assert.equal(updated.mission_provided, false);
  assert.equal(updated.mission_id_provided, false);
  assert.equal(updated.mission_id, null);
});

test("response keeps legacy mission and adds canonical_mission", async () => {
  await withMethods([
    {
      target: db,
      name: "query",
      value: async () => [[{
        id: 4,
        event_type: "EXHIBITION",
        mission: "Legacy",
        mission_id: 8,
        canonical_mission_name: "Canonical",
        canonical_mission_source: "B",
        canonical_mission_status: "ACTIVE",
        total_participants: 0,
      }]],
    },
  ], async () => {
    const event = await StartupConnectionModel.findById(4);
    assert.equal(event.mission, "Legacy");
    assert.equal(event.mission_id, 8);
    assert.deepEqual(event.canonical_mission, {
      id: 8,
      mission_name: "Canonical",
      mission_source: "B",
      status: "ACTIVE",
    });
  });
});
