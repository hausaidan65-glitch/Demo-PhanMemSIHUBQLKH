// =====================================================
// GOOGLE FORM FIELD REGISTRY
//
// Mục tiêu:
// - Không bỏ mất field nghiệp vụ quan trọng.
// - Mỗi module có schema mapping riêng.
// - Field không thuộc DB hiện tại vẫn có thể giữ ở rawExtras.
// =====================================================

export const COMMON_USER_FIELDS = [
  {
    value: "timestamp",
    label: "Dấu thời gian Google Form",
  },
  {
    value: "fullname",
    label: "Họ và tên",
    required: true,
  },
  {
    value: "phone",
    label: "Số điện thoại",
    required: true,
  },
  {
    value: "email",
    label: "Email",
  },
  {
    value: "organization",
    label: "Đơn vị công tác",
  },
  {
    value: "position",
    label: "Chức vụ",
  },
  {
    value: "gender",
    label: "Giới tính",
  },
  {
    value: "age_group",
    label: "Nhóm tuổi",
  },
  {
    value: "participant_group",
    label: "Nhóm đối tượng",
  },
];

// =====================================================
// TRAINING
// =====================================================

export const TRAINING_FIELDS = [
  ...COMMON_USER_FIELDS,

  {
    value: "has_project",
    label: "Có dự án khởi nghiệp",
  },
  {
    value: "project_name",
    label: "Tên dự án",
  },
  {
    value: "project_field",
    label: "Lĩnh vực dự án",
  },
  {
    value: "startup_stage",
    label: "Giai đoạn dự án",
  },
  {
    value: "project_description",
    label: "Mô tả dự án",
  },
  {
    value: "female_founder",
    label: "Có nữ Founder/Co-founder",
  },
  {
    value: "team_size",
    label: "Quy mô đội ngũ",
  },
  {
    value: "incubation_status",
    label: "Trạng thái ươm tạo",
  },
  {
    value: "program_selection_status",
    label: "Trạng thái tuyển chọn chương trình",
  },
  {
    value: "support_needs",
    label: "Nhu cầu hỗ trợ",
  },
  {
    value: "organizer_question",
    label: "Câu hỏi cho BTC",
  },
];

// =====================================================
// NETWORKING
// =====================================================

export const NETWORKING_FIELDS = [
  ...COMMON_USER_FIELDS,

  {
    value: "participant_role",
    label: "Vai trò người tham dự",
  },
  {
    value: "has_project",
    label: "Có dự án khởi nghiệp",
  },
  {
    value: "project_field",
    label: "Lĩnh vực dự án",
  },
  {
    value: "startup_stage",
    label: "Giai đoạn dự án",
  },
  {
    value: "program_selection_status",
    label: "Trạng thái tuyển chọn chương trình",
  },
  {
    value: "support_needs",
    label: "Nhu cầu hỗ trợ",
  },
  {
    value: "organizer_question",
    label: "Câu hỏi cho BTC",
  },
];

// =====================================================
// STARTUP CONNECTION DAY - SEMINAR
//
// Participant model hiện tại có cùng nhóm field nghiệp vụ
// với Networking.
// =====================================================

export const SEMINAR_FIELDS = [
  ...COMMON_USER_FIELDS,

  {
    value: "participant_role",
    label: "Vai trò người tham dự",
  },
  {
    value: "has_project",
    label: "Có dự án khởi nghiệp",
  },
  {
    value: "project_field",
    label: "Lĩnh vực dự án",
  },
  {
    value: "startup_stage",
    label: "Giai đoạn dự án",
  },
  {
    value: "program_selection_status",
    label: "Trạng thái tuyển chọn chương trình",
  },
  {
    value: "support_needs",
    label: "Nhu cầu hỗ trợ",
  },
  {
    value: "organizer_question",
    label: "Câu hỏi cho BTC",
  },
];

// =====================================================
// SYSTEM FIELD
// =====================================================

// =====================================================
// GET FIELDS THEO TARGET
// =====================================================

export function getFieldsForTarget(targetType) {
  switch (targetType) {
    case "TRAINING":
      return [...TRAINING_FIELDS];

    case "NETWORKING":
      return [...NETWORKING_FIELDS];

    case "SEMINAR":
      return [...SEMINAR_FIELDS];

    default:
      return [...COMMON_USER_FIELDS];
  }
}
export const SPECIAL_MAPPING_OPTIONS = [
  {
    value: "__EXTRA__",
    label: "Giữ làm dữ liệu bổ sung",
  },

  {
    value: "__IGNORE__",
    label: "Bỏ qua cột này",
  },
];
