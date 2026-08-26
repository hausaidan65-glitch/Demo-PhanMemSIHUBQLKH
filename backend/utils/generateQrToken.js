const crypto = require("crypto");

function generateQrToken() {
  return crypto.randomBytes(32).toString("hex");
}

module.exports = generateQrToken;
