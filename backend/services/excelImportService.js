const XLSX = require("xlsx");

// ===============================
// CLEAN
// ===============================

function clean(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return value.toString().trim();
}

// ===============================
// FIND COLUMN
// ===============================

function getValue(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined) {
      return row[key];
    }
  }

  return "";
}
function cleanPhone(phone) {
  if (!phone) return "";

  return phone.toString().replace(/[^\d]/g, "").trim();
}
// ===============================
// VALIDATE
// ===============================

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  return /^0[0-9]{9}$/.test(phone);
}

// ===============================
// CONVERT
// ===============================

function convertGender(value) {
  const text = clean(value).toLowerCase();

  if (text === "nam") return "MALE";

  if (text === "nữ" || text === "nu") return "FEMALE";

  if (!text) return null;

  return "OTHER";
}

function convertUserType(value) {
  const text = clean(value).toLowerCase();

  if (text.includes("startup")) return "STARTUP";

  if (text.includes("sinh viên") || text.includes("sinh vien"))
    return "STUDENT";

  if (text.includes("doanh nghiệp") || text.includes("doanh nghiep"))
    return "BUSINESS";

  return "OTHER";
}

// ===============================
// READ EXCEL
// ===============================

async function readExcel(filePath) {
  const workbook = XLSX.readFile(filePath);

  const rows = [];

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json(sheet);

    data.forEach((row) => {
      rows.push({
        ...row,
        _sheet_name: sheetName,
      });
    });
  });

  return rows;
}
// ===============================
// EXTRACT COURSE NAMES
// ===============================

function extractCourseNames(value) {
  const text = clean(value);

  if (!text) {
    return [];
  }

  const courseNames = [];

  if (
    text
      .toLowerCase()
      .includes("thiết kế mô hình kinh doanh hiệu quả cho dự án khởi nghiệp")
  ) {
    courseNames.push("Thiết kế mô hình kinh doanh");
  }

  if (
    text
      .toLowerCase()
      .includes("kỹ năng lập và phát triển dự án khởi nghiệp sáng tạo")
  ) {
    courseNames.push("Kỹ năng lập và phát triển dự án khởi nghiệp sáng tạo");
  }

  if (
    text
      .toLowerCase()
      .includes(
        "nghiên cứu thị trường, kiểm chứng mô hình và xây dựng đội ngũ khởi nghiệp",
      )
  ) {
    courseNames.push("Nghiên cứu thị trường");
  }

  return [...new Set(courseNames)];
}
// ===============================
// MAIN VALIDATE
// ===============================

async function validateExcel(filePath) {
  const rows = await readExcel(filePath);
  console.log("EXCEL COLUMNS:", Object.keys(rows[0] || {}));
  console.log("FIRST ROW:", rows[0]);

  const validRows = [];

  const errorRows = [];

  const warningRows = [];

  const phoneOwnerMap = new Map();

  const duplicateMap = new Map();
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const rawCourseValue = clean(
      getValue(row, [
        "Bạn đăng ký khóa huấn luyện nào dưới đây?",
        "Khóa huấn luyện",
        "Khóa học",
        "Tên khóa học",
      ]),
    );

    const courseNames = extractCourseNames(rawCourseValue);
    const errors = [];

    const warnings = [];

    const fullname = clean(
      getValue(row, ["Họ và Tên", "Họ tên", "Tên học viên"]),
    );

    const phone = cleanPhone(
      getValue(row, ["Số điện thoại", "Điện thoại", "SĐT"]),
    );
    if (phone) {
      const key = `${phone}_${courseNames.join(",")}`;

      if (duplicateMap.has(key)) {
        warnings.push(
          `Dữ liệu trùng với dòng ${duplicateMap.get(key)} trong file`,
        );
      } else {
        duplicateMap.set(key, rowNumber);
      }
    }
    const email = clean(
      getValue(row, ["Email", "Email cá nhân"]),
    ).toLowerCase();

    const gender = convertGender(getValue(row, ["Giới tính", "Gender"]));

    const company = clean(getValue(row, ["Đơn vị", "Công ty", "Doanh nghiệp"]));

    const position = clean(getValue(row, ["Chức vụ", "Vị trí"]));

    const data = {
      fullname,

      phone,

      email,

      gender,

      age_group: clean(getValue(row, ["Nhóm tuổi", "Độ tuổi"])),

      company,

      position,

      user_type: convertUserType(
        getValue(row, ["Loại người dùng", "Đối tượng"]),
      ),

      course_names: courseNames,

      raw_course_value: rawCourseValue,

      project_field: clean(getValue(row, ["Lĩnh vực dự án"])),

      startup_stage: clean(getValue(row, ["Giai đoạn startup"])),
    };

    // ====================
    // ERROR
    // ====================

    if (!fullname) {
      errors.push("Thiếu họ tên");
    }

    if (!phone) {
      warnings.push("Thiếu số điện thoại");
    } else if (!validatePhone(phone)) {
      errors.push("Số điện thoại không hợp lệ");
    }
    if (!email) {
      errors.push("Thiếu email");
    } else if (!validateEmail(email)) {
      errors.push("Email không hợp lệ");
    }
    if (courseNames.length === 0) {
      errors.push("Không xác định được khóa học đã đăng ký");
    }

    // ====================
    // WARNING
    // ====================

    if (!gender) {
      warnings.push("Chưa nhập giới tính");
    }

    if (!company) {
      warnings.push("Chưa nhập đơn vị");
    }

    if (phone) {
      const existedName = phoneOwnerMap.get(phone);

      if (!existedName) {
        phoneOwnerMap.set(phone, fullname);
      } else if (
        existedName.trim().toLowerCase() !== fullname.trim().toLowerCase()
      ) {
        warnings.push(
          `Số điện thoại đang được dùng bởi "${existedName}" trong file`,
        );
      }
    }

    const result = {
      row: rowNumber,

      name: fullname,

      data,

      errors,

      warnings,

      status:
        errors.length > 0
          ? "ERROR"
          : warnings.length > 0
            ? "WARNING"
            : "SUCCESS",
    };

    if (result.status === "ERROR") {
      errorRows.push(result);
    } else {
      validRows.push(result);
    }

    if (warnings.length > 0) {
      warningRows.push(result);
    }
  });

  return {
    totalRows: rows.length,

    successRows: validRows.length,

    errorRows: errorRows.length,

    validRows: validRows.map((item) => item.data),

    errors: errorRows,

    warningRows: warningRows.length,
  };
}

module.exports = {
  validateExcel,
};
