const { test } = require("node:test");
const assert = require("node:assert/strict");
const Lookup = require("./unifiedImportValidationLookupService");
const Validation = require("./unifiedImportValidationService");
// const db = require("../config/db");

// after(async () => {
//   await db.end();
// });

const source = (fileIndex = 0, sheetIndex = 0, rowNumber = 2) => ({
  fileIndex,
  fileName: `f${fileIndex}.xlsx`,
  sheetIndex,
  sheetName: `s${sheetIndex}`,
  rowNumber,
});
const trainingSheet = (fileIndex = 0) => ({
  source: source(fileIndex, 0),
  module: "TRAINING",
  target: {
    trainingProgramId: 1,
    courseId: 2,
    openingId: 3,
    year: 2026,
  },
  mapping: [
    { columnIndex: 0, field: "fullname" },
    { columnIndex: 1, field: "phone" },
    { columnIndex: 2, field: "email" },
  ],
  rows: [
    {
      source: source(fileIndex, 0),
      rawCells: ["An", "0901", "a@x.vn"],
    },
  ],
  year: {
    status: "SAFE",
    years: [2026],
  },
});

function database({
  identityError = false,
  identityRows = [],
  registrationRows = [],
  targetRows = [{ year: 2026 }],
  eventRows = [{ id: 5 }],
  incubationRows = [{ id: 4 }],
} = {}) {
  return {
    async query(sql) {
      if (sql.includes("FROM training_programs")) return [targetRows];
      if (
        sql.includes("FROM startup_connection_events") ||
        sql.includes("FROM networking_events")
      )
        return [eventRows];
      if (sql.includes("FROM incubation_programs")) return [incubationRows];
      if (sql.includes("FROM users")) {
        if (identityError) throw new Error("identity lookup unavailable");
        return [identityRows];
      }
      if (sql.includes("FROM registrations")) {
        return [registrationRows];
      }
    },
  };
}

test("LOOKUP_ERROR không bị hiểu thành không tìm thấy và row không VALID", async () => {
  const sheet = trainingSheet();
  const snapshot = await Lookup.loadSnapshot(
    [sheet],
    database({ identityError: true }),
  );
  assert.ok(
    snapshot.lookupErrors.some(
      (item) =>
        item.code === "LOOKUP_ERROR" && item.scope === "PARTICIPANT_IDENTITY",
    ),
  );
  const result = await Validation.validateBatch({ sheets: [sheet] }, snapshot);
  assert.equal(result.sheets[0].rows[0].status, "NEEDS_REVIEW");
  assert.ok(result.sheets[0].rows[0].reasons.includes("LOOKUP_ERROR"));
  assert.equal(result.sheets[0].validationReady, false);
});

test("DB lookup thành công trả 0 identity vẫn cho row hợp lệ", async () => {
  const sheet = trainingSheet();
  const snapshot = await Lookup.loadSnapshot([sheet], database());
  assert.equal(snapshot.lookupErrors.length, 0);
  const result = await Validation.validateBatch({ sheets: [sheet] }, snapshot);
  assert.equal(result.sheets[0].rows[0].status, "VALID");
  assert.equal(result.sheets[0].validationReady, true);
});

test("Training target lookup không tham chiếu soft-delete không tồn tại", async () => {
  const queries = [];
  const mock = database();
  const original = mock.query;
  mock.query = async (sql, params) => {
    queries.push(sql);
    if (sql.includes("tp.deleted_at")) {
      throw new Error("Unknown column 'tp.deleted_at' in 'where clause'");
    }
    return original(sql, params);
  };

  const snapshot = await Lookup.loadSnapshot([trainingSheet()], mock);

  assert.equal(snapshot.targetChecks["0:0"].valid, true);
  assert.equal(snapshot.lookupErrors.length, 0);
  assert.ok(
    queries.some(
      (sql) =>
        sql.includes("FROM training_programs") &&
        !sql.includes("tp.deleted_at"),
    ),
  );
});

test("thiếu target chặn validationReady", async () => {
  const sheet = trainingSheet();
  sheet.target = {};
  const result = await Validation.validateBatch(
    { sheets: [sheet] },
    { targetChecks: {} },
  );
  assert.equal(result.sheets[0].rows[0].status, "ERROR");
  assert.ok(
    result.sheets[0].mappingValidation.errors.some(
      (item) => item.code === "TARGET_REQUIRED",
    ),
  );
  assert.equal(result.sheets[0].validationReady, false);
});

test("target sai module và Training hierarchy sai bị chặn", async () => {
  const seminar = {
    ...trainingSheet(),
    module: "SEMINAR",
    target: { eventId: 5 },
    mapping: [
      { columnIndex: 0, field: "fullname" },
      { columnIndex: 2, field: "email" },
    ],
  };
  const wrongModuleSnapshot = await Lookup.loadSnapshot(
    [seminar],
    database({ eventRows: [] }),
  );
  assert.equal(
    wrongModuleSnapshot.targetChecks["0:0"].reason,
    "TARGET_MODULE_INVALID",
  );
  const wrongModule = await Validation.validateBatch(
    { sheets: [seminar] },
    wrongModuleSnapshot,
  );
  assert.equal(wrongModule.sheets[0].validationReady, false);

  const training = trainingSheet();
  const hierarchySnapshot = await Lookup.loadSnapshot(
    [training],
    database({ targetRows: [] }),
  );
  assert.equal(
    hierarchySnapshot.targetChecks["0:0"].reason,
    "TARGET_HIERARCHY_INVALID",
  );
  const wrongHierarchy = await Validation.validateBatch(
    { sheets: [training] },
    hierarchySnapshot,
  );
  assert.equal(wrongHierarchy.sheets[0].rows[0].status, "ERROR");
});

