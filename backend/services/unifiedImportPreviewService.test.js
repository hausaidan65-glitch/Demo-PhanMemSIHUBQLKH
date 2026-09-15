const test = require("node:test");
const assert = require("node:assert/strict");
const XLSX = require("xlsx");
const service = require("./unifiedImportPreviewService");

function excelFile(name, sheets) {
  const workbook = XLSX.utils.book_new();
  Object.entries(sheets).forEach(([sheetName, rows]) =>
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(rows),
      sheetName,
    ),
  );
  return {
    originalname: name,
    buffer: XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
  };
}

test("đọc nhiều file và tất cả sheet, kể cả sheet trống", async () => {
  const files = [
    excelFile("dao-tao.xlsx", {
      "Lớp A": [["Khóa đào tạo 2026"], ["Họ và tên", "SĐT"], ["An", "0901"]],
      Trống: [],
    }),
    excelFile("ket-noi.xlsx", {
      Khách: [
        ["Sự kiện kết nối"],
        ["Họ và tên", "Email"],
        ["Bình", "b@example.com"],
      ],
    }),
  ];
  const result = await service.previewFiles(files);
  assert.equal(result.totalFiles, 2);
  assert.equal(result.totalSheets, 3);
  assert.equal(result.files[0].sheets[1].empty, true);
  assert.equal(result.canCommit, false);
});

test("phát hiện header không ở dòng 1 và giữ file/sheet/row number", async () => {
  const file = excelFile("input.xlsx", {
    Data: [
      ["Danh sách học viên khóa đào tạo"],
      ["Thời gian", "2026"],
      [],
      ["Họ và tên", "Số điện thoại"],
      ["Lan", "0902"],
    ],
  });
  const sheet = (await service.previewFiles([file])).files[0].sheets[0];
  assert.equal(sheet.header.rowNumber, 4);
  assert.equal(sheet.rows[0].source.rowNumber, 5);
  assert.equal(sheet.rows[0].source.fileName, "input.xlsx");
  assert.equal(sheet.rows[0].source.sheetName, "Data");
});

test("bỏ qua identity trống và footer nhưng vẫn đọc dòng sau", async () => {
  const file = excelFile("rows.xlsx", {
    Data: [
      ["Danh sách học viên khóa đào tạo"],
      ["Họ và tên", "Email"],
      ["", "ghost@example.com"],
      ["Tổng cộng", "1"],
      ["Hợp lệ", "ok@example.com"],
    ],
  });
  const sheet = (await service.previewFiles([file])).files[0].sheets[0];
  assert.deepEqual(
    sheet.rows.map((row) => row.status),
    ["SKIPPED", "SKIPPED", "VALID"],
  );
  assert.equal(sheet.summary.valid, 1);
  assert.equal(sheet.summary.skipped, 2);
});

test("phân loại năm SAFE, PARTIAL, INVALID, MIXED và UNDATED", () => {
  assert.equal(
    service.parseDateEvidence([[new Date("2026-05-20")]]).status,
    "SAFE",
  );
  assert.equal(
    service.parseDateEvidence([["Kế hoạch năm 2026"]]).status,
    "PARTIAL",
  );
  assert.equal(service.parseDateEvidence([["31/02/2026"]]).status, "INVALID");
  assert.equal(
    service.parseDateEvidence([["01/01/2025", "02/01/2026"]]).status,
    "MIXED",
  );
  assert.equal(
    service.parseDateEvidence([["không có ngày"]]).status,
    "UNDATED",
  );
});

test("module không xác định không bị đoán cưỡng ép", async () => {
  const file = excelFile("du-lieu.xlsx", {
    Sheet1: [
      ["Họ và tên", "Email"],
      ["An", "a@example.com"],
    ],
  });
  const suggestion = (await service.previewFiles([file])).files[0].sheets[0]
    .moduleSuggestion;
  assert.equal(suggestion.selected, null);
  assert.equal(suggestion.requiresAdminSelection, true);
  assert.ok(suggestion.candidates.length > 1);
});

