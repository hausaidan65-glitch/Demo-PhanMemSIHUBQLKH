const { after, test } = require("node:test");
const assert = require("node:assert/strict");
const XLSX = require("xlsx");

const db = require("../config/db");
const service = require("./openingStudentImportService");

function validRow(overrides = {}) {
  return {
    rowNumber: 2,
    fullname: "Nguyen Van A",
    phone: "0901234567",
    email: "a@example.com",
    gender: "MALE",
    age_group: "26-35",
    company: "SIHUB",
    position: "Founder",
    user_type: "STARTUP",
    has_project: true,
    project_name: "Project A",
    project_field: "Technology",
    startup_stage: "IDEA",
    project_description: "Description",
    female_founder: false,
    team_size: "3",
    incubation_status: "NEW",
    program_selection_status: "NOT_SELECTED",
    support_needs: "Mentoring",
    organizer_question: "",
    ...overrides,
  };
}

function createMockConnection({ opening, users = [], registrations = [], failRegistrationAt = 0 }) {
  const state = {
    opening: { ...opening },
    users: users.map((item) => ({ ...item })),
    registrations: registrations.map((item) => ({ ...item })),
    committed: false,
    rolledBack: false,
    began: false,
  };
  let snapshot;
  let registrationInsertCount = 0;

  return {
    state,
    async beginTransaction() {
      state.began = true;
      snapshot = JSON.parse(JSON.stringify(state));
    },
    async commit() {
      state.committed = true;
    },
    async rollback() {
      state.opening = snapshot?.opening || state.opening;
      state.users = snapshot?.users || state.users;
      state.registrations = snapshot?.registrations || state.registrations;
      state.rolledBack = true;
    },
    release() {},
    async query(sql, params) {
      if (sql.includes("FROM course_classes cc")) return [[{ ...state.opening }]];
      if (sql.includes("FROM users WHERE REPLACE")) {
        return [[state.users.find((user) => user.phone === params[0])].filter(Boolean)];
      }
      if (sql.includes("FROM users WHERE LOWER")) {
        return [[state.users.find((user) => user.email.toLowerCase() === params[0])].filter(Boolean)];
      }
      if (sql.includes("FROM registrations WHERE user_id")) {
        return [[state.registrations.find((item) => item.user_id === params[0] && item.class_id === params[1])].filter(Boolean)];
      }
      if (sql.startsWith("INSERT INTO users")) {
        const id = state.users.length + 100;
        state.users.push({ id, fullname: params[0], phone: params[1], email: params[2] });
        return [{ insertId: id }];
      }
      if (sql.startsWith("INSERT INTO registrations")) {
        registrationInsertCount += 1;
        if (failRegistrationAt === registrationInsertCount) throw new Error("forced insert failure");
        const id = state.registrations.length + 200;
        state.registrations.push({ id, user_id: params[0], class_id: params[1], qr_token: params.at(-1) });
        return [{ insertId: id }];
      }
      if (sql.includes("UPDATE course_classes")) {
        state.opening.current_students += params[0];
        if (state.opening.status === "OPEN" && state.opening.max_students > 0 && state.opening.current_students >= state.opening.max_students) {
          state.opening.status = "FULL";
        }
        return [{ affectedRows: 1 }];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
}

after(async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  await db.end();
});

test("row validation requires project fields only when has_project is true", () => {
  assert.deepEqual(service._test.validateRow(validRow()), []);
  assert.match(
    service._test.validateRow(validRow({ project_field: "" })).join(" "),
    /Lĩnh vực dự án/,
  );
  assert.deepEqual(
    service._test.validateRow(validRow({ has_project: false, project_field: "", startup_stage: "" })),
    [],
  );
});

test("confirm handles new, existing, duplicate, conflict and invalid rows atomically", async () => {
  const connection = createMockConnection({
    opening: { id: 10, status: "FULL", current_students: 4, max_students: 3 },
    users: [
      { id: 1, fullname: "Existing", phone: "0901111111", email: "existing@example.com" },
      { id: 2, fullname: "Duplicate", phone: "0902222222", email: "duplicate@example.com" },
      { id: 3, fullname: "Phone owner", phone: "0903333333", email: "phone@example.com" },
      { id: 4, fullname: "Email owner", phone: "0904444444", email: "email@example.com" },
    ],
    registrations: [{ id: 20, user_id: 2, class_id: 10, register_status: "CANCELLED" }],
  });
  const originalGetConnection = db.getConnection;
  db.getConnection = async () => connection;

  try {
    const result = await service.confirm(10, [
      validRow({ phone: "0901111111", email: "existing@example.com" }),
      validRow({ rowNumber: 3, phone: "0902222222", email: "duplicate@example.com" }),
      validRow({ rowNumber: 4, phone: "0903333333", email: "email@example.com" }),
      validRow({ rowNumber: 5, phone: "0905555555", email: "new@example.com" }),
      validRow({ rowNumber: 6, phone: "bad" }),
    ]);

    assert.equal(result.summary.imported, 2);
    assert.equal(result.summary.skipped, 1);
    assert.equal(result.summary.conflicts, 1);
    assert.equal(result.summary.errors, 1);
    assert.equal(connection.state.opening.current_students, 6);
    assert.equal(connection.state.opening.max_students, 3);
    assert.equal(connection.state.committed, true);
    assert.equal(connection.state.users.find((user) => user.id === 1).fullname, "Existing");
    const imported = result.rows.filter((row) => row.status === "IMPORTED");
    assert.equal(imported.every((row) => Boolean(row.qrToken)), true);
    assert.equal(new Set(imported.map((row) => row.qrToken)).size, 2);
  } finally {
    db.getConnection = originalGetConnection;
  }
});

test("existing-user matching follows all four phone and email rules without profile updates", async () => {
  const originalUsers = [
    { id: 1, fullname: "Same User", phone: "0901111111", email: "same@example.com" },
    { id: 2, fullname: "Phone Owner", phone: "0902222222", email: "old@example.com" },
    { id: 3, fullname: "Email Owner", phone: "0903333333", email: "email-owner@example.com" },
    { id: 4, fullname: "Conflict A", phone: "0904444444", email: "a@example.com" },
    { id: 5, fullname: "Conflict B", phone: "0905555555", email: "b@example.com" },
  ];
  const connection = createMockConnection({
    opening: { id: 17, status: "OPEN", current_students: 0, max_students: 20 },
    users: originalUsers,
  });
  const originalGetConnection = db.getConnection;
  db.getConnection = async () => connection;

  try {
    const inputRows = [
      validRow({ rowNumber: 2, fullname: "Changed Same", phone: "0901111111", email: "same@example.com" }),
      validRow({ rowNumber: 3, fullname: "Changed Phone", phone: "0902222222", email: "new@example.com" }),
      validRow({ rowNumber: 4, phone: "0999999999", email: "email-owner@example.com" }),
      validRow({ rowNumber: 5, phone: "0904444444", email: "b@example.com" }),
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(inputRows.map(({ rowNumber, ...row }) => row)),
      "Students",
    );
    const preview = await service.preview(17, {
      buffer: XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
    });

    assert.deepEqual(
      preview.rows.map((row) => row.status),
      ["READY_EXISTING", "READY_EXISTING", "NEEDS_REVIEW", "CONFLICT"],
    );

    const result = await service.confirm(17, preview.rows);

    assert.equal(result.summary.imported, 2);
    assert.equal(result.summary.needsReview, 1);
    assert.equal(result.summary.conflicts, 1);
    assert.equal(result.rows[0].status, "IMPORTED");
    assert.equal(result.rows[0].userId, 1);
    assert.equal(result.rows[1].status, "IMPORTED");
    assert.equal(result.rows[1].userId, 2);
    assert.match(result.rows[1].warnings.join(" "), /email trong Excel khác/);
    assert.equal(result.rows[2].status, "NEEDS_REVIEW");
    assert.equal(result.rows[3].status, "CONFLICT");
    assert.deepEqual(
      connection.state.users.filter((user) => user.id < 100),
      originalUsers,
    );
  } finally {
    db.getConnection = originalGetConnection;
  }
});

test("preview reads Excel and reports CLOSED/capacity warnings without transaction", async () => {
  const connection = createMockConnection({
    opening: { id: 15, status: "CLOSED", current_students: 2, max_students: 2 },
  });
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([
    ["fullname", "phone", "email", "gender", "age_group", "company", "position", "user_type", "has_project", "program_selection_status"],
    ["Preview User", "0907777777", "preview@example.com", "MALE", "26-35", "SIHUB", "Founder", "STARTUP", "Không", "NOT_SELECTED"],
  ]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
  const file = { buffer: XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) };
  const originalGetConnection = db.getConnection;
  db.getConnection = async () => connection;

  try {
    const result = await service.preview(15, file);
    assert.equal(result.summary.ready, 1);
    assert.equal(result.rows[0].status, "READY_NEW");
    assert.equal(result.warnings.some((warning) => warning.includes("CLOSED")), true);
    assert.equal(result.warnings.some((warning) => warning.includes("vượt giới hạn")), true);
    assert.equal(connection.state.began, false);
    assert.equal(connection.state.users.length, 0);
    assert.equal(connection.state.registrations.length, 0);
  } finally {
    db.getConnection = originalGetConnection;
  }
});

test("confirm rolls back user and registration when an insert fails", async () => {
  const connection = createMockConnection({
    opening: { id: 11, status: "OPEN", current_students: 0, max_students: 10 },
    failRegistrationAt: 1,
  });
  const originalGetConnection = db.getConnection;
  db.getConnection = async () => connection;

  try {
    await assert.rejects(() => service.confirm(11, [validRow()]), /forced insert failure/);
    assert.equal(connection.state.rolledBack, true);
    assert.equal(connection.state.users.length, 0);
    assert.equal(connection.state.registrations.length, 0);
    assert.equal(connection.state.opening.current_students, 0);
  } finally {
    db.getConnection = originalGetConnection;
  }
});

test("OPEN opening becomes FULL without changing max_students", async () => {
  const connection = createMockConnection({
    opening: { id: 16, status: "OPEN", current_students: 1, max_students: 2 },
  });
  const originalGetConnection = db.getConnection;
  db.getConnection = async () => connection;

  try {
    const result = await service.confirm(16, [validRow()]);
    assert.equal(result.summary.imported, 1);
    assert.equal(connection.state.opening.current_students, 2);
    assert.equal(connection.state.opening.max_students, 2);
    assert.equal(connection.state.opening.status, "FULL");
  } finally {
    db.getConnection = originalGetConnection;
  }
});

test("FINISHED opening is rejected before mutation", async () => {
  const connection = createMockConnection({
    opening: { id: 12, status: "FINISHED", current_students: 1, max_students: 10 },
  });
  const originalGetConnection = db.getConnection;
  db.getConnection = async () => connection;

  try {
    await assert.rejects(() => service.confirm(12, [validRow()]), /FINISHED/);
    assert.equal(connection.state.registrations.length, 0);
    assert.equal(connection.state.rolledBack, true);
  } finally {
    db.getConnection = originalGetConnection;
  }
});
