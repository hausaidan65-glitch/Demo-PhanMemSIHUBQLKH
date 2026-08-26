import RegistrationCharts from "./RegistrationCharts";
import ImportStudentModal from "./components/ImportStudentModal";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";

import {
  Search,
  SlidersHorizontal,
  Download,
  RotateCcw,
  Eye,
  CheckCircle2,
  XCircle,
  Ban,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BarChart3,
  Upload,
  X,
} from "lucide-react";

const API_URL = "http://localhost:5000/api";

const EMPTY_FILTERS = {
  // Nghiệp vụ đào tạo mới
  training_course_id: "",
  course_id: "",
  class_id: "",
  mission: "",
  year: "",
  month: "",

  // Thông tin học viên
  age_groups: [],
  genders: [],
  companies: [],
  user_types: [],
  project_fields: [],
  startup_stages: [],

  statuses: [],

  female_founder: "",
  has_project: "",
  checked_in: "",

  date_from: "",
  date_to: "",

  sort: "NEWEST",
};

function formatDate(value) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString("vi-VN");
}

function getStatusStyle(status) {
  switch (status) {
    case "CONFIRMED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "PENDING":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "REJECTED":
      return "bg-red-50 text-red-700 border-red-200";

    case "CANCELLED":
      return "bg-slate-100 text-slate-600 border-slate-200";

    default:
      return "bg-gray-50 text-gray-600 border-gray-200";
  }
}

function getStatusLabel(status) {
  const labels = {
    PENDING: "Chờ duyệt",
    CONFIRMED: "Đã xác nhận",
    REJECTED: "Đã từ chối",
    CANCELLED: "Đã hủy",
  };

  return labels[status] || status;
}

function getGenderLabel(gender) {
  const labels = {
    MALE: "Nam",
    FEMALE: "Nữ",
    OTHER: "Khác",
  };

  return labels[gender] || gender || "—";
}
function getProgramSelectionLabel(value) {
  const labels = {
    YES: "Đã được tuyển chọn vào chương trình",
    NO: "Tôi không thuộc chương trình trên",
    NOT_SELECTED: "Tôi không thuộc chương trình trên",
    SELECTED: "Đã được tuyển chọn vào chương trình",
  };

  return labels[value] || value || "—";
}
function getUserTypeLabel(type) {
  const labels = {
    STARTUP: "Startup",
    STUDENT: "Sinh viên",
    BUSINESS: "Doanh nghiệp",
    UNIVERSITY: "Trường đại học",
    OTHER: "Khác",
  };

  return labels[type] || type || "—";
}

function MultiSelect({
  label,
  values,
  options,
  onChange,
  getOptionValue = (option) => option,
  getOptionLabel = (option) => option,
}) {
  const handleChange = (event) => {
    const selectedValues = Array.from(event.target.selectedOptions).map(
      (option) => option.value,
    );

    onChange(selectedValues);
  };

  return (
    <div>
      <label
        className="
          mb-2
          block
          text-sm
          font-medium
          text-slate-700
        "
      >
        {label}
      </label>

      <select
        multiple
        value={values.map(String)}
        onChange={handleChange}
        className="
          min-h-28
          w-full
          rounded-xl
          border
          border-slate-200
          bg-white
          px-3
          py-2
          text-sm
          outline-none
          focus:border-green-500
          focus:ring-4
          focus:ring-green-100
        "
      >
        {options.map((option) => {
          const value = getOptionValue(option);

          return (
            <option key={String(value)} value={String(value)}>
              {getOptionLabel(option)}
            </option>
          );
        })}
      </select>

      <p className="mt-1 text-xs text-slate-400">
        Giữ Ctrl để chọn nhiều giá trị
      </p>
    </div>
  );
}