test("gợi ý target DB chỉ khi có bằng chứng tên/năm", async () => {
  const file = excelFile("training.xlsx", {
    Lop: [
      ["Khóa đào tạo Kỹ năng bán hàng"],
      ["Ngày 01/03/2026"],
      ["Họ và tên", "Email"],
      ["An", "a@example.com"],
    ],
  });
  const catalog = {
    programs: [{ id: 7, name: "Kỹ năng bán hàng", year: 2026 }],
  };
  const sheet = (await service.previewFiles([file], catalog)).files[0]
    .sheets[0];
  assert.equal(sheet.targetSuggestions.flat[0].id, 7);
  assert.ok(sheet.targetSuggestions.flat[0].score >= 50);
});

test("batch hỗn hợp 7 file giữ module và năm độc lập", async () => {
  const files = [
    excelFile("a.xlsx", {
      Data: [
        ["Khóa đào tạo"],
        ["Ngày 01/02/2025"],
        ["Họ và tên", "Email"],
        ["A", "a@x.vn"],
      ],
    }),
    excelFile("b.xlsx", {
      Data: [
        ["Khóa đào tạo"],
        ["Ngày 01/02/2026"],
        ["Họ và tên", "Email"],
        ["B", "b@x.vn"],
      ],
    }),
    excelFile("c.xlsx", {
      Data: [["Hội thảo"], ["Họ và tên", "Email"], ["C", "c@x.vn"]],
    }),
    excelFile("d.xlsx", {
      Data: [["Triển lãm"], ["Họ và tên", "Email"], ["D", "d@x.vn"]],
    }),
    excelFile("e.xlsx", {
      Data: [["Sự kiện kết nối"], ["Họ và tên", "Email"], ["E", "e@x.vn"]],
    }),
    excelFile("f.xlsx", {
      Data: [
        ["Hồ sơ ươm tạo"],
        [
          "A2. Tên dự án",
          "B1. Họ và tên",
          "D1. Doanh thu 3 năm gần nhất",
          "E1. Số bằng sáng chế",
        ],
        ["F", "Founder F", "1", "0"],
      ],
    }),
    excelFile("g.xlsx", {
      Data: [
        ["Họ và tên", "Email", "Đơn vị"],
        ["G", "g@x.vn", "SIHUB"],
      ],
    }),
  ];
  const result = await service.previewFiles(files);
  assert.equal(result.summary.totalFiles, 7);
  assert.equal(result.summary.totalSheets, 7);
  assert.deepEqual(
    result.files.map((file) => file.sheets[0].moduleSuggestion.selected),
    [
      "TRAINING",
      "TRAINING",
      "SEMINAR",
      "EXHIBITION",
      "NETWORKING",
      "INCUBATION",
      null,
    ],
  );
  assert.deepEqual(
    result.files.slice(0, 2).map((file) => file.sheets[0].year.years),
    [[2025], [2026]],
  );
  assert.equal(
    result.files[6].sheets[0].moduleSuggestion.requiresAdminSelection,
    true,
  );
});

