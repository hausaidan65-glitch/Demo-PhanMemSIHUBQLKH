const test = require("node:test");
const assert = require("node:assert/strict");

const RegistrationModel = require("./registrationModel");

test("Google Form create can preserve unknown has_project as NULL", async () => {
  let insertParams;
  const connection = {
    query: async (_sql, params) => {
      insertParams = params;
      return [{ insertId: 123 }];
    },
  };

  const id = await RegistrationModel.create(connection, {
    user_id: 1,
    class_id: 2,
    has_project: null,
    preserve_has_project_unknown: true,
    project_field: "Lĩnh vực Công nghệ giáo dục",
    qr_token: "test-token",
  });

  assert.equal(id, 123);
  assert.equal(insertParams[3], null);
  assert.equal(insertParams[5], "Lĩnh vực Công nghệ giáo dục");
});

test("legacy create behavior still stores missing has_project as false", async () => {
  let insertParams;
  const connection = {
    query: async (_sql, params) => {
      insertParams = params;
      return [{ insertId: 124 }];
    },
  };

  await RegistrationModel.create(connection, {
    user_id: 1,
    class_id: 2,
    qr_token: "legacy-token",
  });

  assert.equal(insertParams[3], 0);
});
