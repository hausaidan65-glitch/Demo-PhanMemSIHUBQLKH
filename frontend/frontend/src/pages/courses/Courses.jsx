import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Eye, Loader2, Trash2, Download, X } from "lucide-react";

const API_URL = "http://localhost:5000/api";

const EMPTY_FORM = {
  training_course_name: "",
  description: "",
  status: "ACTIVE",
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

export default function Courses() {
  const [trainingCourses, setTrainingCourses] = useState([]);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("");

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
          "Không thể tải danh sách khóa đào tạo.",
      );
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTrainingCourses();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchTrainingCourses]);

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

    setFormData({
      ...EMPTY_FORM,
    });

    setShowModal(true);
  };
  const openEditModal = (item) => {
    setEditingId(item.id);

    setFormData({
      training_course_name: item.training_course_name || "",

      description: item.description || "",

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
        error.response?.data?.message || "Không thể tải chi tiết khóa đào tạo.",
      );
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

      let message = "Không thể xuất Excel khóa đào tạo.";

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
      alert("Vui lòng nhập tên khóa đào tạo.");

      return;
    }

    const payload = {
      training_course_name: trainingCourseName,

      description: formData.description.trim() || null,

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
            ? "Cập nhật khóa đào tạo thành công."
            : "Thêm khóa đào tạo thành công."),
      );

      closeModal();

      await fetchTrainingCourses();
    } catch (error) {
      console.error(
        "TRAINING COURSE SAVE ERROR:",
        error.response?.data || error,
      );

      alert(error.response?.data?.message || "Không thể lưu khóa đào tạo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    const accepted = window.confirm(
      `Xóa khóa đào tạo "${item.training_course_name}"?\n\n` +
        "Khóa đào tạo đang có lớp học sẽ không thể xóa.",
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

      alert(response.data.message || "Xóa khóa đào tạo thành công.");

      await fetchTrainingCourses();
    } catch (error) {
      alert(error.response?.data?.message || "Không thể xóa khóa đào tạo.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Quản lý khóa đào tạo
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Quản lý các khóa đào tạo và theo dõi số lớp học trực thuộc.
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
            Thêm khóa đào tạo
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Tổng khóa đào tạo" value={summary.total} />

        <SummaryCard
          label="Đang hoạt động"
          value={summary.active}
          valueClass="text-green-600"
        />

        <SummaryCard
          label="Tổng lớp học"
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
        <div className="grid gap-3 lg:grid-cols-[1fr_240px]">
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);

              setPage(1);
            }}
            placeholder="Tìm tên khóa đào tạo..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
          />

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
          {(search || statusFilter) && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSearch("");
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
          <table className="w-full min-w-[1380px]">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-4">STT</th>

                <th className="px-5 py-4">Khóa đào tạo</th>

                <th className="px-5 py-4">Mô tả</th>

                <th className="px-5 py-4 text-center">Lớp học</th>

                <th className="px-5 py-4 text-center">Đợt tổ chức</th>

                <th className="px-5 py-4">Trạng thái</th>

                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <Loader2
                      size={30}
                      className="mx-auto animate-spin text-green-600"
                    />

                    <p className="mt-3 text-sm text-slate-500">
                      Đang tải danh sách khóa đào tạo...
                    </p>
                  </td>
                </tr>
              ) : paginatedCourses.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-16 text-center text-slate-500"
                  >
                    Không tìm thấy khóa đào tạo phù hợp.
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

                    {/* MÔ TẢ */}

                    <td className="max-w-[420px] px-5 py-4">
                      <p className="line-clamp-3 leading-6 text-slate-600">
                        {item.description || "Chưa có mô tả"}
                      </p>
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
                          title="Xem chi tiết khóa đào tạo"
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
            trên <b>{trainingCourses.length}</b> khóa đào tạo
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
                  Chi tiết khóa đào tạo
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Thông tin khóa đào tạo và danh sách lớp học trực thuộc.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedCourse(null);
                  setCourseClasses([]);
                }}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={22} />
              </button>
            </div>

            <div className="space-y-6 p-6">
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

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <CourseDetailItem
                    label="Số lớp học"
                    value={`${Number(
                      selectedCourse.total_course_groups || 0,
                    )} lớp`}
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
              </section>

              {/* DANH SÁCH LỚP */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Lớp học thuộc khóa đào tạo
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {courseClasses.length} lớp học.
                  </p>
                </div>

                {detailLoading ? (
                  <div className="py-14 text-center">
                    <Loader2
                      size={30}
                      className="mx-auto animate-spin text-green-600"
                    />

                    <p className="mt-3 text-sm text-slate-500">
                      Đang tải danh sách lớp học...
                    </p>
                  </div>
                ) : courseClasses.length === 0 ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center">
                    <p className="font-medium text-slate-700">
                      Chưa có lớp học
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Khóa đào tạo này chưa có lớp học trực thuộc.
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px]">
                        <thead className="bg-slate-50">
                          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <th className="px-4 py-3">Lớp học</th>

                            <th className="px-4 py-3">Thời lượng</th>

                            <th className="px-4 py-3 text-center">
                              Đợt tổ chức
                            </th>

                            <th className="px-4 py-3 text-center">Học viên</th>

                            <th className="px-4 py-3">Trạng thái</th>
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
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
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
                    ? "Cập nhật khóa đào tạo"
                    : "Thêm khóa đào tạo mới"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Khóa đào tạo có thể bao gồm nhiều lớp học và nhiều đợt tổ
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
                    label="Tên khóa đào tạo"
                    required
                    value={formData.training_course_name}
                    onChange={(value) =>
                      updateField("training_course_name", value)
                    }
                    placeholder="Nhập tên khóa đào tạo..."
                  />

                  <FormTextArea
                    label="Mô tả"
                    value={formData.description}
                    onChange={(value) => updateField("description", value)}
                    placeholder="Mô tả nội dung và mục tiêu của khóa đào tạo..."
                  />

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
                      : "Thêm khóa đào tạo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
