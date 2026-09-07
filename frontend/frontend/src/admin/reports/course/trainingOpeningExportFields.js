export const TRAINING_OPENING_EXPORT_FIELD_GROUPS = [
  {
    label: "Thông tin lớp",
    fields: [
      ["class_name", "Tên lớp"],
      ["class_code", "Mã lớp"],
      ["location", "Địa điểm"],
    ],
  },
  {
    label: "Thời gian tổ chức",
    fields: [
      ["organization_start_date", "Ngày bắt đầu"],
      ["organization_end_date", "Ngày kết thúc"],
    ],
  },
  {
    label: "Trạng thái",
    fields: [
      ["operational_status", "Trạng thái vận hành"],
      ["organization_status", "Trạng thái tổ chức"],
    ],
  },
  {
    label: "Kết quả",
    fields: [
      ["total_students_registered", "Học viên đăng ký"],
      ["total_students_attended", "Học viên đi học"],
      ["total_certificates_issued", "Chứng nhận đã cấp"],
    ],
  },
];

export const DEFAULT_TRAINING_OPENING_EXPORT_FIELDS =
  TRAINING_OPENING_EXPORT_FIELD_GROUPS.flatMap((group) =>
    group.fields.map(([key]) => key),
  );

