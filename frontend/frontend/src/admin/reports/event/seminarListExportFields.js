export const SEMINAR_LIST_EXPORT_FIELD_GROUPS = [
  {
    label: "Thông tin hội thảo",
    fields: [
      ["event_name", "Tên hội thảo"],
      ["event_code", "Mã"],
      ["location", "Địa điểm"],
      ["organizer", "Đơn vị tổ chức"],
    ],
  },
  {
    label: "Phân loại",
    fields: [
      ["parent_exhibition_name", "Triển lãm trực thuộc"],
      ["mission", "Nhiệm vụ"],
    ],
  },
  {
    label: "Thời gian / trạng thái",
    fields: [
      ["start_datetime", "Bắt đầu"],
      ["end_datetime", "Kết thúc"],
      ["status", "Trạng thái"],
    ],
  },
  {
    label: "Quy mô / tham gia",
    fields: [
      ["max_participants", "Sức chứa"],
      ["total_participants", "Lượt tham gia"],
      ["checked_in_participants", "Đã check-in"],
    ],
  },
];

export const DEFAULT_SEMINAR_LIST_EXPORT_FIELDS =
  SEMINAR_LIST_EXPORT_FIELD_GROUPS.flatMap((group) =>
    group.fields.map(([key]) => key),
  );