test("ma trận nhận diện ưu tiên content và giữ null khi gần điểm", async (t) => {
  const cases = [
    ["Hội thảo", "SEMINAR"],
    ["Triển lãm", "EXHIBITION"],
    ["Sự kiện kết nối", "NETWORKING"],
  ];
  for (const [metadata, expected] of cases) {
    await t.test(metadata, async () => {
      const sheet = (
        await service.previewFiles([
          excelFile("x.xlsx", {
            Data: [[metadata], ["Họ và tên", "Email"], ["A", "a@x.vn"]],
          }),
        ])
      ).files[0].sheets[0];
      assert.equal(sheet.moduleSuggestion.selected, expected);
      assert.ok(
        sheet.moduleSuggestion.margin >=
          sheet.moduleSuggestion.threshold.minimumMargin,
      );
    });
  }
  await t.test("filename Training nhưng content Seminar", async () => {
    const sheet = (
      await service.previewFiles([
        excelFile("training-2026.xlsx", {
          Data: [["Hội thảo"], ["Họ và tên", "Email"], ["A", "a@x.vn"]],
        }),
      ])
    ).files[0].sheets[0];
    assert.equal(sheet.moduleSuggestion.selected, "SEMINAR");
  });
  await t.test("sheet HT nhưng content Networking", async () => {
    const sheet = (
      await service.previewFiles([
        excelFile("x.xlsx", {
          HT: [["Sự kiện kết nối"], ["Họ và tên", "Email"], ["A", "a@x.vn"]],
        }),
      ])
    ).files[0].sheets[0];
    assert.equal(sheet.moduleSuggestion.selected, "NETWORKING");
  });
  await t.test("Training Google Form có field startup", async () => {
    const sheet = (
      await service.previewFiles([
        excelFile("x.xlsx", {
          Data: [
            ["Đăng ký khóa đào tạo"],
            [
              "Họ và tên",
              "Email",
              "Tên dự án",
              "Lĩnh vực dự án",
              "Giai đoạn dự án",
            ],
            ["A", "a@x.vn", "P", "Tech", "MVP"],
          ],
        }),
      ])
    ).files[0].sheets[0];
    assert.equal(sheet.moduleSuggestion.selected, "TRAINING");
  });
  await t.test("hai module cùng bằng chứng thì không chọn", async () => {
    const sheet = (
      await service.previewFiles([
        excelFile("x.xlsx", {
          Data: [
            ["Hội thảo trong Triển lãm"],
            ["Họ và tên", "Email"],
            ["A", "a@x.vn"],
          ],
        }),
      ])
    ).files[0].sheets[0];
    assert.equal(sheet.moduleSuggestion.selected, null);
    assert.ok(sheet.moduleSuggestion.margin < 12);
  });
  for (const metadata of [
    "Hội thảo Triển lãm",
    "Hội thảo Sự kiện kết nối",
    "Triển lãm Sự kiện kết nối",
  ]) {
    await t.test(`xung đột ${metadata}`, async () => {
      const sheet = (
        await service.previewFiles([
          excelFile("x.xlsx", {
            Data: [[metadata], ["Họ và tên", "Email"], ["A", "a@x.vn"]],
          }),
        ])
      ).files[0].sheets[0];
      assert.equal(sheet.moduleSuggestion.selected, null);
      assert.ok(
        sheet.moduleSuggestion.margin <
          sheet.moduleSuggestion.threshold.minimumMargin,
      );
    });
  }
  await t.test(
    "Ươm tạo có field giống participant nhưng có field đặc thù",
    async () => {
      const sheet = (
        await service.previewFiles([
          excelFile("x.xlsx", {
            Data: [
              ["Hồ sơ ươm tạo"],
              [
                "B1. Họ và tên",
                "B3. Email",
                "A2. Tên dự án",
                "D1. Doanh thu 3 năm gần nhất",
              ],
              ["A", "a@x.vn", "P", "1"],
            ],
          }),
        ])
      ).files[0].sheets[0];
      assert.equal(sheet.moduleSuggestion.selected, "INCUBATION");
    },
  );
});

test("hai file trùng tên và file lỗi không làm dừng batch", async () => {
  const valid = excelFile("trung-ten.xlsx", {
    A: [["Hội thảo"], ["Họ và tên", "Email"], ["A", "a@x.vn"]],
    B: [],
  });
  const invalid = {
    originalname: "hong.xlsx",
    buffer: Buffer.from("không phải excel"),
  };
  const result = await service.previewFiles([valid, invalid, { ...valid }]);
  assert.equal(result.files.length, 3);
  assert.equal(result.files[1].status, "ERROR");
  assert.equal(result.files[0].status, "READY");
  assert.equal(result.files[2].status, "READY");
  assert.equal(result.files[0].fileName, result.files[2].fileName);
  assert.notEqual(result.files[0].fileIndex, result.files[2].fileIndex);
  assert.equal(result.summary.errors, 1);
  assert.equal(result.summary.totalSheets, 4);
});

