const test = require("node:test");
const assert = require("node:assert/strict");
const service = require("./unifiedImportValidationService");

const source = (fileIndex, sheetIndex, rowNumber = null) => ({
  fileIndex,
  fileName: `f${fileIndex}.xlsx`,
  sheetIndex,
  sheetName: `S${sheetIndex}`,
  ...(rowNumber ? { rowNumber } : {}),
});
const mapping = (...fields) =>
  fields.map((field, columnIndex) => ({ columnIndex, header: field, field }));
const row = (fileIndex, sheetIndex, rowNumber, rawCells) => ({
  source: source(fileIndex, sheetIndex, rowNumber),
  rawCells,
});
const sheet = ({
  fileIndex = 0,
  sheetIndex = 0,
  module = "TRAINING",
  fields = ["fullname", "phone", "email"],
  rows,
  target,
  year,
}) => ({
  source: source(fileIndex, sheetIndex),
  module,
  target:
    target ||
    (module === "TRAINING"
      ? {
          trainingProgramId: 1,
          courseId: 2,
          openingId: 3,
          year: 2026,
        }
      : module === "INCUBATION"
        ? {
            programId: 4,
            year: 2026,
          }
        : {
            eventId: 5,
            year: 2026,
          }),
  mapping: mapping(...fields),
  rows,
  year: year || {
    status: "SAFE",
    years: [2026],
  },
});

test("mapping alias/raw theo từng sheet độc lập và giữ source", async () => {
  const result = await service.validateBatch({
    sheets: [
      sheet({
        fileIndex: 0,
        fields: ["fullname", "phone"],
        rows: [row(0, 0, 8, ["An", "0901"])],
      }),
      sheet({
        fileIndex: 1,
        fields: ["email", "fullname", "phone"],
        rows: [row(1, 0, 3, ["b@x.vn", "Bình", "0902"])],
      }),
    ],
  });
  assert.equal(result.sheets[0].rows[0].values.fullname, "An");
  assert.equal(result.sheets[1].rows[0].values.fullname, "Bình");
  assert.deepEqual(result.sheets[1].rows[0].source, source(1, 0, 3));
});

test("unknown column được giữ EXTRA hoặc cảnh báo nếu chưa xử lý", async () => {
  const unresolved = sheet({
    fields: ["fullname", "phone", ""],
    rows: [row(0, 0, 2, ["An", "0901", "ghi chú"])],
  });
  unresolved.mapping[2].header = "Cột lạ";
  const reviewed = await service.validateBatch({ sheets: [unresolved] });
  assert.equal(reviewed.sheets[0].rows[0].status, "NEEDS_REVIEW");
  unresolved.mapping[2].field = "__EXTRA__";
  const kept = await service.validateBatch({ sheets: [unresolved] });
  assert.equal(kept.sheets[0].rows[0].extras["Cột lạ"], "ghi chú");
});

test("duplicate mapping và required mapping thiếu được báo cấp sheet", () => {
  assert.equal(
    service.validateMapping({
      module: "TRAINING",
      mapping: mapping("fullname", "fullname"),
    }).errors[0].code,
    "DUPLICATE_CANONICAL_MAPPING",
  );
  assert.ok(
    service
      .validateMapping({ module: "TRAINING", mapping: mapping("email") })
      .errors.some((item) => item.code === "REQUIRED_MAPPING_MISSING"),
  );
});

test("blank identity/footer bị bỏ qua và valid row sau vẫn chạy", async () => {
  const result = await service.validateBatch({
    sheets: [
      sheet({
        rows: [
          row(0, 0, 2, ["", "0901", ""]),
          row(0, 0, 3, ["Tổng cộng", "2", ""]),
          row(0, 0, 4, ["An", "0901", ""]),
        ],
      }),
    ],
  });
  assert.deepEqual(
    result.sheets[0].rows.map((item) => item.status),
    ["SKIPPED_BLANK_IDENTITY", "SKIPPED_BLANK_IDENTITY", "VALID"],
  );
});

