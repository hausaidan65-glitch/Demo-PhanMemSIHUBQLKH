import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Loader2, X } from "lucide-react";

const API_URL = "http://localhost:5000/api";
const EMPTY_FORM = { program_name: "", description: "", status: "ACTIVE" };

const statusLabel = (status) =>
  status === "ACTIVE" ? "Đang hoạt động" : "Ngừng hoạt động";

const statusClass = (status) =>
  status === "ACTIVE"
    ? "border-green-200 bg-green-50 text-green-700"
    : "border-slate-200 bg-slate-100 text-slate-600";

export default function Programs() {
  const [programs, setPrograms] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [programCourses, setProgramCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  const token = localStorage.getItem("admin_token");
  const authConfig = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token],
  );

  const fetchPrograms = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/training-programs`);
      setPrograms(response.data.data || []);
    } catch (error) {
      console.error(error.response?.data || error);
      alert(
        error.response?.data?.message ||
          "Không thể tải danh sách chương trình đào tạo.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const filteredPrograms = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return programs;

    return programs.filter((item) =>
      [item.program_name, item.description, item.status].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(keyword),
      ),
    );
  }, [programs, search]);

  const totalPages = Math.max(1, Math.ceil(filteredPrograms.length / limit));
  const safePage = Math.min(page, totalPages);
  const paginatedPrograms = filteredPrograms.slice(
    (safePage - 1) * limit,
    safePage * limit,
  );
  const startItem =
    filteredPrograms.length === 0 ? 0 : (safePage - 1) * limit + 1;
  const endItem = Math.min(safePage * limit, filteredPrograms.length);

  const summary = useMemo(
    () => ({
      total: programs.length,
      active: programs.filter((item) => item.status === "ACTIVE").length,
      totalCourses: programs.reduce(
        (sum, item) => sum + (Number(item.total_courses) || 0),
        0,
      ),
      totalClasses: programs.reduce(
        (sum, item) => sum + (Number(item.total_classes) || 0),
        0,
      ),
    }),
    [programs],
  );

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({ ...EMPTY_FORM });
    setShowModal(true);
  };

  const openEditModal = (program) => {
    setEditingId(program.id);
    setFormData({
      program_name: program.program_name || "",
      description: program.description || "",
      status: program.status || "ACTIVE",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingId(null);
    setFormData({ ...EMPTY_FORM });
  };

  const updateField = (name, value) => {
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!formData.program_name.trim()) {
      alert("Vui lòng nhập tên chương trình đào tạo.");
      return;
    }

    const payload = {
      program_name: formData.program_name.trim(),
      description: formData.description.trim() || null,
      status: formData.status,
    };

    try {
      setSaving(true);
      const response = editingId
        ? await axios.put(
            `${API_URL}/training-programs/${editingId}`,
            payload,
            authConfig,
          )
        : await axios.post(`${API_URL}/training-programs`, payload, authConfig);

      alert(
        response.data.message ||
          (editingId
            ? "Cập nhật chương trình thành công."
            : "Thêm chương trình thành công."),
      );
      closeModal();
      await fetchPrograms();
    } catch (error) {
      alert(error.response?.data?.message || "Không thể lưu chương trình.");
    } finally {
      setSaving(false);
    }
  };
  const openCourseModal = async (program) => {
    try {
      setSelectedProgram(program);
      setShowCourseModal(true);
      setLoadingCourses(true);

      const response = await axios.get(
        `${API_URL}/courses/program/${program.id}`,
      );

      setProgramCourses(response.data.data || []);
    } catch (error) {
      console.error(error);
      alert(
        error.response?.data?.message ||
          "Không thể tải danh sách khóa đào tạo.",
      );
    } finally {
      setLoadingCourses(false);
    }
  };
  const handleDelete = async (program) => {
    const accepted = window.confirm(
      `Xóa chương trình "${program.program_name}"?\n\nChương trình đang có khóa đào tạo sẽ không thể xóa.`,
    );
    if (!accepted) return;

    try {
      setDeletingId(program.id);
      const response = await axios.delete(
        `${API_URL}/training-programs/${program.id}`,
        authConfig,
      );
      alert(response.data.message || "Xóa chương trình thành công.");
      await fetchPrograms();
      if (paginatedPrograms.length === 1 && safePage > 1) {
        setPage((previous) => Math.max(previous - 1, 1));
      }
    } catch (error) {
      alert(error.response?.data?.message || "Không thể xóa chương trình.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Quản lý chương trình đào tạo
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý các nhóm chương trình chính và tổng số khóa, lớp trực thuộc.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={fetchPrograms}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? "Đang tải..." : "Làm mới"}
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700"
          >
            Thêm chương trình
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Tổng chương trình" value={summary.total} />
        <SummaryCard
          label="Đang hoạt động"
          value={summary.active}
          valueClass="text-green-600"
        />
        <SummaryCard
          label="Tổng khóa đào tạo"
          value={summary.totalCourses}
          valueClass="text-blue-600"
        />
        <SummaryCard
          label="Tổng lớp học"
          value={summary.totalClasses}
          valueClass="text-violet-600"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Tìm tên chương trình, mô tả hoặc trạng thái..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-4">STT</th>
                <th className="px-5 py-4">Chương trình đào tạo</th>
                <th className="px-5 py-4 text-center">Số khóa</th>
                <th className="px-5 py-4 text-center">Số lớp</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <Loader2
                      size={30}
                      className="mx-auto animate-spin text-green-600"
                    />
                    <p className="mt-3 text-sm text-slate-500">
                      Đang tải danh sách chương trình...
                    </p>
                  </td>
                </tr>
              ) : paginatedPrograms.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-16 text-center text-slate-500"
                  >
                    Không tìm thấy chương trình phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedPrograms.map((program, index) => (
                  <tr
                    key={program.id}
                    className="border-b border-slate-100 text-sm hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4 text-slate-600">
                      {(safePage - 1) * limit + index + 1}
                    </td>
                    <td className="max-w-[560px] px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {program.program_name}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                        {program.description || "Chưa có mô tả"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-center font-semibold">
                      {Number(program.total_courses) || 0}
                    </td>
                    <td className="px-5 py-4 text-center font-semibold">
                      {Number(program.total_classes) || 0}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
                          program.status,
                        )}`}
                      >
                        {statusLabel(program.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openCourseModal(program)}
                          className="
 rounded-lg
 border border-blue-200
 px-3 py-2
 text-sm
 font-medium
 text-blue-600
 hover:bg-blue-50
 "
                        >
                          Xem khóa học
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(program)}
                          className="rounded-lg border border-amber-200 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(program)}
                          disabled={deletingId === program.id}
                          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === program.id ? "Đang xóa..." : "Xóa"}
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
            trên <b>{filteredPrograms.length}</b> chương trình
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
      {showCourseModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div
            className="
w-full max-w-4xl
rounded-3xl
bg-white
shadow-2xl
overflow-hidden
"
          >
            <div
              className="
flex items-center justify-between
border-b
px-6 py-5
"
            >
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {selectedProgram?.program_name}
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  {programCourses.length} khóa đào tạo thuộc chương trình này
                </p>
              </div>

              <button
                onClick={() => {
                  setShowCourseModal(false);
                  setSelectedProgram(null);
                  setProgramCourses([]);
                }}
              >
                <X size={22} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6">
              {loadingCourses ? (
                <p className="text-center">Đang tải...</p>
              ) : programCourses.length === 0 ? (
                <p className="text-center text-slate-500">
                  Chưa có khóa đào tạo
                </p>
              ) : (
                <div className="space-y-3">
                  {programCourses.map((course, index) => (
                    <div
                      key={course.id}
                      className="
rounded-xl
border
border-slate-200
p-4
flex
justify-between
items-center
"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {index + 1}. {course.course_name}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {course.total_classes || 0} lớp
                        </p>

                        <p className="text-xs text-slate-500">Số lớp mở</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-slate-50 shadow-2xl">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingId
                    ? "Cập nhật chương trình"
                    : "Thêm chương trình mới"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Quản lý thông tin của nhóm chương trình đào tạo chính.
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
                <div className="grid gap-5">
                  <FormInput
                    label="Tên chương trình"
                    required
                    value={formData.program_name}
                    onChange={(value) => updateField("program_name", value)}
                    placeholder="Nhập tên chương trình đào tạo..."
                  />
                  <FormTextArea
                    label="Mô tả"
                    value={formData.description}
                    onChange={(value) => updateField("description", value)}
                    placeholder="Mô tả mục tiêu và đối tượng của chương trình..."
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
                  className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
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
                      : "Thêm chương trình"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
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

function FormSelect({ label, value, onChange, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
      >
        {children}
      </select>
    </div>
  );
}
