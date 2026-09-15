const test = require("node:test");
const assert = require("node:assert/strict");

const CommitService = require("./unifiedImportCommitService");

const source = (fileIndex = 0, sheetIndex = 0, rowNumber = null) => ({
  fileIndex,
  fileName: `f${fileIndex}.xlsx`,
  sheetIndex,
  sheetName: `S${sheetIndex}`,
  ...(rowNumber ? { rowNumber } : {}),
});

test("buildCommitPlan chỉ cho VALID của sheet validationReady", () => {
  const plan = CommitService.buildCommitPlan({
    sheets: [
      {
        source: source(0, 0),
        module: "TRAINING",
        target: {
          trainingProgramId: 1,
          courseId: 2,
          openingId: 3,
          year: 2026,
        },
        validationReady: true,
        rows: [
          {
            source: source(0, 0, 2),
            status: "VALID",
          },
          {
            source: source(0, 0, 3),
            status: "CONFLICT",
          },
        ],
      },
    ],
  });

  assert.equal(plan.canCommit, false);
  assert.equal(plan.summary.rows, 2);
  assert.equal(plan.summary.validRows, 1);
  assert.equal(plan.summary.blockedRows, 1);

  assert.equal(plan.sheets[0].rows[0].commitEligible, true);
  assert.equal(plan.sheets[0].rows[1].commitEligible, false);
});

test("sheet validationReady false chặn cả row mang status VALID", () => {
  const plan = CommitService.buildCommitPlan({
    sheets: [
      {
        source: source(0, 0),
        module: "TRAINING",
        target: {
          trainingProgramId: 1,
          courseId: 2,
          openingId: 3,
          year: 2026,
        },
        validationReady: false,
        rows: [
          {
            source: source(0, 0, 2),
            status: "VALID",
          },
        ],
      },
    ],
  });

  assert.equal(plan.sheets[0].validationReady, false);
  assert.equal(plan.sheets[0].rows[0].commitEligible, false);
  assert.equal(plan.sheets[0].validRowCount, 0);
  assert.equal(plan.summary.blockedRows, 1);
});

test("multi-file multi-sheet giữ source và tính plan độc lập", () => {
  const plan = CommitService.buildCommitPlan({
    sheets: [
      {
        source: source(0, 0),
        module: "TRAINING",
        target: {
          trainingProgramId: 1,
          courseId: 2,
          openingId: 3,
          year: 2026,
        },
        validationReady: true,
        rows: [
          {
            source: source(0, 0, 8),
            status: "VALID",
          },
        ],
      },
      {
        source: source(1, 2),
        module: "SEMINAR",
        target: {
          eventId: 5,
          year: 2026,
        },
        validationReady: true,
        rows: [
          {
            source: source(1, 2, 4),
            status: "ERROR",
          },
        ],
      },
    ],
  });

  assert.equal(plan.sheets.length, 2);
  assert.deepEqual(plan.sheets[0].source, source(0, 0));
  assert.deepEqual(plan.sheets[1].source, source(1, 2));

  assert.equal(plan.sheets[0].validRowCount, 1);
  assert.equal(plan.sheets[1].validRowCount, 0);

  assert.equal(plan.summary.sheets, 2);
  assert.equal(plan.summary.rows, 2);
  assert.equal(plan.summary.validRows, 1);
  assert.equal(plan.summary.blockedRows, 1);
});
const LookupService = require("./unifiedImportValidationLookupService");

function trainingSheet({
  fileIndex = 0,
  sheetIndex = 0,
  fullname = "Nguyễn Văn A",
  phone = "0901234567",
  target,
  clientStatus = "VALID",
} = {}) {
  return {
    source: source(fileIndex, sheetIndex),
    module: "TRAINING",
    target: target || {
      trainingProgramId: 1,
      courseId: 2,
      openingId: 3,
      year: 2026,
    },
    year: {
      status: "SAFE",
      years: [2026],
    },
    mapping: [
      {
        columnIndex: 0,
        header: "Họ và tên",
        field: "fullname",
      },
      {
        columnIndex: 1,
        header: "Điện thoại",
        field: "phone",
      },
    ],
    rows: [
      {
        source: source(fileIndex, sheetIndex, 2),
        status: clientStatus,
        rawCells: [fullname, phone],
      },
    ],
  };
}

