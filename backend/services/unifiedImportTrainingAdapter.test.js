const test = require("node:test");
const assert = require("node:assert/strict");

const ImportModel = require("../models/importModel");
const Adapter = require("./unifiedImportTrainingAdapter");

function source(rowNumber = 2) {
  return {
    fileIndex: 0,
    fileName: "training.xlsx",
    sheetIndex: 0,
    sheetName: "Sheet1",
    rowNumber,
  };
}

function validRow(values = {}) {
  return {
    source: source(),
    status: "VALID",
    commitEligible: true,
    values: {
      fullname: "Nguyễn Văn A",
      phone: "0901234567",
      email: "a@test.vn",
      ...values,
    },
  };
}

function target() {
  return {
    trainingProgramId: 1,
    courseId: 2,
    openingId: 3,
    year: 2026,
  };
}

function patchModel(overrides = {}) {
  const originals = {};

  for (const [key, value] of Object.entries(overrides)) {
    originals[key] = ImportModel[key];
    ImportModel[key] = value;
  }

  return () => {
    for (const [key, value] of Object.entries(originals)) {
      ImportModel[key] = value;
    }
  };
}

test("existing user được reuse và tạo registration mới", async () => {
  let registrationPayload = null;

  const restore = patchModel({
    findUserByEmail: async () => ({
      id: 10,
      fullname: "Nguyễn Văn A",
      email: "a@test.vn",
      phone: "0901234567",
    }),
    findUserByPhone: async () => ({
      id: 10,
      fullname: "Nguyễn Văn A",
      email: "a@test.vn",
      phone: "0901234567",
    }),
    checkRegistration: async () => null,
    createRegistration: async (_connection, data) => {
      registrationPayload = data;
    },
  });

  try {
    const result = await Adapter.importRow({}, validRow(), target());

    assert.equal(result.status, "IMPORTED");
    assert.equal(result.userId, 10);
    assert.equal(result.userCreated, false);

    assert.deepEqual(registrationPayload, {
      user_id: 10,
      class_id: 3,
      project_field: null,
      startup_stage: null,
    });
  } finally {
    restore();
  }
});

test("user mới được tạo rồi đăng ký", async () => {
  let createdUser = null;

  const restore = patchModel({
    findUserByEmail: async () => null,
    findUserByPhone: async () => null,
    createUser: async (_connection, data) => {
      createdUser = data;
      return 99;
    },
    checkRegistration: async () => null,
    createRegistration: async () => {},
  });

  try {
    const result = await Adapter.importRow(
      {},
      validRow({
        organization: "SIHUB",
        position: "Nhân viên",
      }),
      target(),
    );

    assert.equal(result.status, "IMPORTED");
    assert.equal(result.userId, 99);
    assert.equal(result.userCreated, true);

    assert.equal(createdUser.fullname, "Nguyễn Văn A");
    assert.equal(createdUser.phone, "0901234567");
    assert.equal(createdUser.email, "a@test.vn");
    assert.equal(createdUser.company, "SIHUB");
    assert.equal(createdUser.position, "Nhân viên");
  } finally {
    restore();
  }
});

test("existing user email-only được reuse", async () => {
  let createUserCalled = false;

  const restore = patchModel({
    findUserByEmail: async () => ({
      id: 20,
      fullname: "Nguyễn Văn A",
      email: "a@test.vn",
      phone: "0999999999",
    }),
    findUserByPhone: async () => null,
    createUser: async () => {
      createUserCalled = true;
      return 100;
    },
    checkRegistration: async () => null,
    createRegistration: async () => {},
  });

  try {
    const result = await Adapter.importRow(
      {},
      validRow({
        phone: "",
      }),
      target(),
    );

    assert.equal(result.status, "IMPORTED");
    assert.equal(result.userId, 20);
    assert.equal(result.userCreated, false);
    assert.equal(createUserCalled, false);
  } finally {
    restore();
  }
});

test("user mới email-only bị chặn STUDENT_PHONE_REQUIRED", async () => {
  const restore = patchModel({
    findUserByEmail: async () => null,
    findUserByPhone: async () => null,
  });

  try {
    await assert.rejects(
      Adapter.importRow(
        {},
        validRow({
          phone: "",
          email: "new@test.vn",
        }),
        target(),
      ),
      (error) => error.code === "STUDENT_PHONE_REQUIRED",
    );
  } finally {
    restore();
  }
});

test("email và phone thuộc hai user khác nhau bị conflict", async () => {
  const restore = patchModel({
    findUserByEmail: async () => ({
      id: 1,
      fullname: "Nguyễn Văn A",
      email: "a@test.vn",
    }),
    findUserByPhone: async () => ({
      id: 2,
      fullname: "Nguyễn Văn A",
      phone: "0901234567",
    }),
  });

  try {
    await assert.rejects(
      Adapter.importRow({}, validRow(), target()),
      (error) => error.code === "STUDENT_IDENTITY_CONFLICT",
    );
  } finally {
    restore();
  }
});

test("registration đã tồn tại thì SKIPPED_DUPLICATE", async () => {
  let createdRegistration = false;

  const restore = patchModel({
    findUserByEmail: async () => ({
      id: 10,
      fullname: "Nguyễn Văn A",
      email: "a@test.vn",
      phone: "0901234567",
    }),
    findUserByPhone: async () => ({
      id: 10,
      fullname: "Nguyễn Văn A",
      email: "a@test.vn",
      phone: "0901234567",
    }),
    checkRegistration: async () => ({
      id: 500,
    }),
    createRegistration: async () => {
      createdRegistration = true;
    },
  });

  try {
    const result = await Adapter.importRow({}, validRow(), target());

    assert.equal(result.status, "SKIPPED_DUPLICATE");
    assert.equal(createdRegistration, false);
  } finally {
    restore();
  }
});

test("importSheet chỉ ghi row commitEligible và update current_students", async () => {
  let updateCount = 0;
  let registrationCount = 0;

  const restore = patchModel({
    findUserByEmail: async () => ({
      id: 10,
      fullname: "Nguyễn Văn A",
      email: "a@test.vn",
      phone: "0901234567",
    }),
    findUserByPhone: async () => ({
      id: 10,
      fullname: "Nguyễn Văn A",
      email: "a@test.vn",
      phone: "0901234567",
    }),
    checkRegistration: async () => null,
    createRegistration: async () => {
      registrationCount += 1;
    },
    updateCurrentStudents: async (_connection, openingId) => {
      assert.equal(openingId, 3);
      updateCount += 1;
    },
  });

  try {
    const blocked = {
      ...validRow(),
      source: source(3),
      status: "ERROR",
      commitEligible: false,
    };

    const result = await Adapter.importSheet(
      {},
      {
        source: source(),
        module: "TRAINING",
        target: target(),
        validationReady: true,
        rows: [validRow(), blocked],
      },
    );

    assert.equal(result.importedRows, 1);
    assert.equal(result.totalEligibleRows, 1);
    assert.equal(registrationCount, 1);
    assert.equal(updateCount, 1);
  } finally {
    restore();
  }
});