test("một sheet lỗi không làm dừng các sheet cùng file", async () => {
  const file = excelFile("multi.xlsx", {
    Tot: [["Hội thảo"], ["Họ và tên", "Email"], ["A", "a@x.vn"]],
    Hong: [["x"]],
    Sau: [["Triển lãm"], ["Họ và tên", "Email"], ["B", "b@x.vn"]],
  });
  const original = XLSX.utils.sheet_to_json;
  let call = 0;
  XLSX.utils.sheet_to_json = (...args) => {
    call += 1;
    if (call === 2) throw new Error("forced sheet error");
    return original(...args);
  };
  try {
    const result = await service.previewFiles([file]);
    assert.deepEqual(
      result.files[0].sheets.map((sheet) => sheet.status),
      ["READY", "ERROR", "READY"],
    );
    assert.equal(result.files[0].status, "PARTIAL");
    assert.equal(result.summary.errors, 1);
  } finally {
    XLSX.utils.sheet_to_json = original;
  }
});

test("year status độc lập giữa sheet MIXED, INVALID và UNDATED", async () => {
  const file = excelFile("years.xlsx", {
    Mixed: [
      ["Khóa đào tạo"],
      ["01/01/2025", "01/01/2026"],
      ["Họ và tên", "Email"],
      ["A", "a@x.vn"],
    ],
    Invalid: [
      ["Khóa đào tạo"],
      ["31/02/2026"],
      ["Họ và tên", "Email"],
      ["B", "b@x.vn"],
    ],
    Undated: [["Khóa đào tạo"], ["Họ và tên", "Email"], ["C", "c@x.vn"]],
  });
  const result = await service.previewFiles([file]);
  assert.deepEqual(
    result.files[0].sheets.map((sheet) => sheet.year.status),
    ["MIXED", "INVALID", "UNDATED"],
  );
});

test("target Training đúng hierarchy và target không vượt module", async () => {
  const catalog = {
    missions: [
      { id: 1, name: "Mission SME" },
      { id: 2, name: "Mission khác" },
    ],

    programs: [
      { id: 10, name: "Nhiệm vụ đào tạo SME", mission_id: 1, year: 2026 },
      { id: 11, name: "Nhiệm vụ đào tạo sai", mission_id: 2, year: 2026 },
    ],

    courses: [
      { id: 20, name: "Khóa bán hàng", program_id: 10 },
      { id: 21, name: "Khóa sai", program_id: 11 },
    ],

    openings: [
      { id: 30, name: "Đợt tháng 3", course_id: 20, start_date: "2026-03-01" },
      { id: 31, name: "Đợt sai", course_id: 21, start_date: "2026-03-01" },
    ],

    startupEvents: [
      {
        id: 99,
        name: "Khóa bán hàng",
        type: "SEMINAR",
        start_date: "2026-03-01",
      },
    ],
  };

  const file = excelFile("x.xlsx", {
    Data: [
      ["Khóa đào tạo Nhiệm vụ đào tạo SME Khóa bán hàng Đợt tháng 3"],
      ["01/03/2026"],
      ["Họ và tên", "Email"],
      ["A", "a@x.vn"],
    ],
  });

  const sheet = (await service.previewFiles([file], catalog)).files[0]
    .sheets[0];

  assert.equal(sheet.targetSuggestions.module, "TRAINING");

  assert.deepEqual(
    sheet.targetSuggestions.hierarchy.trainingPrograms.map((item) => item.id),
    [10],
  );

  assert.deepEqual(
    sheet.targetSuggestions.hierarchy.courses.map((item) => item.id),
    [20],
  );

  assert.deepEqual(
    sheet.targetSuggestions.hierarchy.openings.map((item) => item.id),
    [30],
  );

  assert.ok(!sheet.targetSuggestions.flat.some((item) => item.id === 99));
});

