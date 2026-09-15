export const FILTER_TYPES = Object.freeze(['text', 'select', 'multi-select', 'boolean', 'number-range', 'date-range']);

const field = (key, label, options = {}) => ({ key, value: key, label, ...options });
const filter = (key, label, type) => ({ key, label, type });

const COMMON = [
  field('timestamp', 'Dấu thời gian Google Form', { import: true, aliases: ['Dấu thời gian', 'Timestamp'] }),
  field('fullname', 'Họ và tên', { required: true, import: true, aliases: ['Họ tên', 'Họ và tên', 'Tên', 'Full name'] }),
  field('phone', 'Số điện thoại', { required: true, import: true, aliases: ['SĐT', 'Số ĐT', 'Điện thoại', 'Phone'] }),
  field('email', 'Email', { import: true, aliases: ['Email', 'E-mail'] }),
  field('organization', 'Đơn vị công tác', { import: true, aliases: ['Đơn vị', 'Đơn vị công tác', 'Doanh nghiệp/Đơn vị đang công tác', 'Tổ chức', 'Công ty', 'Tên công ty', 'Cơ quan'] }),
  field('position', 'Chức vụ', { import: true, aliases: ['Chức vụ', 'Vị trí công tác', 'Position'] }),
  field('gender', 'Giới tính', { import: true, aliases: ['Giới tính', 'Gender'] }),
  field('age_group', 'Nhóm tuổi', { import: true, aliases: ['Nhóm tuổi', 'Độ tuổi'] }),
  field('participant_group', 'Nhóm đối tượng', { import: true, aliases: ['Nhóm đối tượng', 'Đối tượng tham gia', 'Loại người dùng'] }),
];

const STARTUP = [
  ...COMMON,
  field('participant_role', 'Vai trò người tham dự', { import: true, aliases: ['Vai trò', 'Vai trò người tham dự'] }),
  field('has_project', 'Có dự án khởi nghiệp', { import: true, aliases: ['Có dự án khởi nghiệp', 'Bạn có dự án khởi nghiệp không?'] }),
  field('project_name', 'Tên dự án', { import: true, aliases: ['Tên dự án', 'Dự án khởi nghiệp'] }),
  field('project_field', 'Lĩnh vực dự án', { import: true, aliases: ['Lĩnh vực dự án', 'Lĩnh vực hoạt động'] }),
  field('startup_stage', 'Giai đoạn dự án', { import: true, aliases: ['Giai đoạn dự án', 'Giai đoạn phát triển'] }),
  field('project_description', 'Mô tả dự án', { import: true, aliases: ['Mô tả dự án', 'Mô tả ngắn về ý tưởng/dự án', 'Mô tả sản phẩm/dịch vụ'] }),
  field('female_founder', 'Có nữ Founder/Co-founder', { import: true, aliases: ['Có nữ Founder/Co-founder', 'Dự án của bạn có nữ là founder, co-founder không', 'Nữ sáng lập'] }),
  field('team_size', 'Quy mô đội ngũ', { import: true, aliases: ['Quy mô đội ngũ', 'Quy mô nhân sự', 'Có bao nhiêu nhân sự', 'Số lượng thành viên'] }),
  field('program_selection_status', 'Trạng thái tuyển chọn chương trình', { import: true, aliases: ['Trạng thái tuyển chọn chương trình', 'Chương trình tuyển chọn'] }),
  field('support_needs', 'Nhu cầu hỗ trợ', { import: true, aliases: ['Nhu cầu hỗ trợ', 'Nội dung cần hỗ trợ'] }),
  field('organizer_question', 'Câu hỏi cho Ban tổ chức', { import: true, aliases: ['Câu hỏi cho BTC', 'Câu hỏi cho Ban tổ chức'] }),
];

const TRAINING = [...STARTUP, field('incubation_status', 'Trạng thái ươm tạo', { import: true, aliases: ['Trạng thái ươm tạo'] })];

