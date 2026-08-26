import { useEffect, useMemo, useState } from "react";
import {
  Trash2,
  RotateCcw,
  Search,
  RefreshCw,
  CalendarDays,
  User,
  GraduationCap,
} from "lucide-react";
const API_BASE = "http://localhost:5000/api";

export default function AdminTrash() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState(null);

  const [keyword, setKeyword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const getToken = () => {
    return localStorage.getItem("admin_token");
  };

  // =========================================================
  // LOAD TRASH
  // =========================================================
  const fetchTrash = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE}/classes/trash`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể tải dữ liệu thùng rác.");
      }

      setItems(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      console.error(err);

      setError(err.message || "Không thể tải dữ liệu thùng rác.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  // =========================================================
  // FORMAT DATE
  // =========================================================
  const formatDateTime = (value) => {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // =========================================================
  // SEARCH LOCAL
  // =========================================================
  const filteredItems = useMemo(() => {
    const text = keyword.trim().toLowerCase();

    if (!text) {
      return items;
    }

    return items.filter((item) => {
      return [
        item.class_name,
        item.training_course_name,
        item.deleted_by_name,
        item.deleted_by_username,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(text));
    });
  }, [items, keyword]);

  // =========================================================
  // RESTORE
  // =========================================================
  const handleRestore = async (item) => {
    const confirmed = window.confirm(`Khôi phục lớp học "${item.class_name}"?`);

    if (!confirmed) {
      return;
    }

    try {
      setRestoringId(item.id);
      setMessage("");
      setError("");

      const response = await fetch(`${API_BASE}/classes/${item.id}/restore`, {
        method: "PATCH",

        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể khôi phục lớp học.");
      }

      // Xóa item khỏi UI ngay
      setItems((previous) =>
        previous.filter((current) => current.id !== item.id),
      );

      setMessage(`Đã khôi phục lớp học "${item.class_name}" thành công.`);
    } catch (err) {
      console.error(err);

      setError(err.message || "Không thể khôi phục lớp học.");
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <Trash2 size={22} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">Thùng rác</h1>

            <p className="mt-1 text-sm text-slate-500">
              Dữ liệu đã xóa có thể được khôi phục lại.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchTrash}
          disabled={loading}
          className="
            inline-flex
            items-center
            justify-center
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
            shadow-sm
            transition
            hover:bg-slate-50
            disabled:opacity-50
          "
        >
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      {/* INFO */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">
              Dữ liệu đang trong thùng rác
            </p>

            <p className="mt-1 text-3xl font-bold text-slate-900">
              {items.length}
            </p>
          </div>

          <div className="relative w-full sm:max-w-sm">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm tên lớp, khóa đào tạo, admin..."
              className="
                h-11
                w-full
                rounded-xl
                border
                border-slate-200
                pl-10
                pr-4
                text-sm
                outline-none
                transition
                focus:border-green-500
                focus:ring-2
                focus:ring-green-100
              "
            />
          </div>
        </div>
      </div>

      {/* SUCCESS */}
      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {message}
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-4">#</th>

                <th className="px-5 py-4">Loại dữ liệu</th>

                <th className="px-5 py-4">Tên lớp học</th>

                <th className="px-5 py-4">Khóa đào tạo</th>

                <th className="px-5 py-4">Người xóa</th>

                <th className="px-5 py-4">Thời gian xóa</th>

                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-14 text-center text-sm text-slate-500"
                  >
                    Đang tải thùng rác...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center">
                    <Trash2 size={36} className="mx-auto mb-3 text-slate-300" />

                    <p className="font-medium text-slate-600">
                      Thùng rác đang trống
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      Chưa có lớp học nào bị xóa.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4 text-sm text-slate-500">
                      {index + 1}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700">
                        <GraduationCap size={14} />
                        Lớp học
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <p className="max-w-[280px] font-semibold text-slate-800">
                        {item.class_name}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        ID: {item.id}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="max-w-[300px] text-sm text-slate-600">
                        {item.training_course_name || "-"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                          <User size={15} />
                        </div>

                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            {item.deleted_by_name || "Không xác định"}
                          </p>

                          <p className="text-xs text-slate-400">
                            {item.deleted_by_username || ""}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 whitespace-nowrap text-sm text-slate-600">
                        <CalendarDays size={15} className="text-slate-400" />

                        {formatDateTime(item.deleted_at)}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleRestore(item)}
                        disabled={restoringId === item.id}
                        className="
                            inline-flex
                            items-center
                            gap-2
                            rounded-xl
                            bg-green-600
                            px-3.5
                            py-2
                            text-sm
                            font-semibold
                            text-white
                            transition
                            hover:bg-green-700
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                          "
                      >
                        <RotateCcw
                          size={16}
                          className={
                            restoringId === item.id ? "animate-spin" : ""
                          }
                        />

                        {restoringId === item.id
                          ? "Đang khôi phục"
                          : "Khôi phục"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
