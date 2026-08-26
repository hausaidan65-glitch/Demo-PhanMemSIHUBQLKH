const db = require("../config/db");
const ExcelJS = require("exceljs");
const IncubationProfileModel = require("../models/incubationProfileModel");

class IncubationProfileController {
  static async create(req, res) {
    const connection = await db.getConnection();

    try {
      const body = req.body || {};

      if (!body.project_name?.trim()) {
        return res.status(422).json({
          success: false,
          message: "Vui lòng nhập tên dự án.",
        });
      }

      if (!body.contact_fullname?.trim()) {
        return res.status(422).json({
          success: false,
          message: "Vui lòng nhập họ tên người liên hệ.",
        });
      }

      if (!body.contact_phone?.trim() && !body.contact_email?.trim()) {
        return res.status(422).json({
          success: false,
          message: "Người liên hệ cần có ít nhất số điện thoại hoặc email.",
        });
      }

      const fields = Array.isArray(body.fields) ? body.fields : [];

      const markets = Array.isArray(body.markets) ? body.markets : [];

      const receivedSupports = Array.isArray(body.received_supports)
        ? body.received_supports
        : [];
      const supportNeeds = Array.isArray(body.support_needs)
        ? body.support_needs
        : [];
      await connection.beginTransaction();

      const profileId = await IncubationProfileModel.createProfile(
        connection,
        body,
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

      const created = await IncubationProfileModel.findById(profileId);

      return res.status(201).json({
        success: true,
        message: "Đã tạo hồ sơ Chương trình ươm tạo thành công.",
        data: created,
      });
    } catch (error) {
      await connection.rollback();

      console.error("Lỗi tạo hồ sơ Chương trình ươm tạo:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể tạo hồ sơ Chương trình ươm tạo.",
      });
    } finally {
      connection.release();
    }
  }
  static async update(req, res) {
    const connection = await db.getConnection();

    try {
      const profileId = Number(req.params.id);

      if (!Number.isInteger(profileId) || profileId <= 0) {
        return res.status(400).json({
          success: false,
          message: "ID hồ sơ không hợp lệ.",
        });
      }

      const existing = await IncubationProfileModel.findById(profileId);

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy hồ sơ doanh nghiệp / dự án.",
        });
      }

      const body = req.body || {};

      if (!body.project_name?.trim()) {
        return res.status(422).json({
          success: false,
          message: "Vui lòng nhập tên dự án.",
        });
      }

      if (!body.contact_fullname?.trim()) {
        return res.status(422).json({
          success: false,
          message: "Vui lòng nhập họ tên người liên hệ.",
        });
      }

      if (!body.contact_phone?.trim() && !body.contact_email?.trim()) {
        return res.status(422).json({
          success: false,
          message: "Người liên hệ cần có ít nhất số điện thoại hoặc email.",
        });
      }

      const fields = Array.isArray(body.fields) ? body.fields : [];

      const markets = Array.isArray(body.markets) ? body.markets : [];

      const receivedSupports = Array.isArray(body.received_supports)
        ? body.received_supports
        : [];
      const supportNeeds = Array.isArray(body.support_needs)
        ? body.support_needs
        : [];
      // ==========================================
      // BẮT ĐẦU TRANSACTION
      // ==========================================
      await connection.beginTransaction();

      // 1. Cập nhật hồ sơ chính
      await IncubationProfileModel.updateProfile(connection, profileId, body);

      // 2. Xóa dữ liệu chọn nhiều cũ
      await IncubationProfileModel.deleteChildData(connection, profileId);

      // 3. Tạo lại lĩnh vực mới
      await IncubationProfileModel.insertFields(connection, profileId, fields);

      // 4. Tạo lại thị trường mới
      await IncubationProfileModel.insertMarkets(
        connection,
        profileId,
        markets,
      );

      // 5. Tạo lại hỗ trợ đã nhận
      await IncubationProfileModel.insertReceivedSupports(
        connection,
        profileId,
        receivedSupports,
      );

      // 6. Tạo lại nhu cầu hỗ trợ
      await IncubationProfileModel.insertSupportNeeds(
        connection,
        profileId,
        supportNeeds,
      );

      await connection.commit();

      const updated = await IncubationProfileModel.findById(profileId);

      return res.json({
        success: true,
        message: "Đã cập nhật hồ sơ Chương trình ươm tạo thành công.",
        data: updated,
      });
    } catch (error) {
      await connection.rollback();

      console.error("Lỗi cập nhật hồ sơ Chương trình ươm tạo:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể cập nhật hồ sơ Chương trình ươm tạo.",
      });
    } finally {
      connection.release();
    }
  }
  static async exportExcel(req, res) {
    try {
      const profiles = await IncubationProfileModel.getExportData(req.query);

      if (!profiles.length) {
        return res.status(404).json({
          success: false,
          message: "Không có hồ sơ phù hợp để xuất Excel.",
        });
      }

      const profileIds = profiles.map((item) => item.id);

      const details = await IncubationProfileModel.getExportDetails(profileIds);

      const fieldMap = new Map();
      const marketMap = new Map();
      const supportMap = new Map();
      const supportNeedMap = new Map();
      details.fields.forEach((item) => {
        if (!fieldMap.has(item.profile_id)) {
          fieldMap.set(item.profile_id, []);
        }

        fieldMap
          .get(item.profile_id)
          .push(
            item.other_detail
              ? `${item.field_name}: ${item.other_detail}`
              : item.field_name,
          );
      });

      details.markets.forEach((item) => {
        if (!marketMap.has(item.profile_id)) {
          marketMap.set(item.profile_id, []);
        }

        marketMap
          .get(item.profile_id)
          .push(
            item.other_detail
              ? `${item.market_name}: ${item.other_detail}`
              : item.market_name,
          );
      });

      details.supports.forEach((item) => {
        if (!supportMap.has(item.profile_id)) {
          supportMap.set(item.profile_id, []);
        }

        const provider = item.provider_other || item.provider_name || "";

        const year = item.support_year ? ` (${item.support_year})` : "";

        const detail = item.support_detail ? ` - ${item.support_detail}` : "";

        supportMap
          .get(item.profile_id)
          .push(`${provider}: ${item.support_name}${year}${detail}`);
      });
      details.support_needs.forEach((item) => {
        if (!supportNeedMap.has(item.profile_id)) {
          supportNeedMap.set(item.profile_id, []);
        }

        supportNeedMap
          .get(item.profile_id)
          .push(
            item.other_detail
              ? `${item.need_name}: ${item.other_detail}`
              : item.need_name,
          );
      });
      const workbook = new ExcelJS.Workbook();

      workbook.creator = "SIHUB";

      const sheet = workbook.addWorksheet("Hồ sơ ươm tạo");

      sheet.columns = [
        {
          header: "STT",
          key: "stt",
          width: 8,
        },
        {
          header: "Chương trình tuyển chọn",
          key: "selection_program",
          width: 22,
        },
        {
          header: "Tên dự án",
          key: "project_name",
          width: 40,
        },
        {
          header: "Tên doanh nghiệp",
          key: "company_name",
          width: 38,
        },
        {
          header: "Tỉnh/Thành phố",
          key: "province_city",
          width: 24,
        },
        {
          header: "Người liên hệ",
          key: "contact_fullname",
          width: 28,
        },
        {
          header: "Số điện thoại",
          key: "contact_phone",
          width: 18,
        },
        {
          header: "Email",
          key: "contact_email",
          width: 30,
        },
        {
          header: "Chức vụ",
          key: "contact_position",
          width: 22,
        },
        {
          header: "Quy mô nhân sự",
          key: "team_size",
          width: 16,
        },
        {
          header: "Việc làm bán thời gian / thời vụ",
          key: "part_time_jobs",
          width: 24,
        },
        {
          header: "Năm bắt đầu dự án",
          key: "project_start_year",
          width: 20,
        },
        {
          header: "Giai đoạn phát triển",
          key: "development_stage",
          width: 22,
        },
        {
          header: "Lĩnh vực hoạt động",
          key: "fields",
          width: 40,
        },
        {
          header: "Thị trường",
          key: "markets",
          width: 40,
        },
        {
          header: "Doanh thu 3 năm gần nhất",
          key: "revenue_last_3_years",
          width: 24,
        },
        {
          header: "Vốn điều lệ",
          key: "charter_capital",
          width: 20,
        },
        {
          header: "Giai đoạn gọi vốn",
          key: "fundraising_stage",
          width: 20,
        },
        {
          header: "Số vốn đã gọi",
          key: "raised_amount",
          width: 20,
        },
        {
          header: "Nhu cầu gọi vốn",
          key: "fundraising_need",
          width: 20,
        },
        {
          header: "Sản phẩm / dịch vụ",
          key: "product_service_description",
          width: 45,
        },
        {
          header: "Sở hữu trí tuệ",
          key: "intellectual_property_detail",
          width: 35,
        },
        {
          header: "Khách hàng",
          key: "customer_count",
          width: 14,
        },
        {
          header: "Hỗ trợ đã nhận",
          key: "received_supports",
          width: 55,
        },
        {
          header: "Nhu cầu hỗ trợ",
          key: "support_needs",
          width: 55,
        },
        {
          header: "Trạng thái hồ sơ",
          key: "status",
          width: 20,
        },
        {
          header: "Nguồn dữ liệu",
          key: "source_type",
          width: 18,
        },
        {
          header: "Ngày tạo",
          key: "created_at",
          width: 20,
        },
      ];

      profiles.forEach((item, index) => {
        sheet.addRow({
          stt: index + 1,

          selection_program:
            item.selection_program_other || item.selection_program || "",

          project_name: item.project_name || "",

          company_name: item.company_name || "",

          province_city: item.province_city || "",

          contact_fullname: item.contact_fullname || "",

          contact_phone: item.contact_phone || "",

          contact_email: item.contact_email || "",

          contact_position:
            item.contact_position_other || item.contact_position || "",

          team_size: item.team_size ?? "",

          development_stage:
            item.development_stage_other || item.development_stage || "",
          part_time_jobs: item.part_time_jobs ?? "",

          project_start_year: item.project_start_year ?? "",

          fields: (fieldMap.get(item.id) || []).join("\n"),

          markets: (marketMap.get(item.id) || []).join("\n"),

          revenue_last_3_years: item.revenue_last_3_years || "",

          charter_capital: item.charter_capital || "",

          fundraising_stage: item.fundraising_stage || "",

          raised_amount: item.raised_amount || "",

          fundraising_need: item.fundraising_need || "",

          product_service_description: item.product_service_description || "",

          intellectual_property_detail: item.intellectual_property_detail || "",

          customer_count: item.customer_count ?? "",

          received_supports: (supportMap.get(item.id) || []).join("\n"),
          support_needs: (supportNeedMap.get(item.id) || []).join("\n"),

          status: item.status || "",

          source_type: item.source_type || "",

          created_at: item.created_at ? new Date(item.created_at) : null,
        });
      });

      const headerRow = sheet.getRow(1);

      headerRow.font = {
        bold: true,
        color: {
          argb: "FFFFFFFF",
        },
      };

      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "FF16A34A",
        },
      };

      headerRow.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };

      sheet.views = [
        {
          state: "frozen",
          ySplit: 1,
        },
      ];

      sheet.autoFilter = {
        from: {
          row: 1,
          column: 1,
        },
        to: {
          row: 1,
          column: sheet.columnCount,
        },
      };

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          return;
        }

        row.alignment = {
          vertical: "top",
          wrapText: true,
        };
      });

      sheet.getColumn("created_at").numFmt = "dd/mm/yyyy hh:mm";

      const dateText = new Date().toISOString().slice(0, 10);

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="chuong-trinh-uom-tao-${dateText}.xlsx"`,
      );

      await workbook.xlsx.write(res);

      res.end();
    } catch (error) {
      console.error("Lỗi xuất Excel Chương trình ươm tạo:", error);

      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: "Không thể xuất Excel Chương trình ươm tạo.",
        });
      }
    }
  }
  // =========================================================
  // DANH SÁCH
  // =========================================================
  static async index(req, res) {
    try {
      const data = await IncubationProfileModel.getAll(req.query);

      return res.json({
        success: true,
        total: data.length,
        data,
      });
    } catch (error) {
      console.error("Lỗi lấy danh sách hồ sơ ươm tạo:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể lấy danh sách Chương trình ươm tạo.",
      });
    }
  }

  // =========================================================
  // CHI TIẾT
  // =========================================================
  static async show(req, res) {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          success: false,
          message: "ID hồ sơ không hợp lệ.",
        });
      }

      const data = await IncubationProfileModel.findById(id);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy hồ sơ doanh nghiệp / dự án.",
        });
      }

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error("Lỗi lấy chi tiết hồ sơ ươm tạo:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể lấy chi tiết hồ sơ.",
      });
    }
  }
  static async destroy(req, res) {
    const connection = await db.getConnection();

    try {
      const profileId = Number(req.params.id);

      if (!Number.isInteger(profileId) || profileId <= 0) {
        return res.status(400).json({
          success: false,
          message: "ID hồ sơ không hợp lệ.",
        });
      }

      const existing = await IncubationProfileModel.findById(profileId);

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy hồ sơ doanh nghiệp / dự án.",
        });
      }

      await connection.beginTransaction();

      // 1. Xóa dữ liệu con trước
      await IncubationProfileModel.deleteChildData(connection, profileId);

      // 2. Sau đó mới xóa hồ sơ chính
      await IncubationProfileModel.deleteById(connection, profileId);

      await connection.commit();

      return res.json({
        success: true,
        message: "Đã xóa hồ sơ Chương trình ươm tạo.",
        data: {
          id: profileId,
          project_name: existing.project_name,
        },
      });
    } catch (error) {
      await connection.rollback();

      console.error("Lỗi xóa hồ sơ Chương trình ươm tạo:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể xóa hồ sơ Chương trình ươm tạo.",
      });
    } finally {
      connection.release();
    }
  }
  static async statistics(req, res) {
    try {
      const data = await IncubationProfileModel.getStatistics();

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
  // =========================================================
  // FILTER OPTIONS
  // =========================================================
  static async filterOptions(req, res) {
    try {
      const data = await IncubationProfileModel.getFilterOptions();

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error("Lỗi lấy bộ lọc ươm tạo:", error);

      return res.status(500).json({
        success: false,
        message: "Không thể lấy dữ liệu bộ lọc.",
      });
    }
  }
}

module.exports = IncubationProfileController;
