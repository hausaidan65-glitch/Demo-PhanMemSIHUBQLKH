const COMMON = {
  fullname: ["ho va ten", "ho ten", "full name", "ten nguoi tham du"],
  phone: ["so dien thoai", "so dt", "sdt", "dien thoai", "phone"],
  email: ["email", "e mail"],
  organization: ["don vi cong tac", "don vi", "to chuc", "cong ty", "co quan"],
  position: ["chuc vu", "vi tri cong tac", "position"],
  gender: ["gioi tinh", "gender"],
  age_group: ["nhom tuoi", "do tuoi"],
  participant_group: ["nhom doi tuong", "doi tuong tham gia", "loai nguoi dung"],
};

const STARTUP = {
  ...COMMON,
  participant_role: ["vai tro", "vai tro nguoi tham du"],
  has_project: ["co du an khoi nghiep", "ban co du an khoi nghiep khong"],
  project_name: ["ten du an", "du an khoi nghiep"],
  project_field: ["linh vuc du an", "linh vuc hoat dong"],
  startup_stage: ["giai doan du an", "giai doan phat trien"],
  project_description: ["mo ta du an", "mo ta san pham dich vu"],
  female_founder: ["co nu founder co founder", "nu sang lap"],
  team_size: ["quy mo doi ngu", "so luong thanh vien"],
  program_selection_status: ["trang thai tuyen chon chuong trinh", "chuong trinh tuyen chon"],
  support_needs: ["nhu cau ho tro", "noi dung can ho tro"],
  organizer_question: ["cau hoi cho btc", "cau hoi cho ban to chuc"],
};

const INCUBATION = {
  selection_program: ["a1 chuong trinh tuyen chon", "chuong trinh tuyen chon"],
  project_name: ["a2 ten du an", "ten du an"], company_name: ["a3 ten doanh nghiep", "ten doanh nghiep"],
  address: ["a4 dia chi", "dia chi"], website: ["a5 website fanpage", "website fanpage", "website"],
  tax_code: ["a6 ma so thue", "ma so thue"], province_city: ["a7 tinh thanh pho", "tinh thanh pho"],
  contact_fullname: ["b1 ho va ten", "ho va ten nguoi lien he"], contact_phone: ["b2 so dien thoai", "so dien thoai nguoi lien he"],
  contact_email: ["b3 email", "email nguoi lien he"], contact_position: ["b4 chuc vu", "chuc vu nguoi lien he"],
  contact_position_other: ["chuc vu khac"],
  team_size: ["c1 so luong nhan su chinh thuc", "so luong nhan su chinh thuc"],
  part_time_jobs: ["c2 so viec lam da tao ra", "so viec lam da tao ra"], project_start_year: ["c3 thoi gian bat dau du an", "nam bat dau du an"],
  fields: ["c4 linh vuc hoat dong", "linh vuc hoat dong"], development_stage: ["c5 giai doan phat trien", "giai doan phat trien"],
  revenue_last_3_years: ["d1 doanh thu 3 nam gan nhat", "doanh thu 3 nam gan nhat"],
  has_revenue: ["da co doanh thu", "co doanh thu"], has_raised_fund: ["da huy dong von", "co huy dong von"], fundraising_stage: ["vong goi von", "giai doan goi von"],
  raised_amount: ["d3 so von da huy dong", "so von da huy dong"], fundraising_need: ["nhu cau goi von"],
  has_intellectual_property: ["co tai san tri tue", "so huu tri tue"], intellectual_property_detail: ["chi tiet tai san tri tue"], patent_count: ["e1 so bang sang che", "so bang sang che"],
  utility_solution_count: ["e2 so giai phap huu ich", "so giai phap huu ich"], markets: ["thi truong", "thi truong muc tieu"],
  has_international_revenue: ["doanh thu hoac khach hang tu thi truong quoc te"],
  received_supports: ["da duoc sihub ho tro"], support_needs: ["nhu cau ho tro"],
};

module.exports = Object.freeze({
  TRAINING: { aliases: { ...STARTUP, incubation_status: ["trang thai uom tao"] }, identity: ["fullname"] },
  SEMINAR: { aliases: STARTUP, identity: ["fullname"] },
  EXHIBITION: { aliases: { ...STARTUP, exhibition_product_name: ["ten san pham trung bay", "san pham trien lam"], visitor_count: ["so luot khach", "luot khach ghe gian hang"], highlight_impression: ["an tuong noi bat"], organizer_feedback: ["gop y ban to chuc", "phan hoi ban to chuc"] }, identity: ["fullname"] },
  NETWORKING: { aliases: STARTUP, identity: ["fullname"] },
  INCUBATION: { aliases: INCUBATION, identity: ["project_name", "contact_fullname"] },
});
