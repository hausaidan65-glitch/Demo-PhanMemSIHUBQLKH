import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";

import {
  ArrowLeft,
  Loader2,
  Send,
  CheckCircle2,
  Rocket,
  CalendarDays,
  Building2,
  Plus,
  Trash2,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// =====================================================
// OPTIONS
// =====================================================

const SELECTION_PROGRAMS = [
  {
    value: "2024",
    label: "Dự án đã được tuyển chọn vào chương trình năm 2024",
  },
  {
    value: "2025",
    label: "Dự án đã được tuyển chọn vào chương trình năm 2025",
  },
  {
    value: "NONE",
    label: "Tôi không thuộc chương trình trên",
  },
  {
    value: "OTHER",
    label: "Khác",
  },
];

const CONTACT_POSITIONS = [
  { value: "FOUNDER_CEO", label: "Founder / CEO" },
  { value: "CO_FOUNDER", label: "Co-Founder" },
  { value: "DIRECTOR", label: "Giám đốc" },
  { value: "MANAGER", label: "Quản lý" },
  { value: "STAFF", label: "Nhân viên" },
  { value: "OTHER", label: "Khác" },
];

const PROJECT_FIELDS = [
  { code: "ECOMMERCE", name: "Thương mại điện tử" },
  { code: "FINTECH", name: "Công nghệ tài chính" },
  { code: "LOGISTICS", name: "Logistics" },
  { code: "EDTECH", name: "Công nghệ giáo dục" },
  {
    code: "HEALTHCARE",
    name: "Y tế và chăm sóc sức khỏe",
  },
  {
    code: "HIGH_TECH_AGRICULTURE",
    name: "Nông nghiệp công nghệ cao",
  },
  {
    code: "SUSTAINABILITY",
    name: "Phát triển bền vững",
  },
  {
    code: "AI",
    name: "Chuyển đổi số, trí tuệ nhân tạo",
  },
  {
    code: "CYBERSECURITY",
    name: "An ninh mạng",
  },
  {
    code: "CULTURAL_INDUSTRY",
    name: "Công nghiệp văn hóa",
  },
  {
    code: "OTHER",
    name: "Lĩnh vực khác",
  },
];

const DEVELOPMENT_STAGES = [
  { value: "IDEA", label: "Giai đoạn ý tưởng" },
  {
    value: "PROTOTYPE",
    label: "Giai đoạn Prototype",
  },
  {
    value: "MVP",
    label: "Giai đoạn Prototype / MVP",
  },
  {
    value: "EARLY_REVENUE",
    label: "Đã có sản phẩm và doanh thu ban đầu",
  },
  {
    value: "GROWTH",
    label: "Giai đoạn tăng trưởng",
  },
  {
    value: "SCALE",
    label: "Giai đoạn mở rộng",
  },
  {
    value: "OTHER",
    label: "Khác",
  },
];

const FUNDRAISING_STAGES = [
  { value: "NONE", label: "Chưa gọi vốn" },
  { value: "PRE_SEED", label: "Pre-Seed" },
  { value: "SEED", label: "Seed" },
  { value: "SERIES_A", label: "Series A" },
  { value: "SERIES_B", label: "Series B" },
  { value: "SERIES_C_PLUS", label: "Series C trở lên" },
  { value: "OTHER", label: "Khác" },
];

const MARKETS = [
  {
    code: "HCMC",
    name: "Thành phố Hồ Chí Minh",
  },
  {
    code: "VIETNAM",
    name: "Việt Nam",
  },
  {
    code: "SOUTHEAST_ASIA",
    name: "Đông Nam Á",
  },
  {
    code: "ASIA",
    name: "Châu Á",
  },
  {
    code: "NORTH_AMERICA",
    name: "Bắc Mỹ",
  },
  {
    code: "EUROPE",
    name: "Châu Âu",
  },
  {
    code: "AUSTRALIA_NEW_ZEALAND",
    name: "Úc / New Zealand",
  },
  {
    code: "MIDDLE_EAST",
    name: "Trung Đông",
  },
  {
    code: "OTHER",
    name: "Thị trường khác",
  },
];

const SUPPORT_NEEDS = [
  {
    code: "TRAINING",
    name: "Huấn luyện nâng cao năng lực về khởi nghiệp sáng tạo",
  },
  {
    code: "EXHIBITION",
    name: "Triển lãm, giới thiệu sản phẩm đến thị trường",
  },
  {
    code: "MENTOR_CONNECTION",
    name: "Kết nối Mentor",
  },
  {
    code: "STARTUP_CERTIFICATE",
    name: "Hỗ trợ đăng ký giấy chứng nhận Doanh nghiệp khởi nghiệp sáng tạo",
  },
  {
    code: "SCIENCE_TECH_CERTIFICATE",
    name: "Hỗ trợ đăng ký giấy chứng nhận Doanh nghiệp khoa học công nghệ",
  },
  {
    code: "IP_CONSULTING",
    name: "Tư vấn sở hữu trí tuệ",
  },
  {
    code: "OTHER",
    name: "Nhu cầu hỗ trợ khác",
  },
];

const INITIAL_FORM = {
  // A
  selection_program: "",
  selection_program_other: "",

  project_name: "",
  company_name: "",
  address: "",
  province_city: "",
  website: "",
  tax_code: "",

  // B
  contact_fullname: "",
  contact_phone: "",
  contact_email: "",
  contact_position: "",
  contact_position_other: "",

  // C
  team_size: "",
  part_time_jobs: "",
  project_start_year: "",
  fields: [],
  field_other: "",
  development_stage: "",
  development_stage_other: "",

  // D
  revenue_last_3_years: "",
  charter_capital: "",
  raised_amount: "",
  fundraising_stage: "",

  // E
  patent_count: "",
  utility_solution_count: "",
  product_count: "",
  service_count: "",
  customer_count: "",

  // F
  markets: [],
  market_other: "",
  has_international_revenue: "",
  international_revenue: "",
  international_customer_count: "",

  // G
  no_received_support: false,
  received_supports: [
    {
      provider_code: "",
      provider_name: "",
      provider_other: "",
      support_code: "",
      support_name: "",
      support_detail: "",
      support_year: "",
    },
  ],

  // H
  support_needs: [],
  support_need_other: "",
};

export default function IncubationApplication() {
  const { id } = useParams();

  const [program, setProgram] = useState(null);

  const [form, setForm] = useState(INITIAL_FORM);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState(null);

  // =====================================================
  // LOAD PROGRAM
  // =====================================================
  useEffect(() => {
    const fetchProgram = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await axios.get(`${API_URL}/incubation-programs/${id}`);

        setProgram(res.data?.data || null);
      } catch (err) {
        console.error("Lỗi tải chương trình:", err.response?.data || err);

        setError(
          err.response?.data?.message ||
            "Không thể tải thông tin chương trình.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProgram();
  }, [id]);

  // =====================================================
  // FORMAT DATE
  // =====================================================
  const formatDate = (value) => {
    if (!value) return "Đang cập nhật";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Đang cập nhật";
    }

    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // =====================================================
  // NORMAL INPUT
  // =====================================================
  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (error) setError("");
  };

  // =====================================================
  // CHECKBOX FIELD
  // =====================================================
  const toggleField = (item) => {
    setForm((prev) => {
      const existed = prev.fields.some(
        (field) => field.field_code === item.code,
      );

      return {
        ...prev,

        fields: existed
          ? prev.fields.filter((field) => field.field_code !== item.code)
          : [
              ...prev.fields,
              {
                field_code: item.code,
                field_name: item.name,
                other_detail: null,
              },
            ],
      };
    });

    setError("");
  };

  // =====================================================
  // CHECKBOX MARKET
  // =====================================================
  const toggleMarket = (item) => {
    setForm((prev) => {
      const existed = prev.markets.some(
        (market) => market.market_code === item.code,
      );

      return {
        ...prev,

        markets: existed
          ? prev.markets.filter((market) => market.market_code !== item.code)
          : [
              ...prev.markets,
              {
                market_code: item.code,
                market_name: item.name,
                other_detail: null,
              },
            ],
      };
    });

    setError("");
  };

  // =====================================================
  // CHECKBOX SUPPORT NEED
  // =====================================================
  const toggleSupportNeed = (item) => {
    setForm((prev) => {
      const existed = prev.support_needs.some(
        (need) => need.need_code === item.code,
      );

      return {
        ...prev,

        support_needs: existed
          ? prev.support_needs.filter((need) => need.need_code !== item.code)
          : [
              ...prev.support_needs,
              {
                need_code: item.code,
                need_name: item.name,
                other_detail: null,
              },
            ],
      };
    });

    setError("");
  };

  // =====================================================
  // RECEIVED SUPPORT
  // =====================================================
  const updateReceivedSupport = (index, name, value) => {
    setForm((prev) => {
      const next = [...prev.received_supports];

      next[index] = {
        ...next[index],
        [name]: value,
      };

      return {
        ...prev,
        received_supports: next,
      };
    });
  };

  const addReceivedSupport = () => {
    setForm((prev) => ({
      ...prev,

      received_supports: [
        ...prev.received_supports,
        {
          provider_code: "",
          provider_name: "",
          provider_other: "",
          support_code: "",
          support_name: "",
          support_detail: "",
          support_year: "",
        },
      ],
    }));
  };

  const removeReceivedSupport = (index) => {
    setForm((prev) => ({
      ...prev,

      received_supports: prev.received_supports.filter((_, i) => i !== index),
    }));
  };

  const handleNoReceivedSupport = (checked) => {
    setForm((prev) => ({
      ...prev,

      no_received_support: checked,

      received_supports: checked
        ? [
            {
              provider_code: "NONE",
              provider_name: "Chưa nhận hỗ trợ",
              provider_other: "",
              support_code: "NONE",
              support_name: "Chưa nhận hỗ trợ",
              support_detail: "",
              support_year: "",
            },
          ]
        : [
            {
              provider_code: "",
              provider_name: "",
              provider_other: "",
              support_code: "",
              support_name: "",
              support_detail: "",
              support_year: "",
            },
          ],
    }));
  };

  // =====================================================
  // VALIDATE
  // =====================================================
  const validate = () => {
    // A
    if (!form.selection_program) {
      return "Vui lòng chọn thông tin chương trình tuyển chọn.";
    }

    if (
      form.selection_program === "OTHER" &&
      !form.selection_program_other.trim()
    ) {
      return "Vui lòng ghi rõ chương trình tuyển chọn khác.";
    }

    if (!form.project_name.trim()) {
      return "Vui lòng nhập tên dự án.";
    }

    if (!form.company_name.trim()) {
      return "Vui lòng nhập tên doanh nghiệp.";
    }

    if (!form.address.trim()) {
      return "Vui lòng nhập địa chỉ.";
    }

    if (!form.province_city.trim()) {
      return "Vui lòng nhập tỉnh / thành phố.";
    }

    if (!form.website.trim()) {
      return "Vui lòng nhập Website / Fanpage.";
    }

    if (!form.tax_code.trim()) {
      return "Vui lòng nhập mã số thuế.";
    }

    // B
    if (!form.contact_fullname.trim()) {
      return "Vui lòng nhập họ tên người liên hệ.";
    }

    const phone = form.contact_phone.replace(/\D/g, "");

    if (phone.length < 9 || phone.length > 11) {
      return "Số điện thoại không hợp lệ.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(form.contact_email.trim())) {
      return "Email không hợp lệ.";
    }

    if (!form.contact_position) {
      return "Vui lòng chọn chức vụ.";
    }

    if (
      form.contact_position === "OTHER" &&
      !form.contact_position_other.trim()
    ) {
      return "Vui lòng ghi rõ chức vụ khác.";
    }

    // C
    if (form.team_size === "" || Number(form.team_size) < 0) {
      return "Vui lòng nhập quy mô nhân sự.";
    }

    if (form.part_time_jobs === "" || Number(form.part_time_jobs) < 0) {
      return "Vui lòng nhập số việc làm bán thời gian / thời vụ.";
    }

    const currentYear = new Date().getFullYear();

    if (
      !Number.isInteger(Number(form.project_start_year)) ||
      Number(form.project_start_year) < 1900 ||
      Number(form.project_start_year) > currentYear
    ) {
      return "Năm bắt đầu dự án không hợp lệ.";
    }

    if (!form.fields.length) {
      return "Vui lòng chọn ít nhất một lĩnh vực hoạt động.";
    }

    if (
      form.fields.some((x) => x.field_code === "OTHER") &&
      !form.field_other.trim()
    ) {
      return "Vui lòng ghi rõ lĩnh vực hoạt động khác.";
    }

    if (!form.development_stage) {
      return "Vui lòng chọn giai đoạn phát triển.";
    }

    if (
      form.development_stage === "OTHER" &&
      !form.development_stage_other.trim()
    ) {
      return "Vui lòng ghi rõ giai đoạn phát triển khác.";
    }

    // D
    const financialValues = [
      form.revenue_last_3_years,
      form.charter_capital,
      form.raised_amount,
    ];

    if (
      financialValues.some(
        (value) =>
          value === "" || Number.isNaN(Number(value)) || Number(value) < 0,
      )
    ) {
      return "Vui lòng nhập đầy đủ thông tin tài chính.";
    }

    if (!form.fundraising_stage) {
      return "Vui lòng chọn giai đoạn gọi vốn.";
    }

    // E
    const productValues = [
      form.patent_count,
      form.utility_solution_count,
      form.product_count,
      form.service_count,
      form.customer_count,
    ];

    if (
      productValues.some(
        (value) =>
          value === "" || Number.isNaN(Number(value)) || Number(value) < 0,
      )
    ) {
      return "Vui lòng nhập đầy đủ thông tin sản phẩm và sở hữu trí tuệ.";
    }

    // F
    if (!form.markets.length) {
      return "Vui lòng chọn ít nhất một thị trường.";
    }

    if (
      form.markets.some((x) => x.market_code === "OTHER") &&
      !form.market_other.trim()
    ) {
      return "Vui lòng ghi rõ thị trường khác.";
    }

    if (form.has_international_revenue === "") {
      return "Vui lòng cho biết doanh nghiệp có doanh thu quốc tế hay chưa.";
    }

    if (form.has_international_revenue === "YES") {
      if (
        form.international_revenue === "" ||
        Number(form.international_revenue) < 0
      ) {
        return "Vui lòng nhập doanh thu quốc tế.";
      }

      if (
        form.international_customer_count === "" ||
        Number(form.international_customer_count) < 0
      ) {
        return "Vui lòng nhập số khách hàng quốc tế.";
      }
    }

    // G
    if (!form.received_supports.length) {
      return "Vui lòng cung cấp thông tin hỗ trợ đã nhận.";
    }

    if (!form.no_received_support) {
      for (const item of form.received_supports) {
        if (!item.provider_name.trim()) {
          return "Vui lòng nhập đơn vị đã hỗ trợ.";
        }

        if (!item.support_code.trim()) {
          return "Vui lòng nhập mã / loại nội dung hỗ trợ.";
        }

        if (!item.support_name.trim()) {
          return "Vui lòng nhập nội dung hỗ trợ đã nhận.";
        }

        if (!item.support_detail.trim()) {
          return "Vui lòng mô tả chi tiết hỗ trợ đã nhận.";
        }

        if (
          !Number.isInteger(Number(item.support_year)) ||
          Number(item.support_year) < 1900
        ) {
          return "Năm nhận hỗ trợ không hợp lệ.";
        }
      }
    }

    // H
    if (!form.support_needs.length) {
      return "Vui lòng chọn ít nhất một nhu cầu hỗ trợ.";
    }

    if (
      form.support_needs.some((x) => x.need_code === "OTHER") &&
      !form.support_need_other.trim()
    ) {
      return "Vui lòng ghi rõ nhu cầu hỗ trợ khác.";
    }

    return "";
  };

  // =====================================================
  // SUBMIT
  // =====================================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    const message = validate();

    if (message) {
      setError(message);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const fields = form.fields.map((item) => ({
        ...item,

        other_detail:
          item.field_code === "OTHER" ? form.field_other.trim() : null,
      }));

      const markets = form.markets.map((item) => ({
        ...item,

        other_detail:
          item.market_code === "OTHER" ? form.market_other.trim() : null,
      }));

      const supportNeeds = form.support_needs.map((item) => ({
        ...item,

        other_detail:
          item.need_code === "OTHER" ? form.support_need_other.trim() : null,
      }));

      const receivedSupports = form.received_supports.map((item) => ({
        provider_code:
          item.provider_code ||
          item.provider_name.trim().toUpperCase().replace(/\s+/g, "_"),

        provider_name: item.provider_name.trim(),

        provider_other: item.provider_other.trim() || null,

        support_code: item.support_code.trim(),

        support_name: item.support_name.trim(),

        support_detail: item.support_detail.trim() || null,

        support_year:
          item.support_year === "" ? null : Number(item.support_year),
      }));

      const payload = {
        // A
        selection_program: form.selection_program,

        selection_program_other:
          form.selection_program === "OTHER"
            ? form.selection_program_other.trim()
            : null,

        project_name: form.project_name.trim(),

        company_name: form.company_name.trim(),

        address: form.address.trim(),

        province_city: form.province_city.trim(),

        website: form.website.trim(),

        tax_code: form.tax_code.trim(),

        // B
        contact_fullname: form.contact_fullname.trim(),

        contact_phone: form.contact_phone.replace(/\D/g, ""),

        contact_email: form.contact_email.trim().toLowerCase(),

        contact_position: form.contact_position,

        contact_position_other:
          form.contact_position === "OTHER"
            ? form.contact_position_other.trim()
            : null,

        // C
        team_size: Number(form.team_size),

        part_time_jobs: Number(form.part_time_jobs),

        project_start_year: Number(form.project_start_year),

        fields,

        development_stage: form.development_stage,

        development_stage_other:
          form.development_stage === "OTHER"
            ? form.development_stage_other.trim()
            : null,

        // D
        revenue_last_3_years: Number(form.revenue_last_3_years),

        charter_capital: Number(form.charter_capital),

        raised_amount: Number(form.raised_amount),

        fundraising_stage: form.fundraising_stage,

        // E
        patent_count: Number(form.patent_count),

        utility_solution_count: Number(form.utility_solution_count),

        product_count: Number(form.product_count),

        service_count: Number(form.service_count),

        customer_count: Number(form.customer_count),

        // F
        markets,

        has_international_revenue: form.has_international_revenue === "YES",

        international_revenue:
          form.has_international_revenue === "YES"
            ? Number(form.international_revenue)
            : 0,

        international_customer_count:
          form.has_international_revenue === "YES"
            ? Number(form.international_customer_count)
            : 0,

        // G
        received_supports: receivedSupports,

        // H
        support_needs: supportNeeds,
      };

      const res = await axios.post(
        `${API_URL}/incubation-programs/${id}/apply`,
        payload,
      );

      setSuccessData(res.data?.data || {});
    } catch (err) {
      console.error("Lỗi gửi hồ sơ:", err.response?.data || err);

      setError(
        err.response?.data?.message || "Không thể gửi hồ sơ. Vui lòng thử lại.",
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================
  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 size={42} className="mx-auto animate-spin text-green-600" />

          <p className="mt-4 text-slate-500">Đang tải chương trình...</p>
        </div>
      </div>
    );
  }

  // =====================================================
  // SUCCESS
  // =====================================================
  if (successData) {
    const successProgram = successData.program || program;

    return (
      <div className="min-h-screen bg-slate-50 px-6 py-14">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 size={42} />
            </div>

            <h1 className="mt-6 text-3xl font-bold text-slate-900">
              Gửi hồ sơ thành công!
            </h1>

            <p className="mt-3 text-slate-500">
              Hồ sơ đã được gửi đến SIHUB để xem xét.
            </p>

            <div className="mt-8 rounded-2xl bg-slate-50 p-6 text-left">
              <p className="text-xs font-bold uppercase tracking-wide text-green-600">
                Chương trình ươm tạo
              </p>

              <h2 className="mt-2 text-xl font-bold text-slate-900">
                {successProgram?.program_name}
              </h2>

              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <p>
                  <b>Dự án:</b>{" "}
                  {successData.application?.project_name || form.project_name}
                </p>

                <p>
                  <b>Doanh nghiệp:</b>{" "}
                  {successData.application?.company_name || form.company_name}
                </p>

                <p>
                  <b>Người liên hệ:</b>{" "}
                  {successData.application?.contact_fullname ||
                    form.contact_fullname}
                </p>

                <p>
                  <b>Trạng thái:</b>{" "}
                  <span className="font-semibold text-amber-600">
                    SUBMITTED — Chờ SIHUB xem xét
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to={`/incubation-programs/${id}`}
                className="rounded-xl border border-slate-200 px-6 py-3 font-semibold text-slate-700"
              >
                Xem lại chương trình
              </Link>

              <Link
                to="/incubation-programs"
                className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white"
              >
                Xem chương trình khác
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-7xl px-6">
        <Link
          to={`/incubation-programs/${id}`}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-green-600"
        >
          <ArrowLeft size={18} />
          Quay lại chương trình
        </Link>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-green-600">
                Chương trình ươm tạo SIHUB
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                Hồ sơ đăng ký chương trình
              </h1>

              <p className="mt-3 leading-7 text-slate-500">
                Vui lòng cung cấp đầy đủ thông tin doanh nghiệp / dự án.
              </p>

              <p className="mt-2 text-sm text-slate-400">
                Các trường có dấu <span className="text-red-500">*</span> là bắt
                buộc.
              </p>
            </div>

            {error && (
              <div className="mb-7 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-12">
              {/* ================= A ================= */}
              <Section title="A. Thông tin dự án / doanh nghiệp">
                <Field label="Chương trình tuyển chọn" required>
                  <select
                    name="selection_program"
                    value={form.selection_program}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="">Chọn thông tin</option>

                    {SELECTION_PROGRAMS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </Field>

                {form.selection_program === "OTHER" && (
                  <div className="mt-5">
                    <Field label="Chương trình tuyển chọn khác" required>
                      <input
                        name="selection_program_other"
                        value={form.selection_program_other}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                )}

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <Field label="Tên dự án" required>
                    <input
                      name="project_name"
                      value={form.project_name}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Tên doanh nghiệp" required>
                    <input
                      name="company_name"
                      value={form.company_name}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </Field>

                  <div className="md:col-span-2">
                    <Field label="Địa chỉ" required>
                      <input
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <Field label="Tỉnh / Thành phố" required>
                    <input
                      name="province_city"
                      value={form.province_city}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Mã số thuế" required>
                    <input
                      name="tax_code"
                      value={form.tax_code}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </Field>

                  <div className="md:col-span-2">
                    <Field label="Website / Fanpage" required>
                      <input
                        name="website"
                        value={form.website}
                        onChange={handleChange}
                        className={inputClass}
                        placeholder="https://..."
                      />
                    </Field>
                  </div>
                </div>
              </Section>

              {/* ================= B ================= */}
              <Section title="B. Thông tin người liên hệ">
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="Họ và tên" required>
                    <input
                      name="contact_fullname"
                      value={form.contact_fullname}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Số điện thoại" required>
                    <input
                      type="tel"
                      name="contact_phone"
                      value={form.contact_phone}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Email" required>
                    <input
                      type="email"
                      name="contact_email"
                      value={form.contact_email}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Chức vụ" required>
                    <select
                      name="contact_position"
                      value={form.contact_position}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      <option value="">Chọn chức vụ</option>

                      {CONTACT_POSITIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                {form.contact_position === "OTHER" && (
                  <div className="mt-5">
                    <Field label="Chức vụ khác" required>
                      <input
                        name="contact_position_other"
                        value={form.contact_position_other}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                )}
              </Section>

              {/* ================= C ================= */}
              <Section title="C. Quy mô và giai đoạn phát triển">
                <div className="grid gap-5 md:grid-cols-3">
                  <NumberField
                    label="Nhân sự chính thức"
                    name="team_size"
                    value={form.team_size}
                    onChange={handleChange}
                  />

                  <NumberField
                    label="Việc làm bán thời gian / thời vụ"
                    name="part_time_jobs"
                    value={form.part_time_jobs}
                    onChange={handleChange}
                  />

                  <NumberField
                    label="Năm bắt đầu dự án"
                    name="project_start_year"
                    value={form.project_start_year}
                    onChange={handleChange}
                    min="1900"
                    max={new Date().getFullYear()}
                  />
                </div>

                <div className="mt-6">
                  <Field label="Lĩnh vực hoạt động" required>
                    <CheckboxGrid>
                      {PROJECT_FIELDS.map((item) => (
                        <Checkbox
                          key={item.code}
                          label={item.name}
                          checked={form.fields.some(
                            (x) => x.field_code === item.code,
                          )}
                          onChange={() => toggleField(item)}
                        />
                      ))}
                    </CheckboxGrid>
                  </Field>
                </div>

                {form.fields.some((x) => x.field_code === "OTHER") && (
                  <div className="mt-5">
                    <Field label="Lĩnh vực khác" required>
                      <input
                        name="field_other"
                        value={form.field_other}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                )}

                <div className="mt-6">
                  <Field label="Giai đoạn phát triển" required>
                    <select
                      name="development_stage"
                      value={form.development_stage}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      <option value="">Chọn giai đoạn</option>

                      {DEVELOPMENT_STAGES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                {form.development_stage === "OTHER" && (
                  <div className="mt-5">
                    <Field label="Giai đoạn khác" required>
                      <input
                        name="development_stage_other"
                        value={form.development_stage_other}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                )}
              </Section>

              {/* ================= D ================= */}
              <Section title="D. Tài chính và gọi vốn">
                <div className="grid gap-5 md:grid-cols-2">
                  <MoneyField
                    label="Doanh thu 3 năm gần nhất (VNĐ)"
                    name="revenue_last_3_years"
                    value={form.revenue_last_3_years}
                    onChange={handleChange}
                  />

                  <MoneyField
                    label="Vốn điều lệ (VNĐ)"
                    name="charter_capital"
                    value={form.charter_capital}
                    onChange={handleChange}
                  />

                  <MoneyField
                    label="Số vốn đã huy động (VNĐ)"
                    name="raised_amount"
                    value={form.raised_amount}
                    onChange={handleChange}
                  />

                  <Field label="Giai đoạn gọi vốn" required>
                    <select
                      name="fundraising_stage"
                      value={form.fundraising_stage}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      <option value="">Chọn giai đoạn</option>

                      {FUNDRAISING_STAGES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              </Section>

              {/* ================= E ================= */}
              <Section title="E. Sản phẩm và sở hữu trí tuệ">
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  <NumberField
                    label="Số bằng sáng chế"
                    name="patent_count"
                    value={form.patent_count}
                    onChange={handleChange}
                  />

                  <NumberField
                    label="Số giải pháp hữu ích"
                    name="utility_solution_count"
                    value={form.utility_solution_count}
                    onChange={handleChange}
                  />

                  <NumberField
                    label="Số sản phẩm"
                    name="product_count"
                    value={form.product_count}
                    onChange={handleChange}
                  />

                  <NumberField
                    label="Số dịch vụ"
                    name="service_count"
                    value={form.service_count}
                    onChange={handleChange}
                  />

                  <NumberField
                    label="Số khách hàng"
                    name="customer_count"
                    value={form.customer_count}
                    onChange={handleChange}
                  />
                </div>
              </Section>

              {/* ================= F ================= */}
              <Section title="F. Thị trường">
                <Field label="Thị trường hoạt động" required>
                  <CheckboxGrid>
                    {MARKETS.map((item) => (
                      <Checkbox
                        key={item.code}
                        label={item.name}
                        checked={form.markets.some(
                          (x) => x.market_code === item.code,
                        )}
                        onChange={() => toggleMarket(item)}
                      />
                    ))}
                  </CheckboxGrid>
                </Field>

                {form.markets.some((x) => x.market_code === "OTHER") && (
                  <div className="mt-5">
                    <Field label="Thị trường khác" required>
                      <input
                        name="market_other"
                        value={form.market_other}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </Field>
                  </div>
                )}

                <div className="mt-7">
                  <Field
                    label="Doanh nghiệp / dự án có doanh thu quốc tế?"
                    required
                  >
                    <div className="flex gap-6">
                      <Radio
                        name="has_international_revenue"
                        value="YES"
                        checked={form.has_international_revenue === "YES"}
                        onChange={handleChange}
                        label="Có"
                      />

                      <Radio
                        name="has_international_revenue"
                        value="NO"
                        checked={form.has_international_revenue === "NO"}
                        onChange={handleChange}
                        label="Không"
                      />
                    </div>
                  </Field>
                </div>

                {form.has_international_revenue === "YES" && (
                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <MoneyField
                      label="Doanh thu quốc tế (VNĐ)"
                      name="international_revenue"
                      value={form.international_revenue}
                      onChange={handleChange}
                    />

                    <NumberField
                      label="Số khách hàng quốc tế"
                      name="international_customer_count"
                      value={form.international_customer_count}
                      onChange={handleChange}
                    />
                  </div>
                )}
              </Section>

              {/* ================= G ================= */}
              <Section title="G. Hỗ trợ đã nhận">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    type="checkbox"
                    checked={form.no_received_support}
                    onChange={(e) => handleNoReceivedSupport(e.target.checked)}
                  />

                  <span className="font-medium text-slate-700">
                    Chưa từng nhận hỗ trợ
                  </span>
                </label>

                {!form.no_received_support && (
                  <div className="mt-5 space-y-5">
                    {form.received_supports.map((item, index) => (
                      <div
                        key={index}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-slate-800">
                            Hỗ trợ #{index + 1}
                          </h3>

                          {form.received_supports.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeReceivedSupport(index)}
                              className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>

                        <div className="mt-5 grid gap-5 md:grid-cols-2">
                          <Field label="Đơn vị hỗ trợ" required>
                            <input
                              value={item.provider_name}
                              onChange={(e) =>
                                updateReceivedSupport(
                                  index,
                                  "provider_name",
                                  e.target.value,
                                )
                              }
                              className={inputClass}
                              placeholder="SIHUB, Sở KH&CN..."
                            />
                          </Field>

                          <Field label="Mã / loại hỗ trợ" required>
                            <input
                              value={item.support_code}
                              onChange={(e) =>
                                updateReceivedSupport(
                                  index,
                                  "support_code",
                                  e.target.value,
                                )
                              }
                              className={inputClass}
                              placeholder="MENTOR..."
                            />
                          </Field>

                          <div className="md:col-span-2">
                            <Field label="Nội dung hỗ trợ" required>
                              <input
                                value={item.support_name}
                                onChange={(e) =>
                                  updateReceivedSupport(
                                    index,
                                    "support_name",
                                    e.target.value,
                                  )
                                }
                                className={inputClass}
                                placeholder="Kết nối chuyên gia..."
                              />
                            </Field>
                          </div>

                          <div className="md:col-span-2">
                            <Field label="Chi tiết hỗ trợ" required>
                              <textarea
                                rows={3}
                                value={item.support_detail}
                                onChange={(e) =>
                                  updateReceivedSupport(
                                    index,
                                    "support_detail",
                                    e.target.value,
                                  )
                                }
                                className={`${inputClass} resize-none`}
                              />
                            </Field>
                          </div>

                          <Field label="Năm nhận hỗ trợ" required>
                            <input
                              type="number"
                              min="1900"
                              max={new Date().getFullYear()}
                              value={item.support_year}
                              onChange={(e) =>
                                updateReceivedSupport(
                                  index,
                                  "support_year",
                                  e.target.value,
                                )
                              }
                              className={inputClass}
                            />
                          </Field>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addReceivedSupport}
                      className="inline-flex items-center gap-2 rounded-xl border border-green-200 px-4 py-2.5 font-semibold text-green-700 hover:bg-green-50"
                    >
                      <Plus size={18} />
                      Thêm hỗ trợ đã nhận
                    </button>
                  </div>
                )}
              </Section>

              {/* ================= H ================= */}
              <Section title="H. Nhu cầu hỗ trợ">
                <Field label="Nhu cầu cần được hỗ trợ" required>
                  <CheckboxGrid>
                    {SUPPORT_NEEDS.map((item) => (
                      <Checkbox
                        key={item.code}
                        label={item.name}
                        checked={form.support_needs.some(
                          (x) => x.need_code === item.code,
                        )}
                        onChange={() => toggleSupportNeed(item)}
                      />
                    ))}
                  </CheckboxGrid>
                </Field>

                {form.support_needs.some((x) => x.need_code === "OTHER") && (
                  <div className="mt-5">
                    <Field label="Nhu cầu hỗ trợ khác" required>
                      <textarea
                        name="support_need_other"
                        value={form.support_need_other}
                        onChange={handleChange}
                        rows={3}
                        className={`${inputClass} resize-none`}
                      />
                    </Field>
                  </div>
                )}
              </Section>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-4 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 size={19} className="animate-spin" />
                    Đang gửi hồ sơ...
                  </>
                ) : (
                  <>
                    <Send size={19} />
                    Gửi hồ sơ đăng ký
                  </>
                )}
              </button>
            </form>
          </div>

          {/* SIDEBAR */}
          <aside>
            <div className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-700">
                <Rocket size={25} />
              </div>

              <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-green-600">
                {program?.program_code || "Chương trình ươm tạo"}
              </p>

              <h2 className="mt-2 text-xl font-bold leading-relaxed text-slate-900">
                {program?.program_name}
              </h2>

              <div className="mt-6 space-y-4 border-t border-slate-100 pt-5">
                <SummaryItem
                  icon={<CalendarDays size={19} />}
                  title="Hạn đăng ký"
                  value={formatDate(program?.application_close)}
                />

                <SummaryItem
                  icon={<Building2 size={19} />}
                  title="Đơn vị tổ chức"
                  value={program?.organizer || "SIHUB"}
                />
              </div>

              <div className="mt-6 rounded-2xl bg-green-50 p-4">
                <p className="text-sm font-semibold text-green-800">
                  Trạng thái sau khi gửi
                </p>

                <p className="mt-1 text-sm text-green-700">
                  SUBMITTED — Chờ SIHUB xem xét
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// UI COMPONENTS
// =====================================================

const inputClass =
  "w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-50";

function Section({ title, children }) {
  return (
    <section>
      <h2 className="mb-6 border-b border-slate-100 pb-3 text-xl font-bold text-slate-900">
        {title}
      </h2>

      {children}
    </section>
  );
}

function Field({ label, required = false, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold leading-6 text-slate-700">
        {label}

        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children}
    </div>
  );
}

function NumberField({ label, name, value, onChange, min = "0", max }) {
  return (
    <Field label={label} required>
      <input
        type="number"
        min={min}
        max={max}
        step="1"
        name={name}
        value={value}
        onChange={onChange}
        className={inputClass}
        placeholder="0"
      />
    </Field>
  );
}

function MoneyField({ label, name, value, onChange }) {
  return (
    <Field label={label} required>
      <input
        type="number"
        min="0"
        step="1"
        name={name}
        value={value}
        onChange={onChange}
        className={inputClass}
        placeholder="0"
      />
    </Field>
  );
}

function CheckboxGrid({ children }) {
  return <div className="grid gap-3 md:grid-cols-2">{children}</div>;
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-1"
      />

      <span className="text-sm leading-6 text-slate-700">{label}</span>
    </label>
  );
}

function Radio({ name, value, checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
      />

      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

function SummaryItem({ icon, title, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-green-600">{icon}</div>

      <div>
        <p className="text-xs font-bold uppercase text-slate-400">{title}</p>

        <p className="mt-1 text-sm leading-6 text-slate-700">{value}</p>
      </div>
    </div>
  );
}