const EXHIBITION_SURVEY = [
  field('timestamp', 'Dấu thời gian Google Form', { import: true, aliases: ['Dấu thời gian', 'Timestamp'] }),
  field('fullname', 'Họ và tên', { required: true, import: true, aliases: ['Họ tên', 'Họ và tên'] }),
  field('position', 'Chức vụ', { import: true, aliases: ['Chức vụ', 'Vị trí công tác'] }),
  field('organization', 'Đơn vị', { import: true, aliases: ['Đơn vị', 'Đơn vị công tác', 'Tổ chức'] }),
  field('phone', 'Số điện thoại', { import: true, aliases: ['SĐT', 'Số điện thoại', 'Điện thoại'] }),
  field('email', 'Email', { import: true, aliases: ['Email', 'E-mail'] }),
  field('project_field', 'Lĩnh vực', { import: true, aliases: ['Lĩnh vực', 'Lĩnh vực hoạt động'] }),
  field('exhibition_product_name', 'Tên sản phẩm trưng bày', { import: true, aliases: ['Tên sản phẩm trưng bày', 'Tên sản phẩm trưng bày triển lãm', 'Sản phẩm triển lãm'] }),
  field('exhibition_product_quantity', 'Số sản phẩm', { import: true, aliases: ['Số sản phẩm', 'Số sản phẩm trưng bày', 'Số sản phẩm trưng bày triển lãm', 'Số lượng sản phẩm trưng bày triển lãm'] }),
  field('sold_or_ordered_quantity', 'Số lượng đã bán/đặt hàng', { import: true, aliases: ['Số lượng đã bán/đặt hàng', 'Số sản phẩm đã bán/đặt hàng', 'Số lượng sản phẩm đã bán / được đặt hàng trong đợt triển lãm này?'] }),
  field('visitor_count', 'Khách ghé gian hàng', { import: true, aliases: ['Khách ghé gian hàng', 'Số lượt khách ghé gian hàng', 'Số lượng khách ghé thăm gian hàng'] }),
  field('b2b_matching_count', 'B2B matching', { import: true, aliases: ['B2B matching', 'Số lượt B2B matching'] }),
  field('public_sector_connection_count', 'Kết nối khu vực công', { import: true, aliases: ['Kết nối khu vực công', 'Số lượt kết nối khu vực công', 'Số lượt kết nối với Khu vực công'] }),
  field('mou_count', 'MOU', { import: true, aliases: ['MOU', 'Số MOU', 'Số MOU đã ký kết (nếu có)'] }),
  field('exhibition_revenue', 'Doanh thu', { import: true, aliases: ['Doanh thu', 'Doanh thu triển lãm', 'Doanh thu thu được trong triển lãm (nếu có)'] }),
  field('highlight_impression', 'Ấn tượng chương trình', { import: true, aliases: ['Ấn tượng chương trình', 'Ấn tượng nổi bật', 'Điểm đặc biệt ấn tượng của Đơn vị khi tham gia chương trình là gì?'] }),
  field('want_to_join_again', 'Mong muốn tham gia tiếp', { import: true, aliases: ['Mong muốn tham gia tiếp', 'Tiếp tục tham gia sự kiện', 'Nếu có sự kiện tương tự, Đơn vị có muốn tiếp tục tham gia không?'] }),
  field('organizer_feedback', 'Góp ý BTC', { import: true, aliases: ['Góp ý BTC', 'Góp ý Ban tổ chức', 'Phản hồi Ban tổ chức', 'Đơn vị có góp ý hoặc nhận xét nào giúp Ban tổ chức có thể tổ chức tốt hơn?'] }),
  field('other_sharing', 'Chia sẻ khác', { import: true, aliases: ['Chia sẻ khác', 'Chia sẻ khác (nếu có)'] }),
];

