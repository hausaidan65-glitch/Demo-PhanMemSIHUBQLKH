const db = require("../config/db");
const IncubationProgramModel = require("../models/incubationProgramModel");
const IncubationProfileModel = require("../models/incubationProfileModel");

class IncubationProgramController {
  // =========================================================
  // PUBLIC APPLY - NỘP HỒ SƠ CHƯƠNG TRÌNH ƯƠM TẠO
  // FORM ĐẦY ĐỦ A -> H
  // =========================================================
  static async apply(req, res) {
    const connection = await db.getConnection();

    try {
      // =====================================================
      // 1. PROGRAM ID
      // =====================================================
      const programId = Number(req.params.id);

      if (!Number.isInteger(programId) || programId <= 0) {
        return res.status(400).json({
          success: false,
          message: "ID chương trình không hợp lệ.",
        });
      }

      // =====================================================
      // 2. KIỂM TRA CHƯƠNG TRÌNH
      // =====================================================
      const program = await IncubationProgramModel.findById(programId);

      if (!program) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy Chương trình ươm tạo.",
        });
      }

      if (String(program.status || "").toUpperCase() !== "OPEN") {
        return res.status(400).json({
          success: false,
          message: "Chương trình hiện không mở nhận hồ sơ.",
        });
      }

      // =====================================================
      // 3. KIỂM TRA SỐ LƯỢNG HỒ SƠ
      // =====================================================
      const maxProfiles = Number(program.max_profiles) || 0;

      const totalProfiles = Number(program.total_profiles) || 0;

      if (maxProfiles > 0 && totalProfiles >= maxProfiles) {
        return res.status(409).json({
          success: false,
          message: "Chương trình đã đủ số lượng hồ sơ đăng ký.",
        });
      }

      const body = req.body || {};

      // =====================================================
      // A. THÔNG TIN DỰ ÁN / DOANH NGHIỆP
      // =====================================================
      const selectionProgram = String(body.selection_program || "").trim();

      const selectionProgramOther = String(
        body.selection_program_other || "",
      ).trim();

      const projectName = String(body.project_name || "").trim();

      const companyName = String(body.company_name || "").trim();

      const address = String(body.address || "").trim();

      const provinceCity = String(body.province_city || "").trim();

      const website = String(body.website || "").trim();

      const taxCode = String(body.tax_code || "").trim();

      // =====================================================
      // B. NGƯỜI LIÊN HỆ
      // =====================================================
      const contactFullname = String(body.contact_fullname || "").trim();

      const contactPhone = String(body.contact_phone || "").replace(/\D/g, "");

      const contactEmail = String(body.contact_email || "")
        .trim()
        .toLowerCase();

      const contactPosition = String(body.contact_position || "").trim();

      const contactPositionOther = String(
        body.contact_position_other || "",
      ).trim();

      // =====================================================
      // C. QUY MÔ / LĨNH VỰC / GIAI ĐOẠN
      // =====================================================
      const fields = Array.isArray(body.fields) ? body.fields : [];

      const teamSize = body.team_size;

      const partTimeJobs = body.part_time_jobs;

      const projectStartYear = body.project_start_year;

      const developmentStage = String(body.development_stage || "").trim();

      const developmentStageOther = String(
        body.development_stage_other || "",
      ).trim();

      // =====================================================
      // D. TÀI CHÍNH / GỌI VỐN
      // =====================================================
      const revenueLast3Years = body.revenue_last_3_years;

      const charterCapital = body.charter_capital;

      const raisedAmount = body.raised_amount;

      const fundraisingStage = String(body.fundraising_stage || "").trim();

      // =====================================================
      // E. SẢN PHẨM / SHTT
      // =====================================================
      const patentCount = body.patent_count;

      const utilitySolutionCount = body.utility_solution_count;

      const productCount = body.product_count;

      const serviceCount = body.service_count;

      const customerCount = body.customer_count;

      // =====================================================
      // F. THỊ TRƯỜNG
      // =====================================================
      const markets = Array.isArray(body.markets) ? body.markets : [];

      const hasInternationalRevenue =
        body.has_international_revenue === true ||
        body.has_international_revenue === 1 ||
        body.has_international_revenue === "1" ||
        body.has_international_revenue === "true";

      const internationalRevenue = body.international_revenue;

      const internationalCustomerCount = body.international_customer_count;

      // =====================================================
      // G. HỖ TRỢ ĐÃ NHẬN
      // =====================================================
      const receivedSupports = Array.isArray(body.received_supports)
        ? body.received_supports
        : [];

      // =====================================================
      // H. NHU CẦU HỖ TRỢ
      // =====================================================
      const supportNeeds = Array.isArray(body.support_needs)
        ? body.support_needs
        : [];

      // =====================================================
      // 4. VALIDATE A
      // =====================================================
      if (!selectionProgram) {
        return res.status(422).json({
          success: false,
          message: "Vui lòng chọn thông tin chương trình tuyển chọn.",
        });
      }

      if (selectionProgram === "OTHER" && !selectionProgramOther) {
        return res.status(422).json({
          success: false,
          message: "Vui lòng ghi rõ chương trình tuyển chọn khác.",
        });
      }

      if (!projectName) {
        return res.status(422).json({
          success: false,
          message: "Vui lòng nhập tên dự án.",
        });
      }

      if (!companyName) {
        return res.status(422).json({
          success: false,
          message: "Vui lòng nhập tên doanh nghiệp.",
        });
      }

      if (!address) {
        return res.status(422).json({
          success: false,
          message: "Vui lòng nhập địa chỉ.",
        });
      }

      if (!provinceCity) {
        return res.status(422).json({
          success: false,
          message: "Vui lòng nhập tỉnh / thành phố.",
        });
      }

      if (!website) {
        return res.status(422).json({
          success: false,
          message: "Vui lòng nhập Website / Fanpage.",
        });
      }

      if (!taxCode) {
        return res.status(422).json({
          success: false,
          message: "Vui lòng nhập mã số thuế.",
        });
      }

      // =====================================================
      // 5. VALIDATE B
      // =====================================================
      if (!contactFullname) {
        return res.status(422).json({
          success: false,
          message: "Vui lòng nhập họ tên người liên hệ.",
        });
      }

      if (contactPhone.length < 9 || contactPhone.length > 11) {
        return res.status(422).json({
          success: false,
          message: "Số điện thoại không hợp lệ.",
        });
      }

      if (!contactEmail) {
        return res.status(422).json({
          success: false,
          message: "Vui lòng nhập email.",
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(contactEmail)) {
        return res.status(422).json({
          success: false,
          message: "Email không hợp lệ.",
        });
      }

      if (!contactPosition) {
        return res.status(422).json({
          success: false,
          message: "Vui lòng nhập hoặc chọn chức vụ.",
        });
      }

      if (contactPosition === "OTHER" && !contactPositionOther) {
        return res.status(422).json({
          success: false,
          message: "Vui lòng ghi rõ chức vụ khác.",
        });
      }

      // =====================================================
      // 6. VALIDATE C
      // =====================================================
      if (
        teamSize === undefined ||
        teamSize === null ||
        teamSize === "" ||
        Number(teamSize) < 0
      ) {
        return res.status(422).json({
          success: false,
          message: "Vui lòng nhập quy mô nhân sự.",
        });
      }

      if (
        partTimeJobs === undefined ||
        partTimeJobs === null ||
        partTimeJobs === "" ||
        Number(partTimeJobs) < 0
      ) {
        return res.status(422).json({
          success: false,
          message: "Vui lòng nhập số việc làm bán thời gian / thời vụ.",
        });
      }

      const year = Number(projectStartYear);

      if (
        !Number.isInteger(year) ||
        year < 1900 ||
        year > new Date().getFullYear()
      ) {
        return res.status(422).json({
          success: false,
          message: "Năm bắt đầu dự án không hợp lệ.",
        });
      }

      if (!fields.length) {
        return res.status(422).json({
          success: false,
          message: "Vui lòng chọn ít nhất một lĩnh vực hoạt động.",
        });
      }

      for (const item of fields) {
        if (
          !String(item?.field_code || "").trim() ||
          !String(item?.field_name || "").trim()
        ) {
          return res.status(422).json({
            success: false,
            message: "Thông tin lĩnh vực hoạt động không hợp lệ.",
          });
        }
      }

      if (!developmentStage) {
        return res.status(422).json({
          success: false,
          message: "Vui lòng chọn giai đoạn phát triển.",
        });
      }

      if (developmentStage === "OTHER" && !developmentStageOther) {
        return res.status(422).json({
          success: false,
          message: "Vui lòng ghi rõ giai đoạn phát triển khác.",
        });
      }

      // =====================================================
      // 7. VALIDATE D
      // =====================================================
      const financialNumbers = [
        {
          value: revenueLast3Years,
          message: "Vui lòng nhập doanh thu 3 năm gần nhất.",
        },
        {
          value: charterCapital,
          message: "Vui lòng nhập vốn điều lệ.",
        },
        {
          value: raisedAmount,
          message: "Vui lòng nhập số vốn đã huy động.",
        },
      ];

      for (const item of financialNumbers) {
        if (
          item.value === undefined ||
          item.value === null ||
          item.value === "" ||
          Number.isNaN(Number(item.value)) ||
          Number(item.value) < 0
        ) {
          return res.status(422).json({
            success: false,
            message: item.message,
          });
        }
      }

      if (!fundraisingStage) {
        return res.status(422).json({
          success: false,
          message: "Vui lòng chọn giai đoạn gọi vốn.",
        });
      }

      // =====================================================
      // 8. VALIDATE E
      // =====================================================
      const productNumbers = [
        {
          value: patentCount,
          message: "Vui lòng nhập số bằng sáng chế.",
        },
        {
          value: utilitySolutionCount,
          message: "Vui lòng nhập số giải pháp hữu ích.",
        },
        {
          value: productCount,
          message: "Vui lòng nhập số sản phẩm.",
        },
        {
          value: serviceCount,
          message: "Vui lòng nhập số dịch vụ.",
        },
        {
          value: customerCount,
          message: "Vui lòng nhập số khách hàng.",
        },
      ];

      for (const item of productNumbers) {
        if (
          item.value === undefined ||
          item.value === null ||
          item.value === "" ||
          Number.isNaN(Number(item.value)) ||
          Number(item.value) < 0
        ) {
          return res.status(422).json({
            success: false,
            message: item.message,
          });
        }
      }

      // =====================================================
      // 9. VALIDATE F
      // =====================================================
      if (!markets.length) {
        return res.status(422).json({
          success: false,
          message: "Vui lòng chọn ít nhất một thị trường hoạt động.",
        });
      }

      for (const item of markets) {
        if (
          !String(item?.market_code || "").trim() ||
          !String(item?.market_name || "").trim()
        ) {
          return res.status(422).json({
            success: false,
            message: "Thông tin thị trường không hợp lệ.",
          });
        }
      }

      if (
        body.has_international_revenue === undefined ||
        body.has_international_revenue === null ||
        body.has_international_revenue === ""
      ) {
        return res.status(422).json({
          success: false,
          message:
            "Vui lòng cho biết doanh nghiệp có doanh thu quốc tế hay chưa.",
        });
      }

      if (hasInternationalRevenue) {
        if (
          internationalRevenue === undefined ||
          internationalRevenue === null ||
          internationalRevenue === "" ||
          Number(internationalRevenue) < 0
        ) {
          return res.status(422).json({
            success: false,
            message: "Vui lòng nhập doanh thu quốc tế.",
          });
        }

        if (
          internationalCustomerCount === undefined ||
          internationalCustomerCount === null ||
          internationalCustomerCount === "" ||
          Number(internationalCustomerCount) < 0
        ) {
          return res.status(422).json({
            success: false,
            message: "Vui lòng nhập số khách hàng quốc tế.",
          });
        }
      }

      // =====================================================
      // 10. VALIDATE G
      // Có thể chọn "Chưa nhận hỗ trợ" dưới dạng một item.
      // Vì vậy yêu cầu mảng phải có ít nhất 1 lựa chọn.
      // =====================================================
      if (!receivedSupports.length) {
        return res.status(422).json({
          success: false,
          message: "Vui lòng cung cấp thông tin hỗ trợ đã nhận.",
        });
      }

      for (const item of receivedSupports) {
        if (!String(item?.support_code || "").trim()) {
          return res.status(422).json({
            success: false,
            message: "Thông tin hỗ trợ đã nhận không hợp lệ.",
          });
        }

        if (!String(item?.support_name || "").trim()) {
          return res.status(422).json({
            success: false,
            message: "Vui lòng nhập tên nội dung hỗ trợ đã nhận.",
          });
        }
      }

      // =====================================================
      // 11. VALIDATE H
      // =====================================================
      if (!supportNeeds.length) {
        return res.status(422).json({
          success: false,
          message: "Vui lòng chọn ít nhất một nhu cầu hỗ trợ.",
        });
      }

      for (const item of supportNeeds) {
        if (
          !String(item?.need_code || "").trim() ||
          !String(item?.need_name || "").trim()
        ) {
          return res.status(422).json({
            success: false,
            message: "Thông tin nhu cầu hỗ trợ không hợp lệ.",
          });
        }

        if (
          String(item.need_code).toUpperCase() === "OTHER" &&
          !String(item.other_detail || "").trim()
        ) {
          return res.status(422).json({
            success: false,
            message: "Vui lòng ghi rõ nhu cầu hỗ trợ khác.",
          });
        }
      }

      // =====================================================
      // 12. CHỐNG NỘP TRÙNG EMAIL / PROGRAM
      // =====================================================
      const [duplicateRows] = await connection.query(
        `
        SELECT id
        FROM incubation_profiles
        WHERE incubation_program_id = ?
          AND LOWER(contact_email) = LOWER(?)
        LIMIT 1
        `,
        [programId, contactEmail],
      );

      if (duplicateRows.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Email này đã nộp hồ sơ vào chương trình này rồi.",
        });
      }

      // =====================================================
      // 13. PROFILE DATA
      // =====================================================
      const profileData = {
        incubation_program_id: programId,

        // A
        selection_program: selectionProgram,

        selection_program_other:
          selectionProgram === "OTHER" ? selectionProgramOther || null : null,

        project_name: projectName,

        company_name: companyName,

        address,

        province_city: provinceCity,

        website,

        tax_code: taxCode,

        // B
        contact_fullname: contactFullname,

        contact_phone: contactPhone,

        contact_email: contactEmail,

        contact_position: contactPosition,

        contact_position_other:
          contactPosition === "OTHER" ? contactPositionOther || null : null,

        // C
        team_size: Number(teamSize),

        part_time_jobs: Number(partTimeJobs),

        project_start_year: year,

        development_stage: developmentStage,

        development_stage_other:
          developmentStage === "OTHER" ? developmentStageOther || null : null,

        // D
        has_revenue: Number(revenueLast3Years) > 0,

        revenue_last_3_years: Number(revenueLast3Years),

        charter_capital: Number(charterCapital),

        annual_revenue: null,

        has_raised_fund: Number(raisedAmount) > 0,

        fundraising_stage: fundraisingStage,

        raised_amount: Number(raisedAmount),

        fundraising_need: null,

        // E
        product_service_description: null,

        product_status: null,

        has_intellectual_property:
          Number(patentCount) > 0 || Number(utilitySolutionCount) > 0,

        intellectual_property_detail: null,

        patent_count: Number(patentCount),

        utility_solution_count: Number(utilitySolutionCount),

        product_count: Number(productCount),

        service_count: Number(serviceCount),

        customer_count: Number(customerCount),

        target_customer: null,

        // F
        has_international_revenue: hasInternationalRevenue,

        international_revenue: hasInternationalRevenue
          ? Number(internationalRevenue)
          : 0,

        international_customer_count: hasInternationalRevenue
          ? Number(internationalCustomerCount)
          : 0,

        status: "SUBMITTED",

        admin_note: null,

        source_type: "PUBLIC_FORM",
      };

      // =====================================================
      // 14. TRANSACTION
      // =====================================================
      await connection.beginTransaction();

      const profileId = await IncubationProfileModel.createProfile(
        connection,
        profileData,
      );

      await IncubationProfileModel.insertFields(connection, profileId, fields);

      await IncubationProfileModel.insertMarkets(
        connection,
        profileId,
        markets,
      );

      await IncubationProfileModel.insertReceivedSupports(
        connection,
        profileId,
        receivedSupports,
      );

      await IncubationProfileModel.insertSupportNeeds(
        connection,
        profileId,
        supportNeeds,
      );

      await connection.commit();

      // =====================================================
      // 15. RESPONSE
      // =====================================================
      const created = await IncubationProfileModel.findById(profileId);

      return res.status(201).json({
        success: true,

        message: "Gửi hồ sơ Chương trình ươm tạo thành công!",

        data: {
          program: {
            id: program.id,
            program_name: program.program_name,
            program_code: program.program_code,
            year: program.year,
          },

          application: created,
        },
      });
    } catch (error) {
      try {
        await connection.rollback();
      } catch (_) {}

      console.error("PUBLIC INCUBATION APPLY ERROR:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể gửi hồ sơ Chương trình ươm tạo. Vui lòng thử lại.",
      });
    } finally {
      connection.release();
    }
  }
  // =========================================================
  // LIST
  // =========================================================

  static async index(req, res) {
    try {
      const data = await IncubationProgramModel.getAll(req.query);

      return res.json({
        success: true,
        total: data.length,
        data,
      });
    } catch (error) {
      console.error("Lỗi lấy Chương trình ươm tạo:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể lấy danh sách Chương trình ươm tạo.",
      });
    }
  }

  // =========================================================
  // DETAIL
  // =========================================================

  static async show(req, res) {
    try {
      const id = Number(req.params.id);

      const program = await IncubationProgramModel.findById(id);

      if (!program) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy Chương trình ươm tạo.",
        });
      }

      return res.json({
        success: true,
        data: program,
      });
    } catch (error) {
      console.error("Lỗi lấy chi tiết Chương trình ươm tạo:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể lấy chi tiết Chương trình ươm tạo.",
      });
    }
  }

  // =========================================================
  // DANH SÁCH HỒ SƠ
  // =========================================================

  static async profiles(req, res) {
    try {
      const id = Number(req.params.id);

      const program = await IncubationProgramModel.findById(id);

      if (!program) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy Chương trình ươm tạo.",
        });
      }

      const data = await IncubationProgramModel.getProfiles(id);

      return res.json({
        success: true,

        program: {
          id: program.id,

          program_name: program.program_name,

          year: program.year,
        },

        total: data.length,
        data,
      });
    } catch (error) {
      console.error("Lỗi lấy hồ sơ của Chương trình ươm tạo:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể lấy danh sách hồ sơ của chương trình.",
      });
    }
  }

  // =========================================================
  // CREATE
  // =========================================================

  static async create(req, res) {
    try {
      const body = req.body || {};

      if (!body.program_name?.trim()) {
        return res.status(422).json({
          success: false,
          message: "Vui lòng nhập tên Chương trình ươm tạo.",
        });
      }

      const id = await IncubationProgramModel.create(body);

      const created = await IncubationProgramModel.findById(id);

      return res.status(201).json({
        success: true,
        message: "Đã tạo Chương trình ươm tạo thành công.",
        data: created,
      });
    } catch (error) {
      console.error("Lỗi tạo Chương trình ươm tạo:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể tạo Chương trình ươm tạo.",
      });
    }
  }

  // =========================================================
  // UPDATE
  // =========================================================

  static async update(req, res) {
    try {
      const id = Number(req.params.id);

      const existing = await IncubationProgramModel.findById(id);

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy Chương trình ươm tạo.",
        });
      }

      const body = req.body || {};

      if (!body.program_name?.trim()) {
        return res.status(422).json({
          success: false,
          message: "Vui lòng nhập tên Chương trình ươm tạo.",
        });
      }

      await IncubationProgramModel.update(id, body);

      const updated = await IncubationProgramModel.findById(id);

      return res.json({
        success: true,
        message: "Đã cập nhật Chương trình ươm tạo.",
        data: updated,
      });
    } catch (error) {
      console.error("Lỗi cập nhật Chương trình ươm tạo:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể cập nhật Chương trình ươm tạo.",
      });
    }
  }

  // =========================================================
  // DELETE
  // =========================================================

  static async destroy(req, res) {
    try {
      const id = Number(req.params.id);

      const existing = await IncubationProgramModel.findById(id);

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy Chương trình ươm tạo.",
        });
      }

      if (Number(existing.total_profiles) > 0) {
        return res.status(422).json({
          success: false,
          message: "Không thể xóa chương trình vì đang có hồ sơ tham gia.",
        });
      }

      await IncubationProgramModel.deleteById(id);

      return res.json({
        success: true,
        message: "Đã xóa Chương trình ươm tạo.",
      });
    } catch (error) {
      console.error("Lỗi xóa Chương trình ươm tạo:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể xóa Chương trình ươm tạo.",
      });
    }
  }

  // =========================================================
  // STATISTICS
  // =========================================================

  static async statistics(req, res) {
    try {
      const data = await IncubationProgramModel.getStatistics();

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error("Lỗi thống kê Chương trình ươm tạo:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể lấy thống kê Chương trình ươm tạo.",
      });
    }
  }
}

module.exports = IncubationProgramController;
