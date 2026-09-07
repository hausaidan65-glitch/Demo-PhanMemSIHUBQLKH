export const NETWORKING_EVENT_EXPORT_FIELD_GROUPS = [
  {
    label: 'Thông tin sự kiện',
    fields: [
      ['event_name', 'Tên sự kiện'],
      ['event_code', 'Mã sự kiện'],
      ['location', 'Địa điểm'],
      ['organizer', 'Đơn vị tổ chức'],
    ],
  },
  { label: 'Phân loại', fields: [['mission', 'Nhiệm vụ']] },
  {
    label: 'Thời gian / trạng thái',
    fields: [
      ['start_datetime', 'Bắt đầu'],
      ['end_datetime', 'Kết thúc'],
      ['stored_status', 'Trạng thái lưu'],
      ['operational_status', 'Trạng thái hoạt động'],
    ],
  },
  {
    label: 'Quy mô / tham gia',
    fields: [
      ['max_participants', 'Sức chứa'],
      ['total_registered', 'Đăng ký hợp lệ'],
      ['checked_in_participants', 'Đã check-in'],
    ],
  },
];

export const DEFAULT_NETWORKING_EVENT_EXPORT_FIELDS =
  NETWORKING_EVENT_EXPORT_FIELD_GROUPS.flatMap((group) =>
    group.fields.map(([key]) => key),
  );
