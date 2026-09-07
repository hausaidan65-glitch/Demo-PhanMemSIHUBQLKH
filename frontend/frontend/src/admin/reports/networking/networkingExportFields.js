export const DEFAULT_NETWORKING_EXPORT_FIELDS = [
  'full_name', 'email', 'phone', 'gender', 'age_group', 'user_type',
  'organization', 'position', 'role', 'registration_status', 'checked_in',
  'checked_in_at', 'created_at',
];
export const NETWORKING_EXPORT_FIELD_GROUPS = [
  { label: 'Thông tin cá nhân', fields: [['full_name', 'Họ và tên'], ['email', 'Email'], ['phone', 'Điện thoại'], ['gender', 'Giới tính'], ['age_group', 'Nhóm tuổi'], ['user_type', 'Nhóm đối tượng']] },
  { label: 'Công việc', fields: [['organization', 'Đơn vị'], ['position', 'Chức vụ'], ['role', 'Vai trò tham gia']] },
  { label: 'Đăng ký', fields: [['registration_status', 'Trạng thái đăng ký'], ['checked_in', 'Check-in'], ['checked_in_at', 'Thời gian check-in'], ['created_at', 'Thời gian đăng ký']] },
];