test("prepareCommit không tin status VALID từ client khi target server xác nhận sai", async () => {
  const originalLoadSnapshot = LookupService.loadSnapshot;

  LookupService.loadSnapshot = async () => ({
    users: [],
    registrations: [],
    profiles: [],
    lookupErrors: [],
    targetChecks: {
      "0:0": {
        key: "0:0",
        valid: false,
        reason: "TARGET_HIERARCHY_INVALID",
      },
    },
  });

  try {
    const result = await CommitService.prepareCommit({
      sheets: [
        trainingSheet({
          clientStatus: "VALID",
        }),
      ],
    });

    assert.equal(result.validation.sheets[0].rows[0].status, "ERROR");
    assert.equal(
      result.validation.sheets[0].rows[0].reasons.includes(
        "SHEET_MAPPING_INVALID",
      ),
      true,
    );

    assert.equal(result.plan.sheets[0].validationReady, false);
    assert.equal(result.plan.sheets[0].validRowCount, 0);
    assert.equal(result.plan.sheets[0].rows[0].commitEligible, false);
  } finally {
    LookupService.loadSnapshot = originalLoadSnapshot;
  }
});

test("prepareCommit chặn row khi DB lookup lỗi", async () => {
  const originalLoadSnapshot = LookupService.loadSnapshot;

  LookupService.loadSnapshot = async () => ({
    users: [],
    registrations: [],
    profiles: [],
    targetChecks: {
      "0:0": {
        key: "0:0",
        valid: true,
        year: 2026,
      },
    },
    lookupErrors: [
      {
        code: "LOOKUP_ERROR",
        scope: "PARTICIPANT_IDENTITY",
        message: "DB lookup failed",
      },
    ],
  });

  try {
    const result = await CommitService.prepareCommit({
      sheets: [trainingSheet()],
    });

    assert.equal(result.validation.sheets[0].rows[0].status, "NEEDS_REVIEW");

    assert.equal(result.validation.sheets[0].validationReady, false);
    assert.equal(result.plan.sheets[0].validRowCount, 0);
    assert.equal(result.plan.sheets[0].rows[0].commitEligible, false);
  } finally {
    LookupService.loadSnapshot = originalLoadSnapshot;
  }
});

test("prepareCommit chỉ cho row được server revalidate thành VALID", async () => {
  const originalLoadSnapshot = LookupService.loadSnapshot;

  LookupService.loadSnapshot = async () => ({
    users: [],
    registrations: [],
    profiles: [],
    lookupErrors: [],
    targetChecks: {
      "0:0": {
        key: "0:0",
        valid: true,
        year: 2026,
      },
    },
  });

  try {
    const result = await CommitService.prepareCommit({
      sheets: [
        trainingSheet({
          clientStatus: "ERROR",
        }),
      ],
    });

    /*
     * Client cố gửi ERROR cũng không được tin.
     * Server tự validate lại dữ liệu thật.
     */
    assert.equal(result.validation.sheets[0].rows[0].status, "VALID");
    assert.equal(result.validation.sheets[0].validationReady, true);

    assert.equal(result.plan.sheets[0].validRowCount, 1);
    assert.equal(result.plan.sheets[0].blockedRowCount, 0);
    assert.equal(result.plan.sheets[0].rows[0].commitEligible, true);

    /*
     * Vẫn chưa cho ghi DB ở Phase 4 bước này.
     */
    assert.equal(result.plan.canCommit, false);
  } finally {
    LookupService.loadSnapshot = originalLoadSnapshot;
  }
});

test("prepareCommit giữ sheet độc lập khi một target sai và một target hợp lệ", async () => {
  const originalLoadSnapshot = LookupService.loadSnapshot;

  LookupService.loadSnapshot = async () => ({
    users: [],
    registrations: [],
    profiles: [],
    lookupErrors: [],
    targetChecks: {
      "0:0": {
        key: "0:0",
        valid: false,
        reason: "TARGET_HIERARCHY_INVALID",
      },
      "1:0": {
        key: "1:0",
        valid: true,
        year: 2026,
      },
    },
  });

  try {
    const result = await CommitService.prepareCommit({
      sheets: [
        trainingSheet({
          fileIndex: 0,
          sheetIndex: 0,
          fullname: "Nguyễn Văn A",
          phone: "0901111111",
        }),
        trainingSheet({
          fileIndex: 1,
          sheetIndex: 0,
          fullname: "Trần Văn B",
          phone: "0902222222",
        }),
      ],
    });

    assert.equal(result.plan.sheets.length, 2);

    assert.equal(result.plan.sheets[0].validationReady, false);
    assert.equal(result.plan.sheets[0].validRowCount, 0);

    assert.equal(result.plan.sheets[1].validationReady, true);
    assert.equal(result.plan.sheets[1].validRowCount, 1);
    assert.equal(result.plan.sheets[1].rows[0].commitEligible, true);

    assert.equal(result.plan.summary.rows, 2);
    assert.equal(result.plan.summary.validRows, 1);
    assert.equal(result.plan.summary.blockedRows, 1);
  } finally {
    LookupService.loadSnapshot = originalLoadSnapshot;
  }
});
const TrainingAdapter = require("./unifiedImportTrainingAdapter");

