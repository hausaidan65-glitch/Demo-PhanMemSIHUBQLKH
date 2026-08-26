const XLSX = require("xlsx");

const {
  normalizeText,
  normalizeExcelPhone,
  decodeFilename,
} = require("./excelImportHelpers");

// =====================================================
// BASIC
// =====================================================

function clean(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function normalizeHeader(value) {
  return normalizeText(value);
}

function getValue(row, aliases = []) {
  const entries = Object.entries(row || {});

  for (const alias of aliases) {
    const normalizedAlias = normalizeHeader(alias);

    // ưu tiên match chính xác
    const exact = entries.find(
      ([key]) => normalizeHeader(key) === normalizedAlias,
    );

    if (exact) {
      return exact[1];
    }

    // sau đó mới match contains
    const includes = entries.find(([key]) =>
      normalizeHeader(key).includes(normalizedAlias),
    );

    if (includes) {
      return includes[1];
    }
  }

  return "";
}

function parseInteger(value) {
  const raw = clean(value);

  if (!raw) return null;

  const matched = raw.match(/-?\d+/);

  if (!matched) {
    return null;
  }

  const valueNumber = Number(matched[0]);

  return Number.isFinite(valueNumber) ? valueNumber : null;
}

function parseMoney(value) {
  const raw = clean(value);

  if (!raw) {
    return null;
  }

  const numberText = raw.replace(/[^\d]/g, "");

  if (!numberText) {
    return null;
  }

  const number = Number(numberText);

  return Number.isFinite(number) ? number : null;
}

function validateEmail(email) {
  if (!email) return false;

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// =====================================================
// SELECTION PROGRAM
// =====================================================

function parseSelectionProgram(value) {
  const raw = clean(value);

  const text = normalizeText(raw);

  if (text.includes("2024")) {
    return {
      selection_program: "2024",
      selection_program_other: null,
    };
  }

  if (text.includes("2025")) {
    return {
      selection_program: "2025",
      selection_program_other: null,
    };
  }

  if (text.includes("khong thuoc")) {
    return {
      selection_program: "NONE",
      selection_program_other: null,
    };
  }

  if (raw) {
    return {
      selection_program: "OTHER",
      selection_program_other: raw,
    };
  }

  return {
    selection_program: null,
    selection_program_other: null,
  };
}

// =====================================================
// CONTACT POSITION
// =====================================================

function parseContactPosition(value) {
  const raw = clean(value);

  const text = normalizeText(raw);

  if (text.includes("founder") || text.includes("ceo")) {
    return {
      contact_position: "FOUNDER_CEO",
      contact_position_other: null,
    };
  }

  if (text.includes("quan ly")) {
    return {
      contact_position: "MANAGER",
      contact_position_other: null,
    };
  }

  if (raw) {
    return {
      contact_position: "OTHER",
      contact_position_other: raw,
    };
  }

  return {
    contact_position: null,
    contact_position_other: null,
  };
}

// =====================================================
// DEVELOPMENT STAGE
// =====================================================

function parseDevelopmentStage(value) {
  const raw = clean(value);

  const text = normalizeText(raw);

  if (text.includes("y tuong")) {
    return {
      development_stage: "IDEA",
      development_stage_other: null,
    };
  }

  if (text.includes("prototype") || text.includes("mvp")) {
    return {
      development_stage: "MVP",
      development_stage_other: null,
    };
  }

  if (text.includes("khach hang") && text.includes("tra tien")) {
    return {
      development_stage: "EARLY_REVENUE",
      development_stage_other: null,
    };
  }

  if (text.includes("tang toc")) {
    return {
      development_stage: "ACCELERATION",
      development_stage_other: null,
    };
  }

  if (text.includes("tang truong")) {
    return {
      development_stage: "GROWTH",
      development_stage_other: null,
    };
  }

  if (text.includes("truong thanh")) {
    return {
      development_stage: "MATURE",
      development_stage_other: null,
    };
  }

  if (raw) {
    return {
      development_stage: "OTHER",
      development_stage_other: raw,
    };
  }

  return {
    development_stage: null,
    development_stage_other: null,
  };
}

// =====================================================
// FUNDRAISING
// =====================================================

function parseFundraisingStage(value) {
  const text = normalizeText(value);

  if (!text) return null;

  if (text.includes("pre seed")) {
    return "PRE_SEED";
  }

  if (text === "seed") {
    return "SEED";
  }

  if (text.includes("series a")) {
    return "SERIES_A";
  }

  if (text.includes("series b")) {
    return "SERIES_B";
  }

  if (text.includes("series c")) {
    return "SERIES_C";
  }

  return "OTHER";
}

// =====================================================
// FIELDS
// =====================================================

const FIELD_OPTIONS = [
  {
    keywords: ["thuong mai dien tu"],
    code: "ECOMMERCE",
    name: "Thương mại điện tử",
  },
  {
    keywords: ["cong nghe tai chinh"],
    code: "FINTECH",
    name: "Công nghệ tài chính",
  },
  {
    keywords: ["logistic"],
    code: "LOGISTICS",
    name: "Logistics",
  },
  {
    keywords: ["cong nghe giao duc"],
    code: "EDTECH",
    name: "Công nghệ giáo dục",
  },
  {
    keywords: ["y te", "cham soc suc khoe"],
    code: "HEALTHCARE",
    name: "Y tế và chăm sóc sức khỏe",
  },
  {
    keywords: ["nong nghiep cong nghe cao"],
    code: "HIGH_TECH_AGRICULTURE",
    name: "Nông nghiệp công nghệ cao",
  },
  {
    keywords: ["phat trien ben vung"],
    code: "SUSTAINABILITY",
    name: "Phát triển bền vững",
  },
  {
    keywords: ["chuyen doi so", "tri tue nhan tao"],
    code: "AI",
    name: "Chuyển đổi số, trí tuệ nhân tạo",
  },
  {
    keywords: ["an ninh mang"],
    code: "CYBERSECURITY",
    name: "An ninh mạng",
  },
  {
    keywords: ["cong nghiep van hoa"],
    code: "CULTURAL_INDUSTRY",
    name: "Công nghiệp văn hoá",
  },
  {
    keywords: ["ban dan", "vi mach"],
    code: "SEMICONDUCTOR",
    name: "Công nghệ bán dẫn, vi mạch",
  },
  {
    keywords: ["vr", "ar"],
    code: "VR_AR",
    name: "VR / AR",
  },
  {
    keywords: ["drone", "uav"],
    code: "DRONE_UAV",
    name: "DRONE / UAV",
  },
];

function parseFields(value) {
  const raw = clean(value);

  if (!raw) {
    return [];
  }

  const text = normalizeText(raw);

  const result = [];

  for (const option of FIELD_OPTIONS) {
    const matched = option.keywords.some((keyword) => text.includes(keyword));

    if (!matched) {
      continue;
    }

    if (result.some((item) => item.field_code === option.code)) {
      continue;
    }

    result.push({
      field_code: option.code,
      field_name: option.name,
      other_detail: null,
    });
  }

  if (text.includes("chua co du an")) {
    result.push({
      field_code: "NO_PROJECT",
      field_name: "Chưa có dự án khởi nghiệp",
      other_detail: null,
    });
  }

  if (result.length === 0) {
    result.push({
      field_code: "OTHER",
      field_name: "Khác",
      other_detail: raw,
    });
  }

  return result;
}

// =====================================================
// MARKETS
// =====================================================

const MARKET_OPTIONS = [
  {
    keyword: "tp ho chi minh",
    code: "HCMC",
    name: "TP. Hồ Chí Minh",
  },
  {
    keyword: "viet nam",
    code: "VIETNAM",
    name: "Việt Nam",
  },
  {
    keyword: "dong nam a",
    code: "SOUTHEAST_ASIA",
    name: "Đông Nam Á",
  },
  {
    keyword: "chau a",
    code: "ASIA",
    name: "Châu Á",
  },
  {
    keyword: "bac my",
    code: "NORTH_AMERICA",
    name: "Bắc Mỹ",
  },
  {
    keyword: "chau au",
    code: "EUROPE",
    name: "Châu Âu",
  },
  {
    keyword: "new zealand",
    code: "AU_NZ",
    name: "Úc / New Zealand",
  },
  {
    keyword: "trung dong",
    code: "MIDDLE_EAST",
    name: "Trung Đông",
  },
];

function parseMarkets(value) {
  const raw = clean(value);

  if (!raw) {
    return [];
  }

  const text = normalizeText(raw);

  const result = [];

  for (const option of MARKET_OPTIONS) {
    if (text.includes(option.keyword)) {
      result.push({
        market_code: option.code,
        market_name: option.name,
        other_detail: null,
      });
    }
  }

  if (result.length === 0) {
    result.push({
      market_code: "OTHER",
      market_name: "Khác",
      other_detail: raw,
    });
  }

  return result;
}
// =====================================================
// RECEIVED SUPPORTS - G
// =====================================================

const SUPPORT_OPTIONS = [
  {
    keywords: ["huan luyen"],
    code: "TRAINING",
    name: "Huấn luyện nâng cao năng lực",
  },
  {
    keywords: ["co van", "mentor"],
    code: "MENTOR",
    name: "Cố vấn / Mentoring",
  },
  {
    keywords: ["ket noi truong", "ket noi vien"],
    code: "UNIVERSITY_CONNECTION",
    name: "Kết nối trường / viện",
  },
  {
    keywords: ["ket noi quoc te"],
    code: "INTERNATIONAL_CONNECTION",
    name: "Kết nối quốc tế",
  },
  {
    keywords: ["co working", "coworking"],
    code: "COWORKING",
    name: "Co-working Space",
  },
  {
    keywords: ["trung bay", "gioi thieu san pham"],
    code: "EXHIBITION",
    name: "Trưng bày giới thiệu sản phẩm",
  },
  {
    keywords: ["truyen thong"],
    code: "MEDIA",
    name: "Truyền thông",
  },
  {
    keywords: ["khong gian to chuc hoi nghi", "khong gian to chuc dao tao"],
    code: "EVENT_SPACE",
    name: "Không gian tổ chức hội nghị / đào tạo",
  },
  {
    keywords: ["quy dau tu"],
    code: "INVESTOR_CONNECTION",
    name: "Kết nối quỹ đầu tư",
  },
  {
    keywords: ["to chuc tang toc"],
    code: "ACCELERATOR_CONNECTION",
    name: "Kết nối tổ chức tăng tốc",
  },
  {
    keywords: ["ho tro khoi nghiep trong va ngoai nuoc"],
    code: "STARTUP_SUPPORT",
    name: "Hỗ trợ khởi nghiệp trong và ngoài nước",
  },
  {
    keywords: ["khu vuc cong"],
    code: "PUBLIC_SECTOR_CONNECTION",
    name: "Kết nối khu vực công",
  },
  {
    keywords: ["xuc tien thuong mai"],
    code: "TRADE_PROMOTION",
    name: "Xúc tiến thương mại",
  },
  {
    keywords: ["so huu tri tue"],
    code: "IP_CONSULTING",
    name: "Tư vấn sở hữu trí tuệ",
  },
];

function parseProvider(value) {
  const raw = clean(value);
  const text = normalizeText(raw);

  if (!raw) {
    return {
      provider_code: null,
      provider_name: null,
      provider_other: null,
    };
  }

  if (text.includes("sihub")) {
    return {
      provider_code: "SIHUB",
      provider_name: "SIHUB",
      provider_other: null,
    };
  }

  if (text.includes("so kh") || text.includes("so khoa hoc")) {
    return {
      provider_code: "DOST_HCMC",
      provider_name: "Sở KH&CN TP.HCM",
      provider_other: null,
    };
  }

  return {
    provider_code: "OTHER",
    provider_name: "Khác",
    provider_other: raw,
  };
}

function parseReceivedSupports(supportValue, providerValue, detailValue = "") {
  const raw = clean(supportValue);

  if (!raw) {
    return [];
  }

  const text = normalizeText(raw);

  const provider = parseProvider(providerValue);

  const result = [];

  for (const option of SUPPORT_OPTIONS) {
    const matched = option.keywords.some((keyword) => text.includes(keyword));

    if (!matched) {
      continue;
    }

    if (result.some((item) => item.support_code === option.code)) {
      continue;
    }

    result.push({
      ...provider,

      support_code: option.code,
      support_name: option.name,

      support_detail: clean(detailValue) || null,

      support_year: null,
    });
  }

  if (result.length === 0) {
    result.push({
      ...provider,

      support_code: "OTHER",
      support_name: "Khác",

      support_detail: clean(detailValue) || raw,

      support_year: null,
    });
  }

  return result;
}
// =====================================================
// SUPPORT NEEDS - H
// =====================================================

const SUPPORT_NEED_OPTIONS = [
  {
    keywords: ["huan luyen"],
    code: "TRAINING",
    name: "Huấn luyện nâng cao năng lực các kiến thức về khởi nghiệp sáng tạo",
  },
  {
    keywords: ["trien lam", "gioi thieu san pham"],
    code: "EXHIBITION",
    name: "Triển lãm, giới thiệu sản phẩm đến thị trường",
  },
  {
    keywords: ["mentor", "co van"],
    code: "MENTOR_CONNECTION",
    name: "Kết nối với cố vấn (Mentor)",
  },
  {
    keywords: ["giay chung nhan doanh nghiep khoi nghiep sang tao"],
    code: "STARTUP_CERTIFICATE",
    name: "Đăng ký đạt giấy chứng nhận Doanh nghiệp khởi nghiệp sáng tạo",
  },
  {
    keywords: ["giay chung nhan doanh nghiep khoa hoc cong nghe"],
    code: "SCIENCE_TECH_CERTIFICATE",
    name: "Đăng ký đạt giấy chứng nhận Doanh nghiệp Khoa học công nghệ",
  },
  {
    keywords: ["tu van so huu tri tue", "so huu tri tue"],
    code: "IP_CONSULTING",
    name: "Đăng ký được hỗ trợ về tư vấn Sở hữu trí tuệ",
  },
];

function parseSupportNeeds(value) {
  const raw = clean(value);

  if (!raw) {
    return [];
  }

  const text = normalizeText(raw);

  const result = [];

  for (const option of SUPPORT_NEED_OPTIONS) {
    const matched = option.keywords.some((keyword) => text.includes(keyword));

    if (!matched) {
      continue;
    }

    if (result.some((item) => item.need_code === option.code)) {
      continue;
    }

    result.push({
      need_code: option.code,
      need_name: option.name,
      other_detail: null,
    });
  }

  if (result.length === 0) {
    result.push({
      need_code: "OTHER",
      need_name: "Khác",
      other_detail: raw,
    });
  }

  return result;
}
// =====================================================
// PARSE ONE INCUBATION ROW
// =====================================================

function parseIncubationRow(row, rowNumber) {
  const errors = [];
  const warnings = [];

  // ===================================================
  // A1
  // ===================================================

  const selection = parseSelectionProgram(
    getValue(row, ["A1. Chương trình tuyển chọn", "Chương trình tuyển chọn"]),
  );

  // ===================================================
  // B4
  // ===================================================

  const position = parseContactPosition(
    getValue(row, ["B4. Chức vụ", "Chức vụ"]),
  );

  // ===================================================
  // C5
  // ===================================================

  const development = parseDevelopmentStage(
    getValue(row, ["C5. Giai đoạn phát triển", "Giai đoạn phát triển"]),
  );

  // ===================================================
  // CONTACT
  // ===================================================

  const contactPhone = normalizeExcelPhone(
    getValue(row, ["B2. Số điện thoại", "Số điện thoại"]),
  );

  const contactEmail = clean(
    getValue(row, ["B3. Email", "Email"]),
  ).toLowerCase();

  // ===================================================
  // FINANCE
  // ===================================================

  const revenueLast3Years = parseMoney(
    getValue(row, ["D1. Doanh thu 3 năm gần nhất", "Doanh thu 3 năm gần nhất"]),
  );

  const raisedAmount = parseMoney(
    getValue(row, ["D3. Số vốn đã huy động", "Số vốn đã huy động"]),
  );

  // ===================================================
  // IP
  // ===================================================

  const patentCount = parseInteger(
    getValue(row, ["E1. Số bằng sáng chế", "Số bằng sáng chế"]),
  );

  const utilitySolutionCount = parseInteger(
    getValue(row, ["E2. Số giải pháp hữu ích", "Số giải pháp hữu ích"]),
  );

  // ===================================================
  // INTERNATIONAL
  // ===================================================

  const internationalAnswer = clean(
    getValue(row, [
      "F2. Doanh nghiệp / dự án có doanh thu hoặc khách hàng từ thị trường quốc tế không?",
      "doanh thu hoặc khách hàng từ thị trường quốc tế",
    ]),
  );

  const internationalText = normalizeText(internationalAnswer);

  const hasInternational =
    internationalText === "co" || internationalText.startsWith("co ");

  // ===================================================
  // G
  // ===================================================

  const providerValue = getValue(row, ["G1. Đơn vị hỗ trợ", "Đơn vị hỗ trợ"]);

  const receivedSupportValue = getValue(row, [
    "G2. Doanh nghiệp / dự án đã được SIHUB hỗ trợ những nội dung nào dưới đây?",
    "đã được SIHUB hỗ trợ",
  ]);

  const supportDetailValue = getValue(row, [
    "Chi tiết hỗ trợ",
    "Ghi rõ nội dung hỗ trợ",
  ]);

  // ===================================================
  // DATA
  // ===================================================

  const data = {
    incubation_program_id: null,

    // =========================
    // A
    // =========================

    ...selection,

    project_name: clean(getValue(row, ["A2. Tên dự án", "Tên dự án"])),

    company_name: clean(
      getValue(row, ["A3. Tên doanh nghiệp", "Tên doanh nghiệp"]),
    ),

    address: clean(getValue(row, ["A4. Địa chỉ", "Địa chỉ"])),

    province_city: clean(
      getValue(row, ["A7. Tỉnh / Thành phố", "Tỉnh / Thành phố"]),
    ),

    website: clean(
      getValue(row, ["A5. Website / Fanpage", "Website / Fanpage", "Website"]),
    ),

    tax_code: clean(getValue(row, ["A6. Mã số thuế", "Mã số thuế"])),

    // =========================
    // B
    // =========================

    contact_fullname: clean(getValue(row, ["B1. Họ và tên", "Họ và tên"])),

    contact_phone: contactPhone,

    contact_email: contactEmail,

    ...position,

    // =========================
    // C
    // =========================

    team_size: parseInteger(
      getValue(row, [
        "C1. Số lượng nhân sự chính thức",
        "Số lượng nhân sự chính thức",
      ]),
    ),

    part_time_jobs: parseInteger(
      getValue(row, ["C2. Số việc làm đã tạo ra", "bán thời gian"]),
    ),

    project_start_year: parseInteger(
      getValue(row, [
        "C3. Thời gian bắt đầu dự án",
        "Năm thành lập doanh nghiệp",
        "Năm bắt đầu dự án",
      ]),
    ),

    fields: parseFields(
      getValue(row, ["C4. Lĩnh vực hoạt động", "Lĩnh vực hoạt động"]),
    ),

    ...development,

    // =========================
    // D
    // =========================

    has_revenue: Number(revenueLast3Years || 0) > 0,

    revenue_last_3_years: revenueLast3Years,

    charter_capital: parseMoney(
      getValue(row, ["D2. Vốn điều lệ", "Vốn điều lệ"]),
    ),

    annual_revenue: null,

    has_raised_fund: Number(raisedAmount || 0) > 0,

    fundraising_stage: parseFundraisingStage(
      getValue(row, ["D4. Giai đoạn gọi vốn", "Giai đoạn gọi vốn"]),
    ),

    raised_amount: raisedAmount,

    fundraising_need: null,

    // =========================
    // E
    // =========================

    product_service_description: null,

    product_status: null,

    has_intellectual_property:
      Number(patentCount || 0) > 0 || Number(utilitySolutionCount || 0) > 0,

    intellectual_property_detail: null,

    patent_count: patentCount,

    utility_solution_count: utilitySolutionCount,

    product_count: parseInteger(
      getValue(row, ["E3. Số sản phẩm", "Số sản phẩm"]),
    ),

    service_count: parseInteger(
      getValue(row, ["E4. Số dịch vụ", "Số dịch vụ"]),
    ),

    customer_count: parseInteger(
      getValue(row, ["E5. Số lượng khách hàng", "Số lượng khách hàng"]),
    ),

    target_customer: null,

    // =========================
    // F
    // =========================

    markets: parseMarkets(
      getValue(row, [
        "F1. Thị trường hoạt động lớn nhất",
        "Thị trường hoạt động lớn nhất",
      ]),
    ),

    has_international_revenue: hasInternational,

    international_revenue: hasInternational
      ? (parseMoney(getValue(row, ["Doanh thu quốc tế"])) ?? 0)
      : 0,

    international_customer_count: hasInternational
      ? (parseInteger(
          getValue(row, ["Số khách hàng quốc tế", "khách hàng quốc tế"]),
        ) ?? 0)
      : 0,

    // =========================
    // G
    // =========================

    received_supports: parseReceivedSupports(
      receivedSupportValue,
      providerValue,
      supportDetailValue,
    ),

    // =========================
    // H
    // =========================

    support_needs: parseSupportNeeds(
      getValue(row, ["H. Nhu cầu được hỗ trợ", "Nhu cầu được hỗ trợ"]),
    ),

    // =========================
    // SYSTEM
    // =========================

    status: "SUBMITTED",

    admin_note: null,

    source_type: "IMPORT",
  };
  // ===================================================
  // VALIDATE A
  // ===================================================

  if (!data.selection_program) {
    errors.push("Thiếu chương trình tuyển chọn");
  }

  if (data.selection_program === "OTHER" && !data.selection_program_other) {
    errors.push("Thiếu nội dung chương trình tuyển chọn khác");
  }

  if (!data.project_name) {
    errors.push("Thiếu tên dự án");
  }

  if (!data.company_name) {
    errors.push("Thiếu tên doanh nghiệp");
  }

  if (!data.address) {
    errors.push("Thiếu địa chỉ");
  }

  if (!data.province_city) {
    errors.push("Thiếu tỉnh / thành phố");
  }

  if (!data.website) {
    errors.push("Thiếu Website / Fanpage");
  }

  if (!data.tax_code) {
    errors.push("Thiếu mã số thuế");
  }

  // ===================================================
  // VALIDATE B
  // ===================================================

  if (!data.contact_fullname) {
    errors.push("Thiếu họ tên người liên hệ");
  }

  if (
    !data.contact_phone ||
    data.contact_phone.length < 9 ||
    data.contact_phone.length > 11
  ) {
    errors.push("Số điện thoại không hợp lệ");
  }

  if (!data.contact_email || !validateEmail(data.contact_email)) {
    errors.push("Email không hợp lệ");
  }

  if (!data.contact_position) {
    errors.push("Thiếu chức vụ người liên hệ");
  }

  // ===================================================
  // VALIDATE C
  // ===================================================

  if (data.team_size === null || data.team_size < 0) {
    errors.push("Quy mô nhân sự không hợp lệ");
  }

  if (data.part_time_jobs === null || data.part_time_jobs < 0) {
    errors.push("Số việc làm bán thời gian / thời vụ không hợp lệ");
  }

  const currentYear = new Date().getFullYear();

  if (
    !Number.isInteger(data.project_start_year) ||
    data.project_start_year < 1900 ||
    data.project_start_year > currentYear
  ) {
    errors.push("Năm bắt đầu dự án không hợp lệ");
  }

  if (!data.fields.length) {
    errors.push("Thiếu lĩnh vực hoạt động");
  }

  if (!data.development_stage) {
    errors.push("Thiếu giai đoạn phát triển");
  }

  // ===================================================
  // VALIDATE D
  // ===================================================

  if (data.revenue_last_3_years === null) {
    errors.push("Thiếu doanh thu 3 năm gần nhất");
  }

  if (data.charter_capital === null) {
    errors.push("Thiếu vốn điều lệ");
  }

  if (data.raised_amount === null) {
    errors.push("Thiếu số vốn đã huy động");
  }

  if (!data.fundraising_stage) {
    errors.push("Thiếu giai đoạn gọi vốn");
  }

  // ===================================================
  // VALIDATE E
  // ===================================================

  const numberFields = [
    ["patent_count", "Số bằng sáng chế"],
    ["utility_solution_count", "Số giải pháp hữu ích"],
    ["product_count", "Số sản phẩm"],
    ["service_count", "Số dịch vụ"],
    ["customer_count", "Số khách hàng"],
  ];

  for (const [key, label] of numberFields) {
    if (data[key] === null || Number(data[key]) < 0) {
      errors.push(`${label} không hợp lệ`);
    }
  }

  // ===================================================
  // VALIDATE F
  // ===================================================

  if (!data.markets.length) {
    errors.push("Thiếu thị trường hoạt động");
  }

  // ===================================================
  // VALIDATE G
  // ===================================================

  if (!data.received_supports.length) {
    errors.push("Thiếu thông tin hỗ trợ đã nhận");
  }

  // ===================================================
  // VALIDATE H
  // ===================================================

  if (!data.support_needs.length) {
    errors.push("Thiếu nhu cầu hỗ trợ");
  }

  return {
    row: rowNumber,

    name: data.project_name || data.company_name || data.contact_fullname,

    data,

    errors,

    warnings,

    status:
      errors.length > 0 ? "ERROR" : warnings.length > 0 ? "WARNING" : "SUCCESS",
  };
}
// =====================================================
// READ INCUBATION EXCEL
// =====================================================

function readIncubationExcel(file) {
  if (!file) {
    throw new Error("Không tìm thấy file Excel.");
  }

  const originalName = decodeFilename(file.originalname || file.filename || "");

  const workbook = file.buffer
    ? XLSX.read(file.buffer, { type: "buffer" })
    : XLSX.readFile(file.path);

  if (!workbook.SheetNames?.length) {
    throw new Error("File Excel không có sheet dữ liệu.");
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: "",
    raw: false,
  });

  if (!rows.length) {
    throw new Error("File Excel không có dữ liệu.");
  }

  const parsedRows = rows.map((row, index) =>
    parseIncubationRow(row, index + 2),
  );

  const validRows = parsedRows.filter((item) => item.status !== "ERROR");

  const invalidRows = parsedRows.filter((item) => item.status === "ERROR");

  const warningRows = parsedRows.filter((item) => item.status === "WARNING");

  return {
    fileName: originalName,
    sheetName,

    totalRows: parsedRows.length,
    validRows: validRows.length,
    invalidRows: invalidRows.length,
    warningRows: warningRows.length,

    rows: parsedRows,
  };
}

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  readIncubationExcel,
  parseIncubationRow,
};