test("Training tự khóa cha-con từ Khóa/Đợt DB duy nhất dù tên Nhiệm vụ bị trùng", async () => {
  const catalog = {
    programs: [
      { id: 10, name: "Nhiệm vụ SME", year: 2025 },
      { id: 11, name: "Nhiệm vụ SME", year: 2026 },
    ],
    courses: [
      { id: 20, name: "Kỹ năng thuyết trình", program_id: 10 },
      { id: 21, name: "Khóa khác", program_id: 11 },
    ],
    openings: [
      { id: 30, name: "Đợt 1", course_id: 20 },
      { id: 31, name: "Đợt 1", course_id: 21 },
    ],
  };
  const file = excelFile("training.xlsx", {
    Data: [
      ["Kỹ năng thuyết trình - Đợt 1"],
      ["Họ và tên", "Email"],
      ["A", "a@x.vn"],
    ],
  });
  const sheet = (await service.previewFiles([file], catalog)).files[0]
    .sheets[0];

  assert.equal(sheet.moduleSuggestion.selected, "TRAINING");
  assert.deepEqual(sheet.targetSuggestions.selection, {
    trainingProgramId: 10,
    courseId: 20,
    openingId: 30,
    confidence: "CERTAIN_DB_RELATION",
    requiresAdminSelection: false,
    missingOpening: false,
    evidence: ["DB_COURSE_PROGRAM_RELATION", "DB_OPENING_COURSE_RELATION"],
  });
});

test("Training thiếu Đợt vẫn tự chọn Nhiệm vụ và Khóa chắc chắn", async () => {
  const catalog = {
    programs: [{ id: 10, name: "Nhiệm vụ Thuế", year: 2026 }],
    courses: [{ id: 20, name: "Khai báo thuế", program_id: 10 }],
    openings: [],
  };
  const file = excelFile("training.xlsx", {
    Data: [
      ["Khai báo thuế"],
      ["Họ và tên", "Email"],
      ["A", "a@x.vn"],
    ],
  });
  const sheet = (await service.previewFiles([file], catalog)).files[0]
    .sheets[0];

  assert.equal(sheet.targetSuggestions.selection.trainingProgramId, 10);
  assert.equal(sheet.targetSuggestions.selection.courseId, 20);
  assert.equal(sheet.targetSuggestions.selection.openingId, null);
  assert.equal(sheet.targetSuggestions.selection.missingOpening, true);
});

test("Lớp 10 không bị ép match Đợt Lớp 1/2/3", async () => {
  const catalog = {
    programs: [{ id: 19, name: "Kiến thức nền tảng", year: 2026 }],
    courses: [{ id: 42, name: "Thiết kế mô hình kinh doanh", program_id: 19 }],
    openings: [
      { id: 119, name: "Lớp 1", course_id: 42 },
      { id: 120, name: "Lớp 2", course_id: 42 },
      { id: 229, name: "Lớp 3", course_id: 42 },
    ],
  };
  const file = excelFile("cthl.xlsx", {
    "Lớp 10": [
      ["Kiến thức nền tảng - Lớp 10"],
      ["Họ và tên", "Email"],
      ["A", "a@x.vn"],
    ],
  });
  const sheet = (await service.previewFiles([file], catalog)).files[0]
    .sheets[0];

  assert.equal(sheet.targetSuggestions.selection.openingId, null);
  assert.equal(sheet.targetSuggestions.selection.requiresAdminSelection, true);
});

test("auto-map giữ duy nhất cột organization có bằng chứng mạnh nhất", async () => {
  const file = excelFile("DS_Lop_1.xlsx", {
    Data: [
      ["Họ và tên", "Đơn vị công tác", "Địa chỉ công ty", "Email"],
      ...Array.from({ length: 74 }, (_, index) => [
        `Học viên ${index + 1}`,
        "SIHUB",
        "123 Trương Định",
        `hocvien${index + 1}@example.com`,
      ]),
    ],
  });
  const sheet = (await service.previewFiles([file])).files[0].sheets[0];
  const byHeader = Object.fromEntries(
    sheet.header.columns.map((column) => [column.name, column.mappedField]),
  );

  assert.equal(byHeader["Đơn vị công tác"], "organization");
  assert.equal(byHeader["Địa chỉ công ty"], null);
  assert.equal(
    sheet.header.columns.filter((column) => column.mappedField === "organization").length,
    1,
  );
  assert.equal(sheet.summary.valid, 74);
});