function executableTrainingPlan({ sheets = 1 } = {}) {
  return {
    mode: "COMMIT_PLAN",
    canCommit: false,
    sheets: Array.from({ length: sheets }, (_, index) => ({
      source: source(index, 0),
      module: "TRAINING",
      target: {
        trainingProgramId: 1,
        courseId: 2,
        openingId: 3 + index,
        year: 2026,
      },
      validationReady: true,
      rows: [
        {
          source: source(index, 0, 2),
          status: "VALID",
          commitEligible: true,
          values: {
            fullname: `User ${index}`,
            phone: `090000000${index}`,
          },
        },
      ],
      validRows: [],
      totalRows: 1,
      validRowCount: 1,
      blockedRowCount: 0,
    })),
  };
}

function transactionDatabase() {
  const connections = [];

  return {
    connections,

    async getConnection() {
      const connection = {
        began: 0,
        committed: 0,
        rolledBack: 0,
        released: 0,

        async beginTransaction() {
          this.began += 1;
        },

        async commit() {
          this.committed += 1;
        },

        async rollback() {
          this.rolledBack += 1;
        },

        release() {
          this.released += 1;
        },
      };

      connections.push(connection);

      return connection;
    },
  };
}

test("executePlan commit transaction cho sheet Training hợp lệ", async () => {
  const originalImportSheet = TrainingAdapter.importSheet;

  TrainingAdapter.importSheet = async (_connection, sheet) => ({
    source: sheet.source,
    module: "TRAINING",
    status: "IMPORTED",
    importedRows: 1,
    skippedDuplicateRows: 0,
    rows: [],
  });

  try {
    const database = transactionDatabase();

    const result = await CommitService.executePlan(
      executableTrainingPlan(),
      database,
    );

    assert.equal(result.summary.committedSheets, 1);
    assert.equal(result.summary.failedSheets, 0);

    assert.equal(database.connections.length, 1);
    assert.equal(database.connections[0].began, 1);
    assert.equal(database.connections[0].committed, 1);
    assert.equal(database.connections[0].rolledBack, 0);
    assert.equal(database.connections[0].released, 1);
  } finally {
    TrainingAdapter.importSheet = originalImportSheet;
  }
});

test("executePlan rollback sheet lỗi nhưng vẫn tiếp tục sheet kế", async () => {
  const originalImportSheet = TrainingAdapter.importSheet;

  let call = 0;

  TrainingAdapter.importSheet = async (_connection, sheet) => {
    call += 1;

    if (call === 1) {
      const error = new Error("mock sheet failure");
      error.code = "MOCK_COMMIT_ERROR";
      throw error;
    }

    return {
      source: sheet.source,
      module: "TRAINING",
      status: "IMPORTED",
      importedRows: 1,
      skippedDuplicateRows: 0,
      rows: [],
    };
  };

  try {
    const database = transactionDatabase();

    const result = await CommitService.executePlan(
      executableTrainingPlan({
        sheets: 2,
      }),
      database,
    );

    assert.equal(result.results.length, 2);

    assert.equal(result.results[0].executed, false);
    assert.equal(result.results[0].reason, "MOCK_COMMIT_ERROR");

    assert.equal(result.results[1].executed, true);

    assert.equal(result.summary.failedSheets, 1);
    assert.equal(result.summary.committedSheets, 1);

    assert.equal(database.connections[0].rolledBack, 1);
    assert.equal(database.connections[0].committed, 0);

    assert.equal(database.connections[1].committed, 1);

    assert.equal(database.connections[0].released, 1);
    assert.equal(database.connections[1].released, 1);
  } finally {
    TrainingAdapter.importSheet = originalImportSheet;
  }
});

test("executePlan không mở transaction cho sheet bị block hoặc module chưa hỗ trợ", async () => {
  const database = transactionDatabase();

  const plan = {
    mode: "COMMIT_PLAN",
    sheets: [
      {
        source: source(0, 0),
        module: "TRAINING",
        validationReady: false,
        validRowCount: 0,
        rows: [],
      },
      {
        source: source(1, 0),
        module: "SEMINAR",
        validationReady: true,
        validRowCount: 1,
        rows: [
          {
            status: "VALID",
            commitEligible: true,
          },
        ],
      },
    ],
  };

  const result = await CommitService.executePlan(plan, database);

  assert.equal(database.connections.length, 0);

  assert.equal(result.results[0].reason, "SHEET_NOT_READY");

  assert.equal(result.results[1].reason, "MODULE_COMMIT_NOT_IMPLEMENTED");

  assert.equal(result.summary.committedSheets, 0);

  assert.equal(result.summary.skippedSheets, 2);
});
