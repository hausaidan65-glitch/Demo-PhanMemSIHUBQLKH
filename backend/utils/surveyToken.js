const crypto = require("crypto");

const SURVEY_LINK_SECRET =
  process.env.SURVEY_LINK_SECRET || "sihub_course_survey_secret_2026";

const TOKEN_LENGTH = 40;

function buildPayload(classId, classCode) {
  return `${classId}:${String(classCode || "").trim()}`;
}

function createSurveyToken(classId, classCode) {
  return crypto
    .createHmac("sha256", SURVEY_LINK_SECRET)
    .update(buildPayload(classId, classCode))
    .digest("hex")
    .slice(0, TOKEN_LENGTH);
}

function verifySurveyToken(classId, classCode, token) {
  if (!token || typeof token !== "string") {
    return false;
  }

  const expected = Buffer.from(createSurveyToken(classId, classCode));
  const received = Buffer.from(token);

  if (expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, received);
}

module.exports = {
  createSurveyToken,
  verifySurveyToken,
};
