const { after, test } = require("node:test");
const assert = require("node:assert/strict");

const db = require("../config/db");
const MissionModel = require("../models/missionModel");
const AdminActivityLogModel = require("../models/adminActivityLogModel");
const MissionController = require("./missionController");

function responseMock() {
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

function request(overrides = {}) {
  return {
    admin: { id: 1, username: "root", role: "SUPER_ADMIN" },
    body: {},
    params: { id: "1" },
    query: {},
    ip: "127.0.0.1",
    get: () => "test-agent",
    ...overrides,
  };
}

async function withMocks(mocks, callback) {
  const originals = [];
  for (const [target, key, value] of mocks) {
    originals.push([target, key, target[key]]);
    target[key] = value;
  }
  try {
    await callback();
  } finally {
    for (const [target, key, value] of originals) target[key] = value;
  }
}

after(async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  await db.end();
});

test("create validation normalizes values, permits duplicate names and rejects unknown fields", () => {
  assert.equal(
    MissionController._test.validateCreateBody({
      mission_name: "  Mission  ",
      mission_source: "a",
      description: "",
    }),
    null,
  );
  assert.deepEqual(
    MissionController._test.createData({
      mission_name: "  Mission  ",
      mission_source: "a",
      description: "  ",
    }),
    {
      mission_name: "Mission",
      mission_source: "A",
      description: null,
      status: "ACTIVE",
    },
  );
  assert.match(
    MissionController._test.validateCreateBody({
      mission_name: "Mission",
      mission_source: "A",
      extra: true,
    }),
    /extra/,
  );
});

test("POST and PUT reject non-string description types with VALIDATION_ERROR", async () => {
  for (const description of [123, true, {}, []]) {
    const body = {
      mission_name: "Mission",
      mission_source: "A",
      description,
    };
    const postResponse = responseMock();
    const putResponse = responseMock();

    await MissionController.store(request({ body }), postResponse);
    await MissionController.update(request({ body }), putResponse);

    for (const response of [postResponse, putResponse]) {
      assert.equal(response.statusCode, 400);
      assert.equal(response.payload.code, "VALIDATION_ERROR");
      assert.match(response.payload.message, /description/);
    }
  }
});

test("null, empty and whitespace descriptions are accepted and normalized to null", () => {
  for (const description of [null, "", "   "]) {
    const body = {
      mission_name: "Mission",
      mission_source: "A",
      description,
    };
    assert.equal(MissionController._test.validateCreateBody(body), null);
    assert.equal(MissionController._test.createData(body).description, null);
  }
});

test("PUT rejects status through the dedicated contract error", async () => {
  const res = responseMock();
  await MissionController.update(
    request({
      body: {
        mission_name: "Mission",
        mission_source: "A",
        status: "INACTIVE",
      },
    }),
    res,
  );
  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.code, "STATUS_UPDATE_NOT_ALLOWED");
});

test("PUT rejects A-B source change when any activity link exists", async () => {
  const res = responseMock();
  await withMocks(
    [
      [MissionModel, "findById", async () => ({
        id: 1,
        mission_name: "Mission",
        mission_source: "A",
        description: null,
        status: "ACTIVE",
      })],
      [MissionModel, "countActivityLinks", async () => 1],
      [MissionModel, "updateInfo", async () => {
        throw new Error("updateInfo must not run");
      }],
    ],
    async () => {
      await MissionController.update(
        request({
          body: {
            mission_name: "Mission",
            mission_source: "B",
            description: "",
          },
        }),
        res,
      );
    },
  );
  assert.equal(res.statusCode, 409);
  assert.equal(res.payload.code, "MISSION_SOURCE_LOCKED");
});

test("PUT permits A-B source change without links and returns a fresh record", async () => {
  const existing = {
    id: 1,
    mission_name: "Old",
    mission_source: "A",
    description: null,
    status: "ACTIVE",
  };
  const fresh = { ...existing, mission_name: "New", mission_source: "B" };
  let findCalls = 0;
  let logged;
  const res = responseMock();

  await withMocks(
    [
      [MissionModel, "findById", async () => (++findCalls === 1 ? existing : fresh)],
      [MissionModel, "countActivityLinks", async () => 0],
      [MissionModel, "updateInfo", async () => 1],
      [AdminActivityLogModel, "create", async (data) => { logged = data; }],
    ],
    async () => {
      await MissionController.update(
        request({ body: { mission_name: "New", mission_source: "B" } }),
        res,
      );
    },
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.payload.data, fresh);
  assert.equal(logged.action, "UPDATE");
  assert.equal(logged.entity_type, "MISSION");
  assert.deepEqual(logged.old_data, existing);
  assert.deepEqual(logged.new_data, fresh);
});

test("status endpoint allows INACTIVE without checking or changing links", async () => {
  const existing = {
    id: 1,
    mission_name: "Mission",
    mission_source: "A",
    status: "ACTIVE",
  };
  const fresh = { ...existing, status: "INACTIVE" };
  let findCalls = 0;
  let receivedStatus;
  const res = responseMock();

  await withMocks(
    [
      [MissionModel, "findById", async () => (++findCalls === 1 ? existing : fresh)],
      [MissionModel, "updateStatus", async (id, status) => {
        receivedStatus = status;
        return 1;
      }],
      [MissionModel, "countActivityLinks", async () => {
        throw new Error("status endpoint must not inspect links");
      }],
      [AdminActivityLogModel, "create", async () => 1],
    ],
    async () => {
      await MissionController.changeStatus(
        request({ body: { status: "inactive" } }),
        res,
      );
    },
  );

  assert.equal(res.statusCode, 200);
  assert.equal(receivedStatus, "INACTIVE");
  assert.deepEqual(res.payload.data, fresh);
});

test("audit log failure does not fail a successful create mutation", async () => {
  const created = {
    id: 10,
    mission_name: "Mission",
    mission_source: "A",
    description: null,
    status: "ACTIVE",
  };
  const res = responseMock();

  await withMocks(
    [
      [MissionModel, "create", async () => 10],
      [MissionModel, "findById", async () => created],
      [AdminActivityLogModel, "create", async () => {
        throw new Error("forced audit failure");
      }],
      [console, "error", () => {}],
    ],
    async () => {
      await MissionController.store(
        request({
          body: {
            mission_name: "Mission",
            mission_source: "A",
            description: null,
          },
        }),
        res,
      );
    },
  );

  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.success, true);
  assert.deepEqual(res.payload.data, created);
});