test("lỗi target lookup một sheet không dừng sheet/file khác", async () => {
  const first = trainingSheet(0);
  const second = trainingSheet(1);
  let targetCall = 0;
  const mock = database();
  const original = mock.query;
  mock.query = async (sql, params) => {
    if (sql.includes("FROM training_programs")) {
      targetCall += 1;

      if (targetCall === 1) {
        throw new Error("target timeout");
      }
    }
    return original(sql, params);
  };
  const snapshot = await Lookup.loadSnapshot([first, second], mock);
  const result = await Validation.validateBatch(
    { sheets: [first, second] },
    snapshot,
  );
  assert.equal(result.sheets[0].validationReady, false);
  assert.equal(result.sheets[0].rows[0].status, "ERROR");
  assert.equal(result.sheets[1].rows[0].status, "VALID");
  assert.equal(result.canCommit, false);
  assert.equal(result.mode, "VALIDATE_ONLY");
});
test("Training course thuộc sai Nhiệm vụ đào tạo bị chặn", async () => {
  const sheet = trainingSheet();

  const mock = {
    async query(sql, params) {
      if (sql.includes("FROM training_programs")) {
        const [trainingProgramId, courseId, openingId] = params;

        assert.equal(trainingProgramId, 1);
        assert.equal(courseId, 2);
        assert.equal(openingId, 3);

        return [[]];
      }

      if (sql.includes("FROM users")) return [[]];

      return [[]];
    },
  };

  const snapshot = await Lookup.loadSnapshot([sheet], mock);

  assert.equal(snapshot.targetChecks["0:0"].reason, "TARGET_HIERARCHY_INVALID");

  const result = await Validation.validateBatch({ sheets: [sheet] }, snapshot);

  assert.equal(result.sheets[0].rows[0].status, "ERROR");
  assert.equal(result.sheets[0].validationReady, false);
});
test("Training opening thuộc sai Khóa đào tạo bị chặn", async () => {
  const sheet = trainingSheet();

  const mock = {
    async query(sql) {
      if (sql.includes("FROM training_programs")) {
        return [[]];
      }

      if (sql.includes("FROM users")) return [[]];

      return [[]];
    },
  };

  const snapshot = await Lookup.loadSnapshot([sheet], mock);

  assert.equal(snapshot.targetChecks["0:0"].reason, "TARGET_HIERARCHY_INVALID");

  const result = await Validation.validateBatch({ sheets: [sheet] }, snapshot);

  assert.equal(result.sheets[0].validationReady, false);
});
test("Training không yêu cầu Mission và mission_id NULL vẫn hợp lệ", async () => {
  const sheet = trainingSheet();

  const mock = {
    async query(sql) {
      if (sql.includes("FROM training_programs")) {
        assert.equal(sql.includes("INNER JOIN missions"), false);
        assert.equal(sql.includes("mission_id ="), false);

        return [[{ year: 2026 }]];
      }

      if (sql.includes("FROM users")) return [[]];

      return [[]];
    },
  };

  const snapshot = await Lookup.loadSnapshot([sheet], mock);

  assert.equal(snapshot.lookupErrors.length, 0);
  assert.equal(snapshot.targetChecks["0:0"].valid, true);

  const result = await Validation.validateBatch({ sheets: [sheet] }, snapshot);

  assert.equal(result.sheets[0].rows[0].status, "VALID");
  assert.equal(result.sheets[0].validationReady, true);
});
test("Training email-only của user đã tồn tại vẫn hợp lệ", async () => {
  const sheet = trainingSheet();

  sheet.rows[0].rawCells = ["An", "", "a@x.vn"];

  const snapshot = await Lookup.loadSnapshot(
    [sheet],
    database({
      identityRows: [
        {
          id: 10,
          fullname: "An",
          phone: "0909999999",
          email: "a@x.vn",
        },
      ],
    }),
  );

  const result = await Validation.validateBatch({ sheets: [sheet] }, snapshot);

  assert.equal(snapshot.lookupErrors.length, 0);

  assert.equal(result.sheets[0].rows[0].status, "VALID");

  assert.equal(
    result.sheets[0].rows[0].reasons.includes("STUDENT_PHONE_REQUIRED"),
    false,
  );

  assert.equal(result.sheets[0].validationReady, true);
});

test("Training email-only của user mới bị chặn vì thiếu phone", async () => {
  const sheet = trainingSheet();

  sheet.rows[0].rawCells = ["An", "", "new-user@x.vn"];

  const snapshot = await Lookup.loadSnapshot(
    [sheet],
    database({
      identityRows: [],
    }),
  );

  const result = await Validation.validateBatch({ sheets: [sheet] }, snapshot);

  assert.equal(snapshot.lookupErrors.length, 0);

  assert.equal(result.sheets[0].rows[0].status, "ERROR");

  assert.ok(
    result.sheets[0].rows[0].reasons.includes("STUDENT_PHONE_REQUIRED"),
  );

  assert.equal(result.sheets[0].validationReady, false);
});