test("required, optional và conditional field theo module", async () => {
  const training = sheet({
    fields: ["fullname", "phone", "email", "has_project", "project_name"],
    rows: [
      row(0, 0, 2, ["An", "", "", "Có", ""]),
      row(0, 0, 3, ["Bình", "0902", "", "Không", ""]),
    ],
  });
  const incubation = sheet({
    fileIndex: 1,
    module: "INCUBATION",
    fields: [
      "project_name",
      "contact_fullname",
      "contact_email",
      "has_intellectual_property",
      "intellectual_property_detail",
    ],
    rows: [row(1, 0, 2, ["P", "Founder", "", "Có", ""])],
  });
  const result = await service.validateBatch({
    sheets: [training, incubation],
  });
  assert.equal(result.sheets[0].rows[0].status, "ERROR");
  assert.equal(result.sheets[0].rows[1].status, "VALID");
  assert.equal(result.sheets[1].rows[0].status, "NEEDS_REVIEW");
});

test("Seminar/Networking participant và Exhibition survey dùng rule riêng", async () => {
  const seminar = sheet({
    module: "SEMINAR",
    fields: ["fullname", "email"],
    rows: [row(0, 0, 2, ["A", ""])],
  });
  const networking = sheet({
    fileIndex: 1,
    module: "NETWORKING",
    fields: ["fullname", "email"],
    rows: [row(1, 0, 2, ["B", "b@x.vn"])],
  });
  const exhibition = sheet({
    fileIndex: 2,
    module: "EXHIBITION",
    fields: ["fullname", "exhibition_product_name", "visitor_count"],
    rows: [row(2, 0, 2, ["C", "Sản phẩm", "10"])],
  });
  const result = await service.validateBatch({
    sheets: [seminar, networking, exhibition],
  });
  assert.deepEqual(
    result.sheets.map((item) => item.rows[0].status),
    ["ERROR", "VALID", "VALID"],
  );
});

test("duplicate trong sheet và giữa hai file được phân biệt", async () => {
  const result = await service.validateBatch({
    sheets: [
      sheet({
        rows: [
          row(0, 0, 2, ["An", "0901", "a@x.vn"]),
          row(0, 0, 3, ["An", "0901", "a@x.vn"]),
        ],
      }),
      sheet({ fileIndex: 1, rows: [row(1, 0, 2, ["An", "0901", "a@x.vn"])] }),
    ],
  });
  assert.deepEqual(
    result.sheets.flatMap((item) => item.rows).map((item) => item.status),
    ["VALID", "SKIPPED_DUPLICATE", "DUPLICATE"],
  );
});

test("existing DB duplicate và identity conflict", async () => {
  const snapshot = {
    users: [
      { id: 9, fullname: "An", phone: "0901", email: "a@x.vn" },
      { id: 10, fullname: "Khác", phone: "0902", email: "other@x.vn" },
    ],
    registrations: [{ user_id: 9, target_id: 3 }],
  };
  const result = await service.validateBatch(
    {
      sheets: [
        sheet({
          rows: [
            row(0, 0, 2, ["An", "0901", "a@x.vn"]),
            row(0, 0, 3, ["Bình", "0902", "b@x.vn"]),
          ],
        }),
      ],
    },
    snapshot,
  );
  assert.deepEqual(
    result.sheets[0].rows.map((item) => item.status),
    ["DUPLICATE", "CONFLICT"],
  );
});

test("invalid/mixed year cần review và target year conflict", async () => {
  const result = await service.validateBatch({
    sheets: [
      sheet({
        year: { status: "INVALID", years: [2026] },
        rows: [row(0, 0, 2, ["A", "0901", ""])],
      }),
      sheet({
        fileIndex: 1,
        year: { status: "MIXED", years: [2025, 2026] },
        rows: [row(1, 0, 2, ["B", "0902", ""])],
      }),
      sheet({
        fileIndex: 2,
        year: { status: "SAFE", years: [2025] },
        rows: [row(2, 0, 2, ["C", "0903", ""])],
      }),
    ],
  });
  assert.deepEqual(
    result.sheets.map((item) => item.rows[0].status),
    ["NEEDS_REVIEW", "NEEDS_REVIEW", "CONFLICT"],
  );
});

test("sheet lỗi không dừng multi-file/multi-sheet", async () => {
  const broken = sheet({ rows: [row(0, 0, 2, ["A", "0901", ""])] });
  broken.mapping = {};
  const good = sheet({
    fileIndex: 1,
    sheetIndex: 2,
    rows: [row(1, 2, 4, ["B", "0902", ""])],
  });
  const result = await service.validateBatch({ sheets: [broken, good] });
  assert.equal(result.sheets[0].status, "ERROR");
  assert.equal(result.sheets[1].rows[0].status, "VALID");
});