export default function RegisterManagement() {
  const [registrations, setRegistrations] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    age_groups: [],
    genders: [],
    companies: [],
    user_types: [],
    project_fields: [],
    startup_stages: [],

    training_courses: [],
    classes: [],
    openings: [],

    years: [],
    months: [],

    registration_statuses: [],
  });
  const [searchParams] = useSearchParams();
  const [studentRegistrations, setStudentRegistrations] = useState([]);
  const registrationId = searchParams.get("registration_id");
  const [showCharts, setShowCharts] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);

  const [statistics, setStatistics] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);
  const [selectedRegistrationDetail, setSelectedRegistrationDetail] =
    useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const [showFilters, setShowFilters] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [pagination, setPagination] = useState({
    total: 0,
    total_pages: 1,
  });
  const handleApply = () => {
    fetchStatistics();
  };
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const token = localStorage.getItem("admin_token");

  const authConfig = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    [token],
  );
  const availableClasses = useMemo(() => {
    // Chưa chọn khóa đào tạo
    // thì cho xem tất cả lớp
    if (!filters.training_course_id) {
      return filterOptions.classes;
    }

    return filterOptions.classes.filter(
      (item) =>
        Number(item.training_course_id) === Number(filters.training_course_id),
    );
  }, [filterOptions.classes, filters.training_course_id]);
  const availableOpenings = useMemo(() => {
    // Chưa chọn lớp
    // thì chưa hiện đợt tổ chức
    if (!filters.course_id) {
      return [];
    }

    return filterOptions.openings.filter(
      (item) => Number(item.course_id) === Number(filters.course_id),
    );
  }, [filterOptions.openings, filters.course_id]);
  const buildQueryParams = useCallback(() => {
    const params = {
      page,
      limit,
    };

    if (keyword.trim()) {
      params.keyword = keyword.trim();
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          params[key] = value.join(",");
        }

        return;
      }

      if (value !== "") {
        params[key] = value;
      }
    });

    return params;
  }, [filters, keyword, limit, page]);
  const buildExportParams = useCallback(() => {
    const params = buildQueryParams();

    // Xuất toàn bộ học viên phù hợp với bộ lọc,
    // không phụ thuộc trang hiện tại.
    delete params.page;
    delete params.limit;

    // Trang Quản lý học viên đang hiển thị mỗi học viên một dòng
    params.view = "students";

    return params;
  }, [buildQueryParams]);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_URL}/registrations/filter-options`,
        authConfig,
      );

      setFilterOptions(response.data.data);
    } catch (error) {
      console.error("Lỗi lấy bộ lọc:", error.response?.data || error);
    }
  }, [authConfig]);

  const fetchRegistrations = useCallback(async () => {
    try {
      setLoading(true);

      const response = await axios.get(`${API_URL}/registrations`, {
        ...authConfig,

        params: {
          ...buildQueryParams(),
          view: "students",
        },
      });

      setRegistrations(response.data.data || []);

      setPagination({
        total: Number(response.data.total) || 0,

        total_pages: Number(response.data.total_pages) || 1,
      });
    } catch (error) {
      console.error(
        "Lỗi lấy danh sách học viên:",
        error.response?.data || error,
      );

      alert(
        error.response?.data?.message || "Không thể tải danh sách học viên.",
      );
    } finally {
      setLoading(false);
    }
  }, [authConfig, buildQueryParams]);
  const handleViewStudent = async (userId, registrationId) => {
    try {
      setDetailLoading(true);

      const response = await axios.get(`${API_URL}/registrations`, {
        ...authConfig,
        params: {
          user_id: userId,
          page: 1,
          limit: 100,
          view: "registrations",
        },
      });

      const registrationList = response.data.data || [];
      setStudentRegistrations(registrationList);
      const selected = registrationList.find(
        (item) => Number(item.id) === Number(registrationId),
      );

      if (!selected) {
        alert("Không tìm thấy đăng ký này");
        return;
      }

      setStudentDetail({
        id: userId,

        fullname: selected.fullname,
        email: selected.email,
        phone: selected.phone,

        company: selected.company || selected.organization || null,

        position: selected.position || selected.user_position || null,

        gender: selected.gender,
        age_group: selected.age_group,
        user_type: selected.user_type,

        has_project: selected.has_project,
        project_field: selected.project_field,
        startup_stage: selected.startup_stage,

        program_selection_status: selected.program_selection_status,

        support_needs: selected.support_needs,

        organizer_question: selected.organizer_question,

        note: selected.note,

        checked_in: selected.checked_in,
        checked_in_at: selected.checked_in_at,

        register_status:
          selected.register_status || selected.registration_status,

        total_registrations: registrationList.length,
      });

      setSelectedRegistrationDetail(selected);
    } catch (error) {
      console.error("Lỗi lấy hồ sơ:", error.response?.data || error);
    } finally {
      setDetailLoading(false);
    }
  };
  const openNotificationRegistration = async () => {
    if (!registrationId) {
      return;
    }

    try {
      const response = await axios.get(
        `${API_URL}/registrations/${registrationId}`,
        authConfig,
      );

      const registration = response.data.data;

      if (registration) {
        handleViewStudent(registration.user_id, registration.id);
      }
    } catch (error) {
      console.error(
        "Lỗi mở đăng ký từ notification:",
        error.response?.data || error,
      );
    }
  };
  const fetchStatistics = async () => {
    try {
      setChartLoading(true);

      const params = buildQueryParams();

      // Không cần gửi phân trang cho thống kê
      delete params.page;
      delete params.limit;

      const response = await axios.get(`${API_URL}/registrations/statistics`, {
        ...authConfig,
        params,
      });

      setStatistics(response.data.data);
      setShowCharts(true);
    } catch (error) {
      alert(error.response?.data?.message || "Không thể tải dữ liệu biểu đồ.");
    } finally {
      setChartLoading(false);
    }
  };
  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  useEffect(() => {
    fetchRegistrations();

    openNotificationRegistration();
  }, [fetchRegistrations]);

  const updateFilter = (name, value) => {
    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));

    setPage(1);
  };

  const handleSearch = (event) => {
    event.preventDefault();

    setKeyword(searchInput.trim());
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setKeyword("");

    setFilters({
      ...EMPTY_FILTERS,
    });

    setPage(1);
  };

  const callAction = async ({
    id,
    action,
    body,
    confirmMessage,
    successMessage,
  }) => {
    const accepted = window.confirm(confirmMessage);

    if (!accepted) {
      return;
    }

    try {
      setActionLoadingId(id);

      await axios.patch(
        `${API_URL}/registrations/${id}/${action}`,
        body || {},
        authConfig,
      );

      alert(successMessage);

      setSelectedRegistration(null);

      await fetchRegistrations();
    } catch (error) {
      alert(error.response?.data?.message || "Không thể thực hiện thao tác.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirm = (registration) => {
    callAction({
      id: registration.id,
      action: "confirm",
      confirmMessage: `Xác nhận đăng ký của ${registration.fullname}?`,
      successMessage: "Đã xác nhận học viên.",
    });
  };

  const handleReject = (registration) => {
    const note = window.prompt("Nhập lý do từ chối:");

    if (note === null) {
      return;
    }

    callAction({
      id: registration.id,
      action: "reject",
      body: {
        note: note.trim() || null,
      },
      confirmMessage: `Bạn chắc chắn muốn từ chối đăng ký của ${registration.fullname}?`,
      successMessage: "Đã từ chối đăng ký.",
    });
  };

  const handleCancel = (registration) => {
    const note = window.prompt("Nhập lý do hủy đăng ký:");

    if (note === null) {
      return;
    }

    callAction({
      id: registration.id,
      action: "cancel",
      body: {
        note: note.trim() || null,
      },
      confirmMessage: `Bạn chắc chắn muốn hủy đăng ký của ${registration.fullname}?`,
      successMessage: "Đã hủy đăng ký.",
    });
  };

  const handleCheckin = (registration) => {
    callAction({
      id: registration.id,
      action: "checkin",
      confirmMessage: `Check-in cho ${registration.fullname}?`,
      successMessage: "Check-in thành công.",
    });
  };

  const handleExport = async () => {
    try {
      setExporting(true);

      const params = buildExportParams();

      const response = await axios.get(`${API_URL}/registrations/export`, {
        ...authConfig,
        params,
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      const today = new Date().toISOString().slice(0, 10);

      link.href = url;
      link.download = `danh-sach-hoc-vien-${today}.xlsx`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Xuất Excel học viên lỗi:", error.response?.data || error);

      alert(
        error.response?.data?.message || "Không thể xuất danh sách học viên.",
      );
    } finally {
      setExporting(false);
    }
  };

  const activeFilterCount = useMemo(() => {
    let total = keyword ? 1 : 0;

    Object.entries(filters).forEach(([key, value]) => {
      // Sắp xếp mặc định không tính là bộ lọc
      if (key === "sort") {
        return;
      }

      if (Array.isArray(value)) {
        if (value.length > 0) {
          total += 1;
        }

        return;
      }

      if (value !== "") {
        total += 1;
      }
    });

    return total;
  }, [filters, keyword]);

  const startItem = pagination.total === 0 ? 0 : (page - 1) * limit + 1;

  const endItem = Math.min(page * limit, pagination.total);

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div
        className="
          flex
          flex-col
          gap-4
          xl:flex-row
          xl:items-center
          xl:justify-between
        "
      >
        <div>
          <h1
            className="
    text-2xl
    font-bold
    text-slate-900
  "
          >
            Quản lý học viên
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Mỗi học viên được hiển thị một lần. Bấm xem chi tiết để theo dõi
            toàn bộ lịch sử khóa học và lớp đào tạo.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={fetchStatistics}
            disabled={chartLoading}
            className="
    flex
    items-center
    gap-2
    rounded-xl
    border
    border-slate-200
    bg-white
    px-4
    py-2.5
    text-sm
    font-medium
    text-slate-700
    transition
    hover:bg-slate-50
    disabled:cursor-not-allowed
    disabled:opacity-60
  "
          >
            {chartLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <BarChart3 size={18} />
            )}

            {chartLoading ? "Đang tổng hợp..." : "Xem biểu đồ"}
          </button>
          {/* <button
            type="button"
            onClick={() => setShowImport(true)}
            className="
    flex
    items-center
    gap-2
    rounded-xl
    bg-green-600
    px-4
    py-2.5
    text-sm
    font-medium
    text-white
    shadow-sm
    transition
    hover:bg-green-700
  "
          > */}
          {/* <Upload size={18} />
            Upload Excel */}
          {/* </button> */}
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || loading}
            className="
              flex
              items-center
              gap-2
              rounded-xl
              bg-green-600
              px-4
              py-2.5
              text-sm
              font-medium
              text-white
              shadow-sm
              transition
              hover:bg-green-700
            "
          >
            {exporting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Download size={18} />
            )}

            {exporting ? "Đang xuất..." : "Xuất Excel"}
          </button>
        </div>
      </div>

      {/* SUMMARY */}

      <div
        className="
          grid
          gap-4
          sm:grid-cols-2
          xl:grid-cols-4
        "
      >
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Tổng học viên phù hợp</p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {pagination.total}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Trang hiện tại</p>

          <p className="mt-2 text-3xl font-bold text-blue-600">
            {page}/{pagination.total_pages}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Bộ lọc đang dùng</p>

          <p className="mt-2 text-3xl font-bold text-violet-600">
            {activeFilterCount}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Số dòng mỗi trang</p>

          <p className="mt-2 text-3xl font-bold text-emerald-600">{limit}</p>
        </div>
      </div>

      {/* SEARCH + FILTER BUTTON */}

      <div
        className="
          rounded-2xl
          border
          border-slate-200
          bg-white
          p-4
          shadow-sm
        "
      >
        <div
          className="
            flex
            flex-col
            gap-3
            lg:flex-row
            lg:items-center
          "
        >
          <form
            onSubmit={handleSearch}
            className="
              flex
              min-w-0
              flex-1
              items-center
              rounded-xl
              border
              border-slate-200
              bg-slate-50
              px-4
              focus-within:border-green-500
              focus-within:ring-4
              focus-within:ring-green-100
            "
          >
            <Search size={19} className="shrink-0 text-slate-400" />

            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm tên, email, số điện thoại, đơn vị, khóa đào tạo, lớp học..."
              className="
                w-full
                bg-transparent
                px-3
                py-3
                text-sm
                outline-none
              "
            />

            <button
              type="submit"
              className="
                rounded-lg
                bg-slate-900
                px-4
                py-2
                text-sm
                font-medium
                text-white
                hover:bg-slate-800
              "
            >
              Tìm
            </button>
          </form>

          <button
            type="button"
            onClick={() => setShowFilters((previous) => !previous)}
            className="
              flex
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-slate-200
              bg-white
              px-4
              py-3
              text-sm
              font-medium
              text-slate-700
              hover:bg-slate-50
            "
          >
            <SlidersHorizontal size={18} />
            Bộ lọc nâng cao
            {activeFilterCount > 0 && (
              <span
                className="
                  rounded-full
                  bg-green-100
                  px-2
                  py-0.5
                  text-xs
                  font-bold
                  text-green-700
                "
              >
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleResetFilters}
            className="
              flex
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-slate-200
              px-4
              py-3
              text-sm
              font-medium
              text-slate-600
              hover:bg-slate-50
            "
          >
            <RotateCcw size={18} />
            Đặt lại
          </button>
        </div>

        {/* FILTER PANEL */}

        {showFilters && (
          <div
            className="
              mt-5
              border-t
              border-slate-200
              pt-5
            "
          >
            <div
              className="
                grid
                gap-5
                md:grid-cols-2
                xl:grid-cols-3
              "
            >
              <MultiSelect
                label="Nhóm tuổi"
                values={filters.age_groups}
                options={filterOptions.age_groups}
                onChange={(value) => updateFilter("age_groups", value)}
              />

              <MultiSelect
                label="Giới tính"
                values={filters.genders}
                options={filterOptions.genders}
                getOptionLabel={getGenderLabel}
                onChange={(value) => updateFilter("genders", value)}
              />

              <MultiSelect
                label="Đơn vị"
                values={filters.companies}
                options={filterOptions.companies}
                onChange={(value) => updateFilter("companies", value)}
              />

              <MultiSelect
                label="Nhóm đối tượng"
                values={filters.user_types}
                options={filterOptions.user_types}
                getOptionLabel={getUserTypeLabel}
                onChange={(value) => updateFilter("user_types", value)}
              />

              <MultiSelect
                label="Lĩnh vực dự án"
                values={filters.project_fields}
                options={filterOptions.project_fields}
                onChange={(value) => updateFilter("project_fields", value)}
              />

              <MultiSelect
                label="Giai đoạn Startup"
                values={filters.startup_stages}
                options={filterOptions.startup_stages}
                onChange={(value) => updateFilter("startup_stages", value)}
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Khóa đào tạo
                </label>

                <select
                  value={filters.training_course_id}
                  onChange={(event) => {
                    setFilters((previous) => ({
                      ...previous,

                      training_course_id: event.target.value,

                      // Đổi khóa thì reset lớp + đợt
                      course_id: "",
                      class_id: "",
                    }));

                    setPage(1);
                  }}
                  className="
      w-full
      rounded-xl
      border
      border-slate-200
      bg-white
      px-3
      py-3
      text-sm
      outline-none
      focus:border-green-500
      focus:ring-4
      focus:ring-green-100
    "
                >
                  <option value="">Tất cả khóa đào tạo</option>

                  {filterOptions.training_courses.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* LỚP HỌC */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Lớp học
                </label>

                <select
                  value={filters.course_id}
                  onChange={(event) => {
                    setFilters((previous) => ({
                      ...previous,

                      course_id: event.target.value,

                      // Đổi lớp thì reset đợt
                      class_id: "",
                    }));

                    setPage(1);
                  }}
                  className="
      w-full
      rounded-xl
      border
      border-slate-200
      bg-white
      px-3
      py-3
      text-sm
      outline-none
      focus:border-green-500
      focus:ring-4
      focus:ring-green-100
    "
                >
                  <option value="">Tất cả lớp học</option>

                  {availableClasses.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Đợt tổ chức
                </label>

                <select
                  value={filters.class_id}
                  onChange={(event) =>
                    updateFilter("class_id", event.target.value)
                  }
                  disabled={!filters.course_id}
                  className="
      w-full
      rounded-xl
      border
      border-slate-200
      bg-white
      px-3
      py-3
      text-sm
      outline-none
      disabled:cursor-not-allowed
      disabled:bg-slate-100
      disabled:text-slate-400
      focus:border-green-500
      focus:ring-4
      focus:ring-green-100
    "
                >
                  <option value="">Tất cả đợt tổ chức</option>

                  {availableOpenings.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <MultiSelect
                label="Trạng thái đăng ký"
                values={filters.statuses}
                options={filterOptions.registration_statuses}
                getOptionLabel={getStatusLabel}
                onChange={(value) => updateFilter("statuses", value)}
              />

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Có nữ Founder/Co-founder
                </label>

                <select
                  value={filters.female_founder}
                  onChange={(event) =>
                    updateFilter("female_founder", event.target.value)
                  }
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-3
                    py-3
                    text-sm
                    outline-none
                    focus:border-green-500
                    focus:ring-4
                    focus:ring-green-100
                  "
                >
                  <option value="">Tất cả</option>
                  <option value="1">Có</option>
                  <option value="0">Không</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Có dự án
                </label>

                <select
                  value={filters.has_project}
                  onChange={(event) =>
                    updateFilter("has_project", event.target.value)
                  }
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-3
                    py-3
                    text-sm
                    outline-none
                    focus:border-green-500
                    focus:ring-4
                    focus:ring-green-100
                  "
                >
                  <option value="">Tất cả</option>
                  <option value="1">Có dự án</option>
                  <option value="0">Chưa có dự án</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Nhiệm vụ
                </label>

                <input
                  type="text"
                  value={filters.mission}
                  onChange={(event) => {
                    setFilters((previous) => ({
                      ...previous,
                      mission: event.target.value,
                    }));

                    setPage(1);
                  }}
                  placeholder="VD: marketing, chuyển đổi số, kết nối đầu tư..."
                  className="
      w-full
      rounded-xl
      border
      border-slate-200
      bg-white
      px-4
      py-3
      text-sm
      outline-none
      focus:border-green-500
      focus:ring-4
      focus:ring-green-100
    "
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Trạng thái Check-in
                </label>

                <select
                  value={filters.checked_in}
                  onChange={(event) =>
                    updateFilter("checked_in", event.target.value)
                  }
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-3
                    py-3
                    text-sm
                    outline-none
                    focus:border-green-500
                    focus:ring-4
                    focus:ring-green-100
                  "
                >
                  <option value="">Tất cả</option>
                  <option value="1">Đã check-in</option>
                  <option value="0">Chưa check-in</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Năm
                </label>

                <select
                  value={filters.year}
                  onChange={(event) => {
                    setFilters((previous) => ({
                      ...previous,

                      year: event.target.value,

                      // Đổi năm thì chọn lại tháng
                      month: "",
                    }));

                    setPage(1);
                  }}
                  className="
      w-full
      rounded-xl
      border
      border-slate-200
      bg-white
      px-3
      py-3
      text-sm
      outline-none
      focus:border-green-500
      focus:ring-4
      focus:ring-green-100
    "
                >
                  <option value="">Tất cả năm</option>

                  {filterOptions.years.map((year) => (
                    <option key={year} value={year}>
                      Năm {year}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Tháng
                </label>

                <select
                  value={filters.month}
                  onChange={(event) =>
                    updateFilter("month", event.target.value)
                  }
                  className="
      w-full
      rounded-xl
      border
      border-slate-200
      bg-white
      px-3
      py-3
      text-sm
      outline-none
      focus:border-green-500
      focus:ring-4
      focus:ring-green-100
    "
                >
                  <option value="">Tất cả tháng</option>

                  {filterOptions.months.map((month) => (
                    <option key={month} value={month}>
                      Tháng {month}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Từ ngày
                </label>

                <input
                  type="datetime-local"
                  value={filters.date_from}
                  onChange={(event) =>
                    updateFilter("date_from", event.target.value)
                  }
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    px-3
                    py-3
                    text-sm
                    outline-none
                  "
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Đến ngày
                </label>

                <input
                  type="datetime-local"
                  value={filters.date_to}
                  onChange={(event) =>
                    updateFilter("date_to", event.target.value)
                  }
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    px-3
                    py-3
                    text-sm
                    outline-none
                  "
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Sắp xếp
                </label>

                <select
                  value={filters.sort}
                  onChange={(event) => updateFilter("sort", event.target.value)}
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-3
                    py-3
                    text-sm
                    outline-none
                  "
                >
                  <option value="NEWEST">Mới nhất</option>

                  <option value="OLDEST">Cũ nhất</option>

                  <option value="NAME_AZ">Tên A–Z</option>

                  <option value="NAME_ZA">Tên Z–A</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STUDENT TABLE */}

      <div
        className="
    overflow-hidden
    rounded-2xl
    border
    border-slate-200
    bg-white
    shadow-sm
  "
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px]">
            <thead className="bg-slate-50">
              <tr
                className="
            border-b
            border-slate-200
            text-left
            text-xs
            font-semibold
            uppercase
            tracking-wide
            text-slate-500
          "
              >
                <th className="px-5 py-4">Học viên</th>

                <th className="px-5 py-4">Liên hệ</th>

                <th className="px-5 py-4">Đơn vị / Chức vụ</th>

                <th className="px-5 py-4">Số lớp tham gia</th>

                <th className="px-5 py-4">Lớp học đã tham gia</th>

                <th className="px-5 py-4">Lĩnh vực phù hợp</th>

                <th className="px-5 py-4">Đăng ký gần nhất</th>

                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <Loader2
                      size={30}
                      className="
                  mx-auto
                  animate-spin
                  text-green-600
                "
                    />

                    <p className="mt-3 text-sm text-slate-500">
                      Đang tải danh sách học viên...
                    </p>
                  </td>
                </tr>
              ) : registrations.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="
                px-5
                py-16
                text-center
                text-slate-500
              "
                  >
                    Không tìm thấy học viên phù hợp.
                  </td>
                </tr>
              ) : (
                registrations.map((item) => (
                  <tr
                    key={`${item.user_id}-${item.registration_id}`}
                    className="
                border-b
                border-slate-100
                text-sm
                transition
                hover:bg-slate-50/70
              "
                  >
                    <td className="px-5 py-4">
                      <p
                        className="
                    font-semibold
                    text-slate-900
                  "
                      >
                        {item.fullname}
                      </p>

                      <p
                        className="
                    mt-1
                    text-xs
                    text-slate-500
                  "
                      >
                        Mã học viên #{item.id}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-slate-700">{item.email}</p>

                      <p
                        className="
                    mt-1
                    text-xs
                    text-slate-500
                  "
                      >
                        {item.phone}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-slate-700">
                        {item.company || "Chưa có đơn vị"}
                      </p>

                      <p
                        className="
                    mt-1
                    text-xs
                    text-slate-500
                  "
                      >
                        {item.position || "Chưa có chức vụ"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className="
                    inline-flex
                    rounded-full
                    bg-green-50
                    px-3
                    py-1
                    text-sm
                    font-semibold
                    text-green-700
                  "
                      >
                        <div>
                          <span className="font-semibold text-green-700">
                            {item.matched_courses || 0} lớp
                          </span>

                          <span className="mx-1 text-slate-400">/</span>

                          <span className="text-slate-600">
                            {item.total_all_courses || 0} tổng
                          </span>
                        </div>
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <p
                        className="
                    max-w-72
                    line-clamp-2
                    text-slate-600
                  "
                      >
                        {item.matched_training_class_names || "Chưa có lớp học"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="max-w-64 line-clamp-2 text-slate-600">
                        {item.matched_project_fields || "Chưa có lĩnh vực"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-slate-600">
                        {formatDate(item.latest_register)}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <div
                        className="
                    flex
                    justify-end
                  "
                      >
                        <button
                          type="button"
                          onClick={() =>
                            handleViewStudent(
                              item.user_id,
                              item.registration_id,
                            )
                          }
                          className="
                      flex
                      items-center
                      gap-2
                      rounded-lg
                      border
                      border-blue-200
                      px-3
                      py-2
                      text-sm
                      font-medium
                      text-blue-600
                      transition
                      hover:bg-blue-50
                    "
                        >
                          <Eye size={17} />
                          Xem chi tiết
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* PAGINATION */}

        <div
          className="
            flex
            flex-col
            gap-4
            border-t
            border-slate-200
            px-5
            py-4
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <p className="text-sm text-slate-500">
            Hiển thị{" "}
            <span className="font-semibold text-slate-700">
              {startItem}–{endItem}
            </span>{" "}
            trên{" "}
            <span className="font-semibold text-slate-700">
              {pagination.total}
            </span>{" "}
            học viên
          </p>

          <div className="flex items-center gap-3">
            <select
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(1);
              }}
              className="
                rounded-lg
                border
                border-slate-200
                px-3
                py-2
                text-sm
                outline-none
              "
            >
              <option value={5}>5 dòng</option>
              <option value={10}>10 dòng</option>
              <option value={20}>20 dòng</option>
              <option value={50}>50 dòng</option>
            </select>

            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((previous) => Math.max(previous - 1, 1))}
              className="
                rounded-lg
                border
                border-slate-200
                p-2
                text-slate-600
                hover:bg-slate-50
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              <ChevronLeft size={19} />
            </button>

            <span
              className="
                min-w-24
                text-center
                text-sm
                font-medium
                text-slate-700
              "
            >
              Trang {page}/{pagination.total_pages}
            </span>

            <button
              type="button"
              disabled={page >= pagination.total_pages}
              onClick={() =>
                setPage((previous) =>
                  Math.min(previous + 1, pagination.total_pages),
                )
              }
              className="
                rounded-lg
                border
                border-slate-200
                p-2
                text-slate-600
                hover:bg-slate-50
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              <ChevronRight size={19} />
            </button>
          </div>
        </div>
      </div>
      {/* STUDENT DETAIL MODAL */}

      {studentDetail && (
        <div
          className="
      fixed
      inset-0
      z-[100]
      flex
      items-center
      justify-center
      bg-black/50
      p-4
    "
        >
          <div
            className="
        max-h-[92vh]
        w-full
        max-w-5xl
        overflow-y-auto
        rounded-3xl
        bg-white
        shadow-2xl
      "
          >
            <div
              className="
          sticky
          top-0
          z-10
          flex
          items-center
          justify-between
          border-b
          border-slate-200
          bg-white
          px-6
          py-5
        "
            >
              <div>
                <h2
                  className="
              text-xl
              font-bold
              text-slate-900
            "
                >
                  Hồ sơ học viên
                </h2>

                <p
                  className="
              mt-1
              text-sm
              text-slate-500
            "
                >
                  Thông tin cá nhân và lịch sử tham gia đào tạo.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setStudentDetail(null)}
                className="
            rounded-xl
            p-2
            text-slate-500
            hover:bg-slate-100
          "
              >
                <X size={22} />
              </button>
            </div>

            <div className="space-y-6 p-6">
              {/* PROFILE */}

              <div
                className="
            rounded-2xl
            border
            border-slate-200
            bg-slate-50
            p-5
          "
              >
                <div
                  className="
              grid
              gap-5
              sm:grid-cols-2
              lg:grid-cols-4
            "
                >
                  <DetailItem
                    label="Họ và tên"
                    value={studentDetail.fullname}
                  />

                  <DetailItem label="Email" value={studentDetail.email} />

                  <DetailItem label="Điện thoại" value={studentDetail.phone} />

                  <DetailItem
                    label="Tổng khóa tham gia"
                    value={studentDetail.total_registrations}
                  />
                  <DetailItem label="Đơn vị" value={studentDetail.company} />

                  <DetailItem label="Chức vụ" value={studentDetail.position} />

                  <DetailItem
                    label="Giới tính"
                    value={getGenderLabel(studentDetail.gender)}
                  />

                  <DetailItem
                    label="Nhóm tuổi"
                    value={studentDetail.age_group}
                  />

                  <DetailItem
                    label="Nhóm đối tượng"
                    value={getUserTypeLabel(studentDetail.user_type)}
                  />

                  <DetailItem
                    label="Có dự án"
                    value={
                      Number(studentDetail.has_project) === 1
                        ? "Có"
                        : Number(studentDetail.has_project) === 0
                          ? "Không"
                          : "—"
                    }
                  />

                  <DetailItem
                    label="Lĩnh vực dự án"
                    value={studentDetail.project_field}
                  />

                  <DetailItem
                    label="Giai đoạn Startup"
                    value={studentDetail.startup_stage}
                  />
                </div>
              </div>
              {/* REGISTRATION INFO */}

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">
                  Thông tin dự án và đăng ký
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Thông tin bổ sung của hồ sơ đăng ký đào tạo.
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <RegistrationDetailItem
                    label="Chương trình NQ20"
                    value={getProgramSelectionLabel(
                      studentDetail.program_selection_status,
                    )}
                  />

                  <RegistrationDetailItem
                    label="Trạng thái đăng ký"
                    value={getStatusLabel(studentDetail.register_status)}
                  />

                  <RegistrationDetailItem
                    label="Check-in"
                    value={
                      Number(studentDetail.checked_in) === 1
                        ? "Đã check-in"
                        : "Chưa check-in"
                    }
                  />

                  <RegistrationDetailItem
                    label="Thời gian check-in"
                    value={
                      Number(studentDetail.checked_in) === 1
                        ? formatDate(studentDetail.checked_in_at)
                        : "—"
                    }
                  />

                  <RegistrationLongItem
                    label="Nhu cầu hỗ trợ"
                    value={studentDetail.support_needs}
                  />

                  <RegistrationLongItem
                    label="Câu hỏi dành cho Ban tổ chức"
                    value={studentDetail.organizer_question}
                  />

                  <RegistrationLongItem
                    label="Ghi chú"
                    value={studentDetail.note}
                  />
                </div>
              </div>
              {/* COURSE HISTORY */}

              <div>
                <div
                  className="
              mb-4
              flex
              items-center
              justify-between
            "
                >
                  <div>
                    <h3
                      className="
                  text-lg
                  font-bold
                  text-slate-900
                "
                    >
                      Lịch sử khóa học
                    </h3>

                    <p
                      className="
                  mt-1
                  text-sm
                  text-slate-500
                "
                    >
                      Toàn bộ khóa và lớp học viên đã đăng ký.
                    </p>
                  </div>

                  <span
                    className="
                rounded-full
                bg-green-50
                px-4
                py-2
                text-sm
                font-semibold
                text-green-700
              "
                  >
                    {studentRegistrations.length} lượt đăng ký
                  </span>
                </div>

                <div
                  className="
              overflow-hidden
              rounded-2xl
              border
              border-slate-200
            "
                >
                  <div className="overflow-x-auto">
                    <table
                      className="
                  w-full
                  min-w-[900px]
                "
                    >
                      <thead className="bg-slate-50">
                        <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <th className="px-5 py-4">Khóa đào tạo</th>

                          <th className="px-5 py-4">Lớp học</th>

                          <th className="px-5 py-4">Đợt tổ chức</th>

                          <th className="px-5 py-4">Trạng thái</th>

                          <th className="px-5 py-4">Ngày đăng ký</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentRegistrations.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="
                          px-5
                          py-12
                          text-center
                          text-slate-500
                        "
                            >
                              Học viên chưa đăng ký khóa học nào.
                            </td>
                          </tr>
                        ) : (
                          studentRegistrations.map((registration, index) => (
                            <tr
                              key={`${registration.id || "registration"}-${index}`}
                            >
                              <td className="px-5 py-4 font-medium text-slate-900">
                                {registration.training_course_name || "—"}
                              </td>

                              <td className="px-5 py-4 text-slate-700">
                                {registration.training_class_name ||
                                  registration.course_name ||
                                  "—"}
                              </td>

                              <td className="px-5 py-4 text-slate-600">
                                {registration.opening_name ||
                                  registration.class_name ||
                                  "—"}
                              </td>

                              <td className="px-5 py-4">
                                <span
                                  className={`
      inline-flex
      rounded-full
      border
      px-3
      py-1
      text-xs
      font-semibold
      ${getStatusStyle(registration.register_status)}
    `}
                                >
                                  {getStatusLabel(registration.register_status)}
                                </span>
                              </td>

                              <td className="px-5 py-4 text-slate-600">
                                {formatDate(registration.created_at)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <ImportStudentModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={() => {
          fetchRegistrations();
        }}
      />
      {detailLoading && (
        <div
          className="
      fixed
      inset-0
      z-[120]
      flex
      items-center
      justify-center
      bg-black/30
    "
        >
          <div
            className="
        rounded-2xl
        bg-white
        px-6
        py-5
        shadow-xl
      "
          >
            <Loader2
              size={28}
              className="
          mx-auto
          animate-spin
          text-green-600
        "
            />

            <p className="mt-3 text-sm text-slate-600">
              Đang tải hồ sơ học viên...
            </p>
          </div>
        </div>
      )}
      {/* CHART MODAL */}
      <RegistrationCharts
        open={showCharts}
        onClose={() => setShowCharts(false)}
        loading={chartLoading}
        statistics={statistics}
        filters={filters}
        setFilters={setFilters}
        onApply={handleApply}
        onReset={handleResetFilters}
      />
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-800">
        {value === null || value === undefined || value === "" ? "—" : value}
      </p>
    </div>
  );
}
function RegistrationDetailItem({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold text-slate-800">
        {value === null || value === undefined || value === "" ? "—" : value}
      </p>
    </div>
  );
}

function RegistrationLongItem({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
        {value === null || value === undefined || value === "" ? "—" : value}
      </p>
    </div>
  );
}
