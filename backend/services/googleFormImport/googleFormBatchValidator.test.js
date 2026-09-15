const test = require("node:test");
const assert = require("node:assert/strict");
const db = require("../../config/db");
const {
  normalizeExhibitionSurveyNumber,
  sanitizeExhibitionSurveyData,
  validateGoogleFormBatch,
  validateOneTrainingRow,
  validateRequiredMetadata,
} = require("./googleFormBatchValidator");
const { buildExhibitionInsertValues } = require("./googleFormBatchCommitService");

test("exhibition survey validation keeps READY and WARNING rows independent from participants", async () => {
  const originalGetConnection = db.getConnection;
  let released = false;
  db.getConnection = async () => ({
    query: async (sql) => {
      assert.match(sql, /event_type = 'EXHIBITION'/);
      return [[{ id: 12, event_name: "SMART HEALTHCARE 2026", event_type: "EXHIBITION", year: 2026 }]];
    },
    release: () => { released = true; },
  });

  try {
    const validSurvey = {
      position: "Giám đốc",
      organization: "Công ty A",
      phone: "0900000000",
      project_field: "HEALTHCARE",
      exhibition_product_name: "Sản phẩm A",
      exhibition_product_quantity: "2 sản phẩm",
      sold_or_ordered_quantity: "0",
      visitor_count: "10",
      b2b_matching_count: "1",
      public_sector_connection_count: "0",
      highlight_impression: "Kết nối phù hợp",
      want_to_join_again: "YES",
    };
    const result = await validateGoogleFormBatch({
      target: { type: "EXHIBITION", eventId: 12, metadata: { year: 2026 } },
      rows: [
        { rowNumber: 2, status: "READY", data: { ...validSurvey, fullname: "Nguyễn A", email: "a@x.vn" } },
        { rowNumber: 3, status: "WARNING", data: { ...validSurvey, fullname: "Nguyễn B", email: "a@x.vn; b@x.vn" } },
      ],
    });
    assert.equal(result.summary.readyToCommit, 2);
    assert.deepEqual(result.rows.map((row) => row.dbStatus), ["NEW", "NEW"]);
    assert.equal(released, true);
  } finally {
    db.getConnection = originalGetConnection;
  }
});

test("exhibition survey validation normalizes missing numeric values before commit", async () => {
  const originalGetConnection = db.getConnection;
  db.getConnection = async () => ({
    query: async () => [[{ id: 12, event_type: "EXHIBITION", year: 2026 }]],
    release: () => {},
  });
  try {
    const result = await validateGoogleFormBatch({
      target: { type: "EXHIBITION", eventId: 12, metadata: { year: 2026 } },
      rows: [{
        rowNumber: 2,
        status: "READY",
        data: {
          fullname: "Nguyễn A", position: "Giám đốc", organization: "A",
          phone: "0900000000", email: "a@x.vn", project_field: "HEALTHCARE",
          exhibition_product_name: "Sản phẩm A", exhibition_product_quantity: "",
          sold_or_ordered_quantity: "0", visitor_count: "0", b2b_matching_count: "0",
          public_sector_connection_count: "0", highlight_impression: "Tốt",
          want_to_join_again: "YES",
        },
      }],
    });
    assert.equal(result.summary.readyToCommit, 1);
    assert.equal(result.summary.conflict, 0);
    assert.equal(result.rows[0].dbStatus, "NEW");
    assert.equal(result.rows[0].data.exhibition_product_quantity, 0);
  } finally {
    db.getConnection = originalGetConnection;
  }
});

