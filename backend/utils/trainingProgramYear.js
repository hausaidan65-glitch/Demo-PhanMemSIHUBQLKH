function parseTrainingProgramYear(source = {}) {
  if (!Object.prototype.hasOwnProperty.call(source, "year") || source.year === undefined) {
    return { provided: false, value: null };
  }

  if (source.year === null) {
    return { provided: true, value: null };
  }

  if (typeof source.year !== "string" && typeof source.year !== "number") {
    return { error: "Năm khóa đào tạo không hợp lệ." };
  }

  const rawValue = String(source.year).trim();
  if (rawValue === "") {
    return { provided: true, value: null };
  }

  if (!/^\d+$/.test(rawValue)) {
    return { error: "Năm khóa đào tạo không hợp lệ." };
  }

  const value = Number(rawValue);
  if (!Number.isInteger(value) || value < 2000 || value > 2100) {
    return { error: "Năm khóa đào tạo phải nằm trong khoảng từ 2000 đến 2100." };
  }

  return { provided: true, value };
}

module.exports = { parseTrainingProgramYear };