const incubationSpecs = [
  ['incubation_program_id', 'Chương trình ươm tạo'], ['selection_program', 'Chương trình tuyển chọn'], ['selection_program_other', 'Chương trình tuyển chọn khác'],
  ['project_name', 'Tên dự án'], ['company_name', 'Tên doanh nghiệp'], ['address', 'Địa chỉ'], ['website', 'Website / Fanpage'], ['tax_code', 'Mã số thuế'], ['province_city', 'Tỉnh / Thành phố'],
  ['contact_fullname', 'Họ và tên người liên hệ'], ['contact_phone', 'Số điện thoại người liên hệ'], ['contact_email', 'Email người liên hệ'], ['contact_position', 'Chức vụ người liên hệ'], ['contact_position_other', 'Chức vụ khác'],
  ['team_size', 'Số nhân sự chính thức'], ['part_time_jobs', 'Số việc làm đã tạo ra'], ['project_start_year', 'Năm bắt đầu dự án'], ['fields', 'Lĩnh vực hoạt động'], ['development_stage', 'Giai đoạn phát triển'], ['development_stage_other', 'Giai đoạn phát triển khác'],
  ['has_revenue', 'Đã có doanh thu'], ['revenue_last_3_years', 'Doanh thu 3 năm gần nhất'], ['charter_capital', 'Vốn điều lệ'], ['annual_revenue', 'Doanh thu hằng năm'],
  ['has_raised_fund', 'Đã huy động vốn'], ['fundraising_stage', 'Vòng gọi vốn'], ['raised_amount', 'Số vốn đã huy động'], ['fundraising_need', 'Nhu cầu gọi vốn'],
  ['product_service_description', 'Mô tả sản phẩm / dịch vụ'], ['product_status', 'Trạng thái sản phẩm'], ['has_intellectual_property', 'Có tài sản trí tuệ'], ['intellectual_property_detail', 'Chi tiết tài sản trí tuệ'],
  ['patent_count', 'Số bằng sáng chế'], ['utility_solution_count', 'Số giải pháp hữu ích'], ['product_count', 'Số sản phẩm'], ['service_count', 'Số dịch vụ'], ['customer_count', 'Số khách hàng'], ['target_customer', 'Khách hàng mục tiêu'],
  ['markets', 'Thị trường'], ['has_international_revenue', 'Có doanh thu / khách hàng quốc tế'], ['international_revenue', 'Doanh thu quốc tế'], ['international_customer_count', 'Số khách hàng quốc tế'],
  ['received_supports', 'Hỗ trợ đã nhận'], ['support_needs', 'Nhu cầu hỗ trợ'], ['status', 'Trạng thái hồ sơ'], ['admin_note', 'Ghi chú quản trị'], ['source_type', 'Nguồn hồ sơ'],
];
const INCUBATION_ALIASES = {
  selection_program: ['A1. Chương trình tuyển chọn', 'Chương trình tuyển chọn'], project_name: ['A2. Tên dự án', 'Tên dự án'], company_name: ['A3. Tên doanh nghiệp', 'Tên doanh nghiệp'], address: ['A4. Địa chỉ', 'Địa chỉ'], website: ['A5. Website / Fanpage', 'Website / Fanpage', 'Website'], tax_code: ['A6. Mã số thuế', 'Mã số thuế'], province_city: ['A7. Tỉnh / Thành phố', 'Tỉnh / Thành phố'],
  contact_fullname: ['B1. Họ và tên', 'Họ và tên'], contact_phone: ['B2. Số điện thoại', 'Số điện thoại'], contact_email: ['B3. Email', 'Email'], contact_position: ['B4. Chức vụ', 'Chức vụ'],
  team_size: ['C1. Số lượng nhân sự chính thức', 'Số lượng nhân sự chính thức'], part_time_jobs: ['C2. Số việc làm đã tạo ra', 'Số việc làm đã tạo ra'], project_start_year: ['C3. Thời gian bắt đầu dự án', 'Năm bắt đầu dự án'], fields: ['C4. Lĩnh vực hoạt động', 'Lĩnh vực hoạt động'], development_stage: ['C5. Giai đoạn phát triển', 'Giai đoạn phát triển'],
  revenue_last_3_years: ['D1. Doanh thu 3 năm gần nhất', 'Doanh thu 3 năm gần nhất'], raised_amount: ['D3. Số vốn đã huy động', 'Số vốn đã huy động'], patent_count: ['E1. Số bằng sáng chế', 'Số bằng sáng chế'], utility_solution_count: ['E2. Số giải pháp hữu ích', 'Số giải pháp hữu ích'], markets: ['Thị trường', 'Thị trường mục tiêu'], has_international_revenue: ['Doanh thu hoặc khách hàng từ thị trường quốc tế'], received_supports: ['Đã được SIHUB hỗ trợ'], support_needs: ['Nhu cầu hỗ trợ'],
};
const incubationNonImportFields = new Set([
  'incubation_program_id', 'selection_program_other', 'contact_position_other',
  'development_stage_other', 'status', 'admin_note', 'source_type',
]);
const INCUBATION = incubationSpecs.map(([key, label]) => field(key, label,
  incubationNonImportFields.has(key)
    ? {}
    : { import: true, aliases: INCUBATION_ALIASES[key] || [label] },
));

