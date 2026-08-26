class ClassStatusService {
  static resolveEffectiveStatus({
    status,

    currentStudents = 0,

    maxStudents = 0,

    registerClose = null,

    firstSessionAt = null,

    lastSessionAt = null,

    now = new Date(),
  }) {
    // Trạng thái do Admin chủ động đóng/kết thúc
    if (status === "FINISHED") {
      return "FINISHED";
    }
    // ============================================
    // Đã qua buổi học cuối
    // => lớp thực tế đã kết thúc
    // ============================================

    if (lastSessionAt) {
      const lastSessionDate = new Date(lastSessionAt);

      if (
        !Number.isNaN(lastSessionDate.getTime()) &&
        now.getTime() >= lastSessionDate.getTime()
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
    if (!registerClose && firstSessionAt) {
      const firstSessionDate = new Date(firstSessionAt);

      if (
        !Number.isNaN(firstSessionDate.getTime()) &&
        now.getTime() >= firstSessionDate.getTime()
      ) {
        return "CLOSED";
      }
    }

    return "OPEN";
  }
}

module.exports = ClassStatusService;
