export const SEMINAR_EXPORT_FIELD_GROUPS = [
  { label: "Thông tin người tham gia", fields: [["full_name", "Họ và tên"], ["email", "Email"], ["phone", "Điện thoại"], ["gender", "Giới tính"], ["age_group", "Nhóm tuổi"], ["user_type", "Nhóm đối tượng"]] },
  { label: "Đơn vị / vai trò", fields: [["organization", "Đơn vị"], ["position", "Chức vụ"], ["participant_role", "Vai trò tham gia"]] },
  { label: "Dự án", fields: [["has_project", "Có dự án"], ["project_field", "Lĩnh vực dự án"], ["startup_stage", "Giai đoạn Startup"], ["program_selection_status", "Trạng thái tuyển chọn chương trình"]] },
  { label: "Hỗ trợ / ghi chú", fields: [["support_needs", "Nhu cầu hỗ trợ"], ["organizer_question", "Câu hỏi cho BTC"], ["note", "Ghi chú"]] },
  { label: "Đăng ký", fields: [["registration_status", "Trạng thái đăng ký"], ["created_at", "Thời gian đăng ký"]] },
  { label: "Check-in", fields: [["checked_in", "Check-in"], ["checked_in_at", "Thời gian check-in"]] },
];

export const DEFAULT_SEMINAR_EXPORT_FIELDS = SEMINAR_EXPORT_FIELD_GROUPS.flatMap(
  (group) => group.fields.map(([key]) => key),
);