const participantFilters = [filter('keyword', 'Từ khóa', 'text'), filter('registration_status', 'Trạng thái đăng ký', 'multi-select'), filter('checked_in', 'Đã check-in', 'boolean'), filter('user_type', 'Nhóm đối tượng', 'multi-select'), filter('gender', 'Giới tính', 'multi-select'), filter('age_group', 'Nhóm tuổi', 'multi-select'), filter('organization', 'Đơn vị', 'multi-select'), filter('position', 'Chức vụ', 'multi-select'), filter('has_project', 'Có dự án', 'boolean'), filter('female_founder', 'Có nữ sáng lập', 'boolean'), filter('team_size', 'Quy mô đội ngũ', 'number-range'), filter('created_at', 'Ngày đăng ký', 'date-range')];
const makeModule = (participantFields, filters) => ({ participantFields, importFields: participantFields.filter((item) => item.import), excelHeaderAliases: Object.fromEntries(participantFields.filter((item) => item.aliases?.length).map((item) => [item.key, item.aliases])), filters });

export const MODULE_FIELD_REGISTRY = Object.freeze({
  TRAINING: makeModule(TRAINING, [...participantFilters, filter('training_course_id', 'Nhiệm vụ đào tạo', 'select'), filter('course_id', 'Nhiệm vụ khóa đào tạo', 'select'), filter('class_id', 'Đợt tổ chức', 'select'), filter('mission', 'Nhiệm vụ', 'select'), filter('project_field', 'Lĩnh vực dự án', 'multi-select'), filter('startup_stage', 'Giai đoạn dự án', 'multi-select')]),
  SEMINAR: makeModule(STARTUP, [...participantFilters, filter('participant_role', 'Vai trò', 'select')]),
  EXHIBITION: makeModule(EXHIBITION_SURVEY, participantFilters),
  NETWORKING: makeModule(STARTUP, [...participantFilters, filter('participant_role', 'Vai trò', 'select')]),
  INCUBATION: makeModule(INCUBATION, [filter('keyword', 'Từ khóa', 'text'), filter('incubation_program_id', 'Chương trình ươm tạo', 'select'), filter('selection_program', 'Chương trình tuyển chọn', 'select'), filter('development_stage', 'Giai đoạn phát triển', 'select'), filter('field_code', 'Lĩnh vực', 'multi-select'), filter('market_code', 'Thị trường', 'multi-select'), filter('status', 'Trạng thái hồ sơ', 'multi-select'), filter('team_size', 'Số nhân sự', 'number-range'), filter('project_start_year', 'Năm bắt đầu dự án', 'number-range'), filter('has_revenue', 'Đã có doanh thu', 'boolean'), filter('has_raised_fund', 'Đã huy động vốn', 'boolean'), filter('has_intellectual_property', 'Có tài sản trí tuệ', 'boolean'), filter('created_at', 'Ngày tạo hồ sơ', 'date-range')]),
});

export function getModuleFieldConfig(moduleCode) { return MODULE_FIELD_REGISTRY[String(moduleCode || '').toUpperCase()] || null; }
export function validateModuleFieldRegistry(registry = MODULE_FIELD_REGISTRY) {
  const errors = [];
  Object.entries(registry).forEach(([moduleCode, config]) => {
    const keys = new Set();
    config.participantFields.forEach(({ key }) => { if (keys.has(key)) errors.push(`${moduleCode}: field trùng key ${key}`); keys.add(key); });
    config.filters.forEach(({ key, type }) => { if (!FILTER_TYPES.includes(type)) errors.push(`${moduleCode}: filter ${key} có type không hỗ trợ: ${type}`); });
  });
  return errors;
}
