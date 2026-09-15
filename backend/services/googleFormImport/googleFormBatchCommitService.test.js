const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildRegistrationData,
  normalizeBoolean,
} = require("./googleFormBatchCommitService");

test("has_project missing stays unknown and preserves project data", () => {
  const data = buildRegistrationData({
    project_field: "Lĩnh vực Công nghệ giáo dục",
    project_stage: "Giai đoạn ý tưởng",
    project_description: "Mô tả dự án",
    team_size: "3 người",
  });

  assert.equal(data.has_project, null);
  assert.equal(data.project_field, "Lĩnh vực Công nghệ giáo dục");
  assert.equal(data.startup_stage, "Giai đoạn ý tưởng");
  assert.equal(data.project_description, "Mô tả dự án");
  assert.equal(data.team_size, "3 người");
});

test("explicit has_project false keeps the existing clearing rule", () => {
  const data = buildRegistrationData({
    has_project: "Không",
    project_name: "Không được lưu",
    project_field: "Không được lưu",
    project_stage: "Không được lưu",
    project_description: "Không được lưu",
    team_size: "5",
  });

  assert.equal(data.has_project, false);
  assert.equal(data.project_name, null);
  assert.equal(data.project_field, null);
  assert.equal(data.startup_stage, null);
  assert.equal(data.project_description, null);
  assert.equal(data.team_size, null);
});

test("normalizeBoolean only returns false for explicit negative answers", () => {
  assert.equal(normalizeBoolean(undefined), null);
  assert.equal(normalizeBoolean(""), null);
  assert.equal(normalizeBoolean("Không"), false);
  assert.equal(normalizeBoolean("Chưa có ý tưởng"), false);
  assert.equal(normalizeBoolean("Đã có ý tưởng"), true);
});
