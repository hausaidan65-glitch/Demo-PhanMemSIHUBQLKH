export const TRAINING_EXPORT_FIELD_GROUPS = [
  { label: "Thông tin học viên", fields: [["full_name", "Họ và tên"], ["email", "Email"], ["phone", "Số điện thoại"], ["gender", "Giới tính"], ["user_type", "Nhóm đối tượng"], ["company", "Đơn vị"], ["position", "Chức vụ"]] },
  { label: "Đăng ký", fields: [["register_status", "Trạng thái đăng ký"]] },
  { label: "Điểm danh", fields: [["attended", "Đã đi học"], ["attended_sessions", "Số buổi tham dự"], ["total_sessions", "Tổng số buổi"], ["attendance_rate", "Tỷ lệ tham dự (%)"]] },
  { label: "Chứng nhận", fields: [["certificate_eligible", "Đủ điều kiện chứng nhận"], ["certificate_issued", "Đã cấp chứng nhận"], ["certificate_no", "Số chứng nhận"]] },
];

export const DEFAULT_TRAINING_EXPORT_FIELDS = TRAINING_EXPORT_FIELD_GROUPS.flatMap(
  (group) => group.fields.map(([key]) => key),
);