test("exhibition survey boundary guards a row with every optional value missing", () => {
  const source = { fullname: "Lê Hồng Khanh", highlight_impression: null };
  const data = sanitizeExhibitionSurveyData(source);
  assert.equal(data.highlight_impression, "Không có dữ liệu");
  assert.equal(data.want_to_join_again, "Không có dữ liệu");
  assert.equal(data.project_field, "Không có dữ liệu");
  assert.equal(data.exhibition_product_name, "Không có dữ liệu");
  assert.deepEqual(
    [data.position, data.organization, data.phone, data.email],
    ["", "", "", ""],
  );

  const values = buildExhibitionInsertValues(12, source);
  assert.deepEqual(values.slice(8, 15), [0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(values.slice(2, 6), ["", "", "", ""]);
  assert.equal(values[6], "Không có dữ liệu");
  assert.equal(values[7], "Không có dữ liệu");
  assert.equal(values[15], "Không có dữ liệu");
  assert.equal(values[16], "Không có dữ liệu");
  assert.equal(values[17], null);
  assert.equal(values[18], null);
});

test("exhibition survey commit guards all numeric SQL parameters", () => {
  const cases = [
    [NaN, 0], [undefined, 0], ["", 0], ["abc", 0],
    ["20", 20], [20, 20], [Infinity, 0], [-Infinity, 0], [-1, 0],
  ];
  cases.forEach(([value, expected]) => {
    assert.equal(normalizeExhibitionSurveyNumber(value), expected);
  });

  const values = buildExhibitionInsertValues(12, {
    fullname: "Nguyễn A",
    exhibition_product_quantity: NaN,
    sold_or_ordered_quantity: NaN,
    visitor_count: NaN,
    b2b_matching_count: NaN,
    public_sector_connection_count: NaN,
    mou_count: NaN,
    exhibition_revenue: NaN,
  });
  assert.equal(values[12], 0);
  assert.deepEqual(values.slice(8, 15), [0, 0, 0, 0, 0, 0, 0]);
});

test("networking validation uses networking tables without requiring parent metadata", async () => {
  const originalGetConnection = db.getConnection;
  const queries = [];
  db.getConnection = async () => ({
    query: async (sql) => {
      queries.push(sql);
      if (/FROM networking_events/.test(sql)) {
        return [[{
          id: 21,
          event_name: "Kết nối đầu tư",
          year: 2026,
          location: null,
          start_datetime: null,
          end_datetime: null,
        }]];
      }
      if (/FROM networking_event_participants/.test(sql)) return [[]];
      throw new Error(`Unexpected query: ${sql}`);
    },
    release: () => {},
  });

  try {
    const result = await validateGoogleFormBatch({
      target: {
        type: "NETWORKING",
        eventId: 21,
        metadata: {
          networkingEventName: "Kết nối đầu tư",
          year: 2026,
          studentCount: 1,
          sessions: [],
          location: null,
        },
      },
      rows: [{
        rowNumber: 3,
        status: "READY",
        data: { fullname: "Nguyễn A" },
      }, {
        rowNumber: 4,
        status: "READY",
        data: { fullname: " Nguyễn A " },
      }, {
        rowNumber: 5,
        status: "READY",
        data: { fullname: "Nguyễn B" },
      }],
    });

    assert.equal(result.summary.readyToCommit, 2);
    assert.equal(result.summary.alreadyRegistered, 1);
    assert.deepEqual(
      result.rows.map((row) => row.dbStatus),
      ["NEW", "ALREADY_REGISTERED", "NEW"],
    );
    assert.ok(queries.every((sql) => !/startup_connection|seminar|exhibition/i.test(sql)));
  } finally {
    db.getConnection = originalGetConnection;
  }
});

test("networking validation rejects a selected event whose name does not match metadata", async () => {
  const originalGetConnection = db.getConnection;
  db.getConnection = async () => ({
    query: async () => [[{
      id: 21,
      event_name: "Kết nối đầu tư",
      year: 2026,
      location: null,
      start_datetime: null,
      end_datetime: null,
    }]],
    release: () => {},
  });

  try {
    await assert.rejects(
      validateGoogleFormBatch({
        target: {
          type: "NETWORKING",
          eventId: 21,
          metadata: { networkingEventName: "Hội thảo khác", year: 2026 },
        },
        rows: [{ rowNumber: 2, status: "READY", data: { fullname: "Nguyễn A" } }],
      }),
      /Tên trong file không khớp Sự kiện kết nối đã chọn/,
    );
  } finally {
    db.getConnection = originalGetConnection;
  }
});

test.after(async () => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  await db.end();
});

test("fullname-only is new unless the same opening already contains that name", () => {
  const base = {
    row: { rowNumber: 2, data: { fullname: " Nguyễn Văn A " } },
    byEmail: new Map(),
    byPhone: new Map(),
    registeredUserIds: new Set(),
  };
  assert.equal(validateOneTrainingRow({ ...base, byNameAtTarget: new Map() }).dbStatus, "NEW");
  assert.equal(
    validateOneTrainingRow({ ...base, byNameAtTarget: new Map([["nguyen van a", { id: 9 }]]) }).dbStatus,
    "ALREADY_REGISTERED",
  );
});

test("metadata reuses and must match training_programs.year", () => {
  assert.doesNotThrow(() => validateRequiredMetadata({ metadata: { year: 2026, sessions: [] } }, { year: 2026 }));
  assert.throws(
    () => validateRequiredMetadata({ metadata: { year: 2025, sessions: [{ sessionDate: "2025-08-17", startTime: "08:00" }] } }, { year: 2026 }),
    (error) => error.code === "TRAINING_PROGRAM_YEAR_MISMATCH",
  );
});

test("date/time do not block but year remains required", () => {
  assert.doesNotThrow(() =>
    validateRequiredMetadata({ metadata: { year: 2026 } }, { year: 2026 }),
  );
  assert.throws(
    () => validateRequiredMetadata({ metadata: { sessions: [] } }, { year: 2026 }),
    (error) => error.code === "NEEDS_ADMIN_CONFIRMATION",
  );
});
