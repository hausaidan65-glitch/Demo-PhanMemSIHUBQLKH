class ClassStatusService {
  static resolveEffectiveStatus({
    status,

    currentStudents = 0,

    maxStudents = 0,

    registerClose = null,
    organizationStartDate = null,
    organizationEndDate = null,
    firstSessionAt = null,

    lastSessionAt = null,

    now = new Date(),
  }) {
    // ============================================
    // THỜI GIAN TỔ CHỨC HIỆU LỰC
    //
    // Ưu tiên:
    // 1. Session thật
    // 2. Ngày tổ chức của opening
    // ============================================

    const effectiveStartAt = organizationStartDate
      ? `${organizationStartDate}T00:00:00`
      : firstSessionAt || null;

    const effectiveEndAt = organizationEndDate
      ? `${organizationEndDate}T23:59:59`
      : lastSessionAt || null;
    // Trạng thái do Admin chủ động đóng/kết thúc
    if (status === "FINISHED") {
      return "FINISHED";
    }
    // ============================================
    // Đã qua buổi học cuối
    // => lớp thực tế đã kết thúc
    // ============================================

    if (effectiveEndAt) {
      const endDate = new Date(effectiveEndAt);

      if (
        !Number.isNaN(endDate.getTime()) &&
        now.getTime() >= endDate.getTime()
      ) {
        return "FINISHED";
      }
    }
    if (status === "CLOSED") {
      return "CLOSED";
    }

    // Đủ sĩ số
    if (
      Number(maxStudents) > 0 &&
      Number(currentStudents) >= Number(maxStudents)
    ) {
      return "FULL";
    }

    // Có ngày đóng đăng ký chuẩn
    if (registerClose) {
      const closeDate = new Date(registerClose);

      if (
        !Number.isNaN(closeDate.getTime()) &&
        now.getTime() >= closeDate.getTime()
      ) {
        return "CLOSED";
      }
    }

    // Dữ liệu cũ không có register_close:
    // đóng khi đã tới buổi học đầu tiên
    if (!registerClose && effectiveStartAt) {
      const startDate = new Date(effectiveStartAt);

      if (
        !Number.isNaN(startDate.getTime()) &&
        now.getTime() >= startDate.getTime()
      ) {
        return "CLOSED";
      }
    }

    return "OPEN";
  }
}

module.exports = ClassStatusService;
