import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ChevronLeft, ChevronRight, Eye, Loader2, Download, X } from "lucide-react";
import missionApi from "../../services/missionApi";

const API_URL = "http://localhost:5000/api";

const EMPTY_FORM = {
  training_course_name: "",
  description: "",
  year: "",
  mission_id: "",
  status: "ACTIVE",
};

const TRAINING_YEAR_OPTIONS = Array.from(
  { length: 101 },
  (_, index) => 2100 - index,
);

const MISSION_SOURCE_LABELS = {
  A: "Nhiệm vụ của Sở Khoa học và Công nghệ",
  B: "Nhiệm vụ của Bộ/Sở ban ngành khác / dịch vụ phối hợp với đối tác",
};

const getStatusLabel = (status) =>
  ({
    ACTIVE: "Đang hoạt động",
    INACTIVE: "Ngừng hoạt động",
  })[status] || status;
function getStatusClass(status) {
  if (status === "ACTIVE") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-600";
}

function formatDetailDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat("vi-VN").format(date);
}

export default function Courses() {
  const [trainingCourses, setTrainingCourses] = useState([]);
  const [activeMissions, setActiveMissions] = useState([]);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [currentCanonicalMission, setCurrentCanonicalMission] = useState(null);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [filterYearOptions, setFilterYearOptions] = useState([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseClasses, setCourseClasses] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailLevel, setDetailLevel] = useState("PROGRAM");
  const [selectedTrainingClass, setSelectedTrainingClass] = useState(null);
  const [classOpenings, setClassOpenings] = useState([]);
  const [selectedOpening, setSelectedOpening] = useState(null);
  const [openingStudents, setOpeningStudents] = useState([]);
  const [openingStudentTotal, setOpeningStudentTotal] = useState(0);
  const [detailError, setDetailError] = useState("");
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  const token = localStorage.getItem("admin_token");
  const authConfig = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token],
  );

  const fetchTrainingCourses = useCallback(async () => {
    try {
      setLoading(true);

      const params = {};

      if (search.trim()) {
        params.keyword = search.trim();
      }

      if (statusFilter) {
        params.status = statusFilter;
      }

      if (yearFilter) {
        params.year = yearFilter;
      }

      const response = await axios.get(`${API_URL}/training-courses`, {
        params,
      });

      setTrainingCourses(
        Array.isArray(response.data?.data) ? response.data.data : [],
      );
    } catch (error) {
      console.error("Lỗi tải khóa đào tạo:", error.response?.data || error);

      setTrainingCourses([]);

      alert(
        error.response?.data?.message ||
          "Không thể tải danh sách nhiệm vụ đào tạo.",
      );
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, yearFilter]);

  const fetchFilterYearOptions = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/training-courses/years`);
      setFilterYearOptions(
        Array.isArray(response.data?.data) ? response.data.data : [],
      );
    } catch (error) {
      console.error(
        "Lá»—i táº£i danh sÃ¡ch nÄƒm khÃ³a Ä‘Ã o táº¡o:",
        error.response?.data || error,
      );
      setFilterYearOptions([]);
    }
  }, []);

  const fetchActiveMissions = useCallback(async () => {
    try {
      setMissionsLoading(true);
      const response = await missionApi.list({ status: "ACTIVE" });
      setActiveMissions(
        Array.isArray(response.data?.data) ? response.data.data : [],
      );
    } catch (error) {
      console.error(
        "Lỗi tải danh sách nhiệm vụ:",
        error.response?.data || error,
      );
      setActiveMissions([]);
      alert(
        error.response?.data?.message ||
          "Không thể tải danh sách nhiệm vụ đang hoạt động.",
      );
    } finally {
      setMissionsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTrainingCourses();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchTrainingCourses]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchActiveMissions();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchActiveMissions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFilterYearOptions();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchFilterYearOptions]);

  const totalPages = Math.max(1, Math.ceil(trainingCourses.length / limit));
  const safePage = Math.min(page, totalPages);
  const paginatedCourses = trainingCourses.slice(
    (safePage - 1) * limit,
    safePage * limit,
  );
  const startItem =
    trainingCourses.length === 0 ? 0 : (safePage - 1) * limit + 1;

  const endItem = Math.min(safePage * limit, trainingCourses.length);
  const summary = useMemo(
    () => ({
      total: trainingCourses.length,

      active: trainingCourses.filter((item) => item.status === "ACTIVE").length,

      totalClasses: trainingCourses.reduce(
        (sum, item) => sum + Number(item.total_course_groups || 0),
        0,
      ),

      totalOpenings: trainingCourses.reduce(
        (sum, item) => sum + Number(item.total_classes || 0),
        0,
      ),
    }),
    [trainingCourses],
  );
  const openCreateModal = () => {
    setEditingId(null);
    setCurrentCanonicalMission(null);

    setFormData({
      ...EMPTY_FORM,
    });

    setShowModal(true);
  };
  const openEditModal = (item) => {
    setEditingId(item.id);
    setCurrentCanonicalMission(item.canonical_mission || null);

    setFormData({
      training_course_name: item.training_course_name || "",

      description: item.description || "",

      year: item.year == null ? "" : String(item.year),

      mission_id: item.mission_id ? String(item.mission_id) : "",

      status: item.status || "ACTIVE",
    });

    setShowModal(true);
  };
  const handleViewCourse = async (item) => {
    try {
      setDetailLoading(true);

      // Mở popup trước với thông tin đang có
      setSelectedCourse(item);
      setCourseClasses([]);
      setDetailLevel("PROGRAM");
      setSelectedTrainingClass(null);
      setClassOpenings([]);
      setSelectedOpening(null);
      setOpeningStudents([]);
      setOpeningStudentTotal(0);
      setDetailError("");

      // Lấy các lớp thuộc khóa đào tạo này
      const response = await axios.get(`${API_URL}/classes`, {
        params: {
          training_course_id: item.id,
        },
      });

      setCourseClasses(
        Array.isArray(response.data?.data) ? response.data.data : [],
      );
    } catch (error) {
      console.error(
        "Lỗi tải chi tiết khóa đào tạo:",
        error.response?.data || error,
      );

      setCourseClasses([]);

      alert(
        error.response?.data?.message || "Không thể tải chi tiết nhiệm vụ đào tạo.",
      );
    } finally {
      setDetailLoading(false);
    }
  };
  const openCourseDetail = async (course) => {
    try {
      setSelectedTrainingClass(course);
      setDetailLevel("COURSE");
      setDetailLoading(true);
      setDetailError("");
      setClassOpenings([]);
      const response = await axios.get(`${API_URL}/course-classes/course/${course.id}`);
      setClassOpenings(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      setDetailError(error.response?.data?.message || "Không thể tải danh sách Khóa đào tạo.");
    } finally {
      setDetailLoading(false);
    }
  };
  const openClassDetail = async (opening) => {
    try {
      setSelectedOpening(opening);
      setDetailLevel("CLASS");
      setDetailLoading(true);
      setDetailError("");
      setOpeningStudents([]);
      setOpeningStudentTotal(0);
      const [detailResponse, studentResponse] = await Promise.all([
        axios.get(`${API_URL}/course-classes/${opening.id}`),
        axios.get(`${API_URL}/registrations`, {
          ...authConfig,
          params: { class_id: opening.id, limit: 100 },
        }),
      ]);
      setSelectedOpening(detailResponse.data?.data || opening);
      setOpeningStudents(Array.isArray(studentResponse.data?.data) ? studentResponse.data.data : []);
      setOpeningStudentTotal(Number(studentResponse.data?.total) || 0);
    } catch (error) {
      setDetailError(error.response?.data?.message || "Không thể tải chi tiết Khóa đào tạo.");
    } finally {
      setDetailLoading(false);
    }
  };
  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingId(null);
    setCurrentCanonicalMission(null);

    setFormData({
      ...EMPTY_FORM,
    });
  };

  const updateField = (name, value) => {
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };
  const handleExportExcel = async () => {
    try {
      setExporting(true);

      const params = {};

      if (search.trim()) {
        params.keyword = search.trim();
      }

      if (statusFilter) {
        params.status = statusFilter;
      }

      if (yearFilter) {
        params.year = yearFilter;
      }

      const response = await axios.get(`${API_URL}/training-courses/export`, {
        ...authConfig,
        params,
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;

      link.download = `khoa-dao-tao-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Xuất Excel khóa đào tạo lỗi:", error);

      let message = "Không thể xuất Excel nhiệm vụ đào tạo.";

      try {
        const errorBlob = error.response?.data;

        if (errorBlob instanceof Blob) {
          const text = await errorBlob.text();

          const parsed = JSON.parse(text);

          message = parsed?.message || message;
        } else {
          message = error.response?.data?.message || message;
        }
      } catch {
        // giữ thông báo mặc định
      }

      alert(message);
    } finally {
      setExporting(false);
    }
  };
  const handleSave = async (event) => {
    event.preventDefault();

    const trainingCourseName = formData.training_course_name.trim();

    if (!trainingCourseName) {
      alert("Vui lòng nhập tên nhiệm vụ đào tạo.");

      return;
    }

    const payload = {
      training_course_name: trainingCourseName,

      description: formData.description.trim() || null,

      year: formData.year === "" ? null : Number(formData.year),

      mission_id: formData.mission_id,

      status: formData.status,
    };

    try {
      setSaving(true);

      let response;

      if (editingId) {
        response = await axios.put(
          `${API_URL}/training-courses/${editingId}`,
          payload,
          authConfig,
        );
      } else {
        response = await axios.post(
          `${API_URL}/training-courses`,
          payload,
          authConfig,
        );
      }

      alert(
        response.data.message ||
          (editingId
            ? "Cập nhật nhiệm vụ đào tạo thành công."
            : "Thêm nhiệm vụ đào tạo thành công."),
      );

      closeModal();

      await fetchTrainingCourses();
      await fetchFilterYearOptions();
    } catch (error) {
      console.error(
        "TRAINING COURSE SAVE ERROR:",
        error.response?.data || error,
      );

      alert(error.response?.data?.message || "Không thể lưu nhiệm vụ đào tạo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    const accepted = window.confirm(
      `Xóa nhiệm vụ đào tạo "${item.training_course_name}"?\n\n` +
        "Nhiệm vụ đào tạo đang có khóa đào tạo sẽ không thể xóa.",
    );

    if (!accepted) {
      return;
    }

    try {
      setDeletingId(item.id);

      const response = await axios.delete(
        `${API_URL}/training-courses/${item.id}`,
        authConfig,
      );

      alert(response.data.message || "Xóa nhiệm vụ đào tạo thành công.");

      await fetchTrainingCourses();
    } catch (error) {
      alert(error.response?.data?.message || "Không thể xóa nhiệm vụ đào tạo.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Quản lý nhiệm vụ đào tạo
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Quản lý các nhiệm vụ đào tạo và theo dõi số khóa đào tạo trực thuộc.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={fetchTrainingCourses}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? "Đang tải..." : "Làm mới"}
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting || loading}
            className="flex items-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Download size={18} />
            )}

            {exporting ? "Đang xuất..." : "Xuất Excel"}
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
          >
            Thêm nhiệm vụ đào tạo
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Tổng nhiệm vụ đào tạo" value={summary.total} />

        <SummaryCard
          label="Đang hoạt động"
          value={summary.active}
          valueClass="text-green-600"
        />

        <SummaryCard
          label="Tổng khóa đào tạo"
          value={summary.totalClasses}
          valueClass="text-blue-600"
        />

        <SummaryCard
          label="Tổng đợt tổ chức"
          value={summary.totalOpenings}
          valueClass="text-violet-600"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_200px_240px]">
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);

              setPage(1);
            }}
            placeholder="Tìm tên nhiệm vụ đào tạo..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
          />

          <select
            value={yearFilter}
            onChange={(event) => {
              setYearFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
          >
            <option value="">Tất cả năm</option>
            {filterYearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);

              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
          >
            <option value="">Tất cả trạng thái</option>

            <option value="ACTIVE">Đang hoạt động</option>

            <option value="INACTIVE">Ngừng hoạt động</option>
          </select>
          {(search || yearFilter || statusFilter) && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setYearFilter("");
                  setStatusFilter("");
                  setPage(1);
                }}
                className="text-sm font-medium text-green-600 hover:text-green-700"
              >
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1580px]">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-4">STT</th>

                <th className="px-5 py-4">Nhiệm vụ đào tạo</th>

                <th className="px-5 py-4">Năm</th>

                <th className="px-5 py-4">Mô tả</th>

                <th className="px-5 py-4">Nhiệm vụ</th>

                <th className="px-5 py-4 text-center">Khóa đào tạo</th>

                <th className="px-5 py-4 text-center">Đợt tổ chức</th>

                <th className="px-5 py-4">Trạng thái</th>

                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-16 text-center">
                    <Loader2
                      size={30}
                      className="mx-auto animate-spin text-green-600"
                    />

                    <p className="mt-3 text-sm text-slate-500">
                      Đang tải danh sách nhiệm vụ đào tạo...
                    </p>
                  </td>
                </tr>
              ) : paginatedCourses.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-16 text-center text-slate-500"
                  >
                    Không tìm thấy nhiệm vụ đào tạo phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedCourses.map((item, index) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 text-sm hover:bg-slate-50/70"
                  >
                    {/* STT */}

                    <td className="px-5 py-4 text-slate-500">
                      {(safePage - 1) * limit + index + 1}
                    </td>

                    {/* KHÓA ĐÀO TẠO */}

                    <td className="max-w-[420px] px-5 py-4">
                      <p className="font-semibold leading-6 text-slate-900">
                        {item.training_course_name || "Chưa đặt tên"}
                      </p>
                    </td>

                    <td className="px-5 py-4 font-medium text-slate-700">
                      {item.year ?? "Chưa xác định"}
                    </td>

                    {/* MÔ TẢ */}

                    <td className="max-w-[420px] px-5 py-4">
                      <p className="line-clamp-3 leading-6 text-slate-600">
                        {item.description || "Chưa có mô tả"}
                      </p>
                    </td>

                    {/* NHIỆM VỤ CANONICAL */}

                    <td className="max-w-[360px] px-5 py-4">
                      <CanonicalMissionSummary mission={item.canonical_mission} />
                    </td>

                    {/* LỚP HỌC */}

                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                        {Number(item.total_course_groups || 0)}
                      </span>
                    </td>

                    {/* ĐỢT TỔ CHỨC */}

                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-700">
                        {Number(item.total_classes || 0)}
                      </span>
                    </td>

                    {/* TRẠNG THÁI */}

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
                ${getStatusClass(item.status)}
              `}
                      >
                        {getStatusLabel(item.status)}
                      </span>
                    </td>

                    {/* THAO TÁC */}

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleViewCourse(item)}
                          className="rounded-lg border border-blue-200 p-2 text-blue-600 hover:bg-blue-50"
                          title="Xem chi tiết nhiệm vụ đào tạo"
                        >
                          <Eye size={17} />
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="rounded-lg border border-amber-200 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50"
                        >
                          Sửa
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          disabled={deletingId === item.id}
                          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === item.id ? "Đang xóa..." : "Xóa"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Hiển thị{" "}
            <b>
              {startItem}-{endItem}
            </b>{" "}
            trên <b>{trainingCourses.length}</b> nhiệm vụ đào tạo
          </p>
          <div className="flex items-center gap-3">
            <select
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value={10}>10 dòng</option>
              <option value={20}>20 dòng</option>
              <option value={50}>50 dòng</option>
            </select>
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((previous) => Math.max(previous - 1, 1))}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-40"
            >
              Trước
            </button>
            <span className="min-w-24 text-center text-sm font-medium">
              Trang {safePage}/{totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() =>
                setPage((previous) => Math.min(previous + 1, totalPages))
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      </div>
      {/* =========================================
    COURSE DETAIL MODAL
========================================= */}

      {selectedCourse && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-slate-50 shadow-2xl">
            {/* HEADER */}
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Chi tiết nhiệm vụ đào tạo
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Thông tin nhiệm vụ đào tạo và danh sách khóa đào tạo trực thuộc.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedCourse(null);
                  setCourseClasses([]);
                  setDetailLevel("PROGRAM");
                  setSelectedTrainingClass(null);
                  setClassOpenings([]);
                  setSelectedOpening(null);
                  setOpeningStudents([]);
                  setDetailError("");
                }}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={22} />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <button type="button" onClick={() => setDetailLevel("PROGRAM")} className={detailLevel === "PROGRAM" ? "font-semibold text-slate-900" : "font-semibold text-green-700 hover:underline"}>Nhiệm vụ đào tạo</button>
                {detailLevel !== "PROGRAM" && <><ChevronRight size={15} className="text-slate-400" /><button type="button" onClick={() => setDetailLevel("COURSE")} className={detailLevel === "COURSE" ? "font-semibold text-slate-900" : "font-semibold text-green-700 hover:underline"}>Nhiệm vụ khóa đào tạo</button></>}
                {detailLevel === "CLASS" && <><ChevronRight size={15} className="text-slate-400" /><span className="font-semibold text-slate-900">Khóa đào tạo</span></>}
              </div>

              {detailLevel !== "PROGRAM" && <button type="button" onClick={() => setDetailLevel(detailLevel === "CLASS" ? "COURSE" : "PROGRAM")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ChevronLeft size={16} />Quay lại</button>}

              {detailError && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{detailError}</div>}

              {detailLevel === "PROGRAM" && <>
              {/* THÔNG TIN KHÓA */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {selectedCourse.training_course_name || "Chưa đặt tên"}
                    </h3>

                    <p className="mt-3 max-w-4xl whitespace-pre-line text-sm leading-6 text-slate-600">
                      {selectedCourse.description || "Chưa có mô tả."}
                    </p>
                  </div>

                  <span
                    className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                      selectedCourse.status,
                    )}`}
                  >
                    {getStatusLabel(selectedCourse.status)}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <CourseDetailItem
                    label="Năm"
                    value={selectedCourse.year ?? "Chưa xác định"}
                  />

                  <CourseDetailItem
                    label="Số khóa đào tạo"
                    value={`${Number(
                      selectedCourse.total_course_groups || 0,
                    )} khóa`}
                  />

                  <CourseDetailItem
                    label="Số đợt tổ chức"
                    value={`${Number(selectedCourse.total_classes || 0)} đợt`}
                  />

                  <CourseDetailItem
                    label="Trạng thái"
                    value={getStatusLabel(selectedCourse.status)}
                  />
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Nhiệm vụ
                  </p>
                  <div className="mt-2">
                    <CanonicalMissionSummary
                      mission={selectedCourse.canonical_mission}
                    />
                  </div>
                </div>
              </section>

              {/* DANH SÁCH LỚP */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Nhiệm vụ khóa đào tạo thuộc nhiệm vụ đào tạo
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {courseClasses.length} khóa đào tạo.
                  </p>
                </div>

                {detailLoading ? (
                  <div className="py-14 text-center">
                    <Loader2
                      size={30}
                      className="mx-auto animate-spin text-green-600"
                    />

                    <p className="mt-3 text-sm text-slate-500">
                      Đang tải danh sách khóa đào tạo...
                    </p>
                  </div>
                ) : courseClasses.length === 0 ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center">
                    <p className="font-medium text-slate-700">
                      Chưa có khóa đào tạo
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Nhiệm vụ đào tạo này chưa có khóa đào tạo trực thuộc.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px]">
                        <thead className="bg-slate-50">
                          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <th className="px-4 py-3">Nhiệm vụ khóa đào tạo</th>

                            <th className="px-4 py-3">Thời lượng</th>

                            <th className="px-4 py-3 text-center">
                              Đợt tổ chức
                            </th>

                            <th className="px-4 py-3 text-center">Học viên</th>

                            <th className="px-4 py-3">Trạng thái</th>
                            <th className="w-40 px-4 py-3 text-right">Thao tác</th>
                          </tr>
                        </thead>

                        <tbody>
                          {courseClasses.map((classItem) => (
                            <tr
                              key={classItem.id}
                              className="border-t border-slate-100 text-sm"
                            >
                              <td className="px-4 py-4">
                                <p className="font-semibold text-slate-900">
                                  {classItem.class_name || "—"}
                                </p>

                                {classItem.short_description && (
                                  <p className="mt-1 max-w-md text-xs text-slate-500">
                                    {classItem.short_description}
                                  </p>
                                )}
                              </td>

                              <td className="px-4 py-4 text-slate-600">
                                {classItem.duration || "—"}
                              </td>

                              <td className="px-4 py-4 text-center font-semibold text-blue-700">
                                {Number(classItem.total_class_openings || 0)}
                              </td>

                              <td className="px-4 py-4 text-center font-semibold text-violet-700">
                                {Number(classItem.total_students || 0)}
                              </td>

                              <td className="px-4 py-4">
                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getCourseClassStatusClass(
                                    classItem.status,
                                  )}`}
                                >
                                  {getCourseClassStatusLabel(classItem.status)}
                                </span>
                              </td>
                              <td className="w-40 px-4 py-4 text-right">
                                <button type="button" onClick={() => openCourseDetail(classItem)} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 font-semibold text-blue-600 hover:bg-blue-50" title="Xem chi tiết"><Eye size={17} />Xem chi tiết</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
              </>}

              {detailLevel === "COURSE" && <>
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><h3 className="break-words text-2xl font-bold text-slate-900">{selectedTrainingClass?.class_name || "Chưa đặt tên"}</h3><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{selectedTrainingClass?.description || selectedTrainingClass?.short_description || "Chưa có mô tả."}</p></div><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getCourseClassStatusClass(selectedTrainingClass?.status)}`}>{getCourseClassStatusLabel(selectedTrainingClass?.status)}</span></div>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2"><CourseDetailItem label="Tổng Khóa đào tạo" value={classOpenings.length} /><CourseDetailItem label="Tổng học viên" value={classOpenings.reduce((sum, item) => sum + (Number(item.current_students) || 0), 0)} /></div>
                </section>
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 bg-slate-50 px-5 py-4"><h3 className="font-bold text-slate-900">Khóa đào tạo</h3><p className="mt-1 text-sm text-slate-500">Danh sách Khóa đào tạo trực thuộc.</p></div>
                  {detailLoading ? <div className="py-12 text-center"><Loader2 size={28} className="mx-auto animate-spin text-green-600" /><p className="mt-3 text-sm text-slate-500">Đang tải Khóa đào tạo...</p></div> : classOpenings.length === 0 ? <p className="py-12 text-center text-sm text-slate-500">Chưa có Khóa đào tạo trực thuộc.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Khóa đào tạo</th><th className="px-4 py-3">Thời gian / Địa điểm</th><th className="px-4 py-3 text-center">Học viên</th><th className="px-4 py-3">Trạng thái</th><th className="w-40 px-4 py-3 text-right">Thao tác</th></tr></thead><tbody>{classOpenings.map((opening) => <tr key={opening.id} className="border-t border-slate-100"><td className="max-w-[280px] px-4 py-4 font-semibold text-slate-900"><p className="break-words">{opening.class_name || "—"}</p></td><td className="max-w-[300px] px-4 py-4 text-slate-600"><p>{[formatDetailDate(opening.organization_start_date), formatDetailDate(opening.organization_end_date)].filter(Boolean).join(" – ") || opening.schedule_note || "Chưa có thời gian"}</p><p className="mt-1 text-xs text-slate-500">{opening.location || "Chưa có địa điểm"}</p></td><td className="px-4 py-4 text-center font-semibold">{Number(opening.current_students) || 0}</td><td className="px-4 py-4"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getCourseClassStatusClass(opening.effective_status || opening.status)}`}>{getCourseClassStatusLabel(opening.effective_status || opening.status)}</span></td><td className="w-40 px-4 py-4 text-right"><button type="button" onClick={() => openClassDetail(opening)} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 font-semibold text-blue-600 hover:bg-blue-50" title="Xem chi tiết"><Eye size={17} />Xem chi tiết</button></td></tr>)}</tbody></table></div>}
                </section>
              </>}

              {detailLevel === "CLASS" && <>
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><h3 className="break-words text-2xl font-bold text-slate-900">{selectedOpening?.class_name || "Chưa đặt tên"}</h3><p className="mt-3 text-sm text-slate-600">{[formatDetailDate(selectedOpening?.organization_start_date), formatDetailDate(selectedOpening?.organization_end_date)].filter(Boolean).join(" – ") || selectedOpening?.schedule_note || "Chưa có thời gian"}</p><p className="mt-1 text-sm text-slate-500">{selectedOpening?.location || "Chưa có địa điểm"}</p></div><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getCourseClassStatusClass(selectedOpening?.effective_status || selectedOpening?.status)}`}>{getCourseClassStatusLabel(selectedOpening?.effective_status || selectedOpening?.status)}</span></div></section>
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4"><h3 className="font-bold text-slate-900">Danh sách học viên</h3><span className="text-sm font-semibold text-slate-600">{openingStudentTotal} học viên</span></div>{detailLoading ? <div className="py-12 text-center"><Loader2 size={28} className="mx-auto animate-spin text-green-600" /></div> : openingStudents.length === 0 ? <p className="py-12 text-center text-sm text-slate-500">Khóa đào tạo chưa có học viên.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Họ và tên</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Điện thoại</th><th className="px-4 py-3">Trạng thái</th></tr></thead><tbody>{openingStudents.map((student) => <tr key={student.id} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold text-slate-900">{student.fullname || "—"}</td><td className="px-4 py-3 text-slate-600">{student.email || "—"}</td><td className="px-4 py-3 text-slate-600">{student.phone || "—"}</td><td className="px-4 py-3 text-slate-600">{student.register_status || "—"}</td></tr>)}</tbody></table></div>}</section>
              </>}
            </div>
          </div>
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-slate-50 shadow-2xl">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingId
                    ? "Cập nhật nhiệm vụ đào tạo"
                    : "Thêm nhiệm vụ đào tạo mới"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Nhiệm vụ đào tạo có thể bao gồm nhiều khóa đào tạo và nhiều đợt tổ
                  chức.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6 p-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="space-y-5">
                  <FormInput
                    label="Tên nhiệm vụ đào tạo"
                    required
                    value={formData.training_course_name}
                    onChange={(value) =>
                      updateField("training_course_name", value)
                    }
                    placeholder="Nhập tên nhiệm vụ đào tạo..."
                  />

                  <FormTextArea
                    label="Mô tả"
                    value={formData.description}
                    onChange={(value) => updateField("description", value)}
                    placeholder="Mô tả nội dung và mục tiêu của nhiệm vụ đào tạo..."
                  />

                  <FormSelect
                    label="Năm"
                    value={formData.year}
                    onChange={(value) => updateField("year", value)}
                  >
                    <option value="">Chưa xác định</option>
                    {TRAINING_YEAR_OPTIONS.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </FormSelect>

                  <FormSelect
                    label="Nhiệm vụ"
                    value={formData.mission_id}
                    onChange={(value) => updateField("mission_id", value)}
                    disabled={missionsLoading}
                  >
                    <option value="">
                      {missionsLoading
                        ? "Đang tải nhiệm vụ..."
                        : "Không chọn nhiệm vụ"}
                    </option>

                    {currentCanonicalMission?.status === "INACTIVE" && (
                      <optgroup label="Nhiệm vụ hiện tại">
                        <option value={String(currentCanonicalMission.id)}>
                          [Ngừng hoạt động] {currentCanonicalMission.mission_name}
                        </option>
                      </optgroup>
                    )}

                    {Object.entries(MISSION_SOURCE_LABELS).map(
                      ([source, label]) => {
                        const sourceMissions = activeMissions.filter(
                          (mission) => mission.mission_source === source,
                        );

                        if (sourceMissions.length === 0) {
                          return null;
                        }

                        return (
                          <optgroup key={source} label={`${source} — ${label}`}>
                            {sourceMissions.map((mission) => (
                              <option
                                key={mission.id}
                                value={String(mission.id)}
                              >
                                {mission.mission_name}
                              </option>
                            ))}
                          </optgroup>
                        );
                      },
                    )}
                  </FormSelect>

                  <FormSelect
                    label="Trạng thái"
                    value={formData.status}
                    onChange={(value) => updateField("status", value)}
                  >
                    <option value="ACTIVE">Đang hoạt động</option>

                    <option value="INACTIVE">Ngừng hoạt động</option>
                  </FormSelect>
                </div>
              </section>

              <div className="flex justify-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {saving
                    ? "Đang lưu..."
                    : editingId
                      ? "Lưu thay đổi"
                      : "Thêm nhiệm vụ đào tạo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CanonicalMissionSummary({ mission }) {
  if (!mission) {
    return <span className="text-sm text-slate-400">Chưa chọn nhiệm vụ</span>;
  }

  return (
    <div>
      <p className="font-semibold leading-6 text-slate-900">
        {mission.mission_name}
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        {mission.mission_source} —
        {` ${MISSION_SOURCE_LABELS[mission.mission_source] || mission.mission_source}`}
      </p>
      <span
        className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
          mission.status,
        )}`}
      >
        {getStatusLabel(mission.status)}
      </span>
    </div>
  );
}

function CourseDetailItem({ label, value }) {
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

function getCourseClassStatusLabel(status) {
  const labels = {
    OPEN: "Đang mở",
    FULL: "Đã đầy",
    CLOSED: "Đã đóng",
    FINISHED: "Đã kết thúc",
  };

  return labels[status] || status || "—";
}

function getCourseClassStatusClass(status) {
  switch (status) {
    case "OPEN":
      return "border-green-200 bg-green-50 text-green-700";

    case "FULL":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "FINISHED":
      return "border-blue-200 bg-blue-50 text-blue-700";

    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}
function SummaryCard({ label, value, valueClass = "text-slate-900" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

function FormInput({ label, value, onChange, required, placeholder }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <input
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
      />
    </div>
  );
}

function FormTextArea({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <textarea
        rows={5}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
      />
    </div>
  );
}

function FormSelect({ label, value, onChange, children, required, disabled }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100 disabled:bg-slate-100"
      >
        {children}
      </select>
    </div>
  );
}
