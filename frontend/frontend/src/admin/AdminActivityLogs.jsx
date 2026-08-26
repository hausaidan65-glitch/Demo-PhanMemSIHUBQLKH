import { useEffect, useMemo, useState } from "react";
import {
  History,
  Search,
  RefreshCw,
  Trash2,
  RotateCcw,
  User,
  Clock,
  Database,
} from "lucide-react";

const API_BASE = "http://localhost:5000/api";
export default function AdminActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [keyword, setKeyword] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");

  // =========================================================
  // TOKEN
  // =========================================================
  const getToken = () => {
    return localStorage.getItem("admin_token");
  };

  // =========================================================
  // LOAD LOG
  // =========================================================
  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (keyword.trim()) {
        params.set("keyword", keyword.trim());
      }

      if (action) {
        params.set("action", action);
      }

      if (entityType) {
        params.set("entity_type", entityType);
      }

      params.set("limit", "200");

      const response = await fetch(
        `${API_BASE}/admin-activity-logs?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể tải nhật ký hoạt động.");
      }

      setLogs(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      console.error(err);

      setError(err.message || "Không thể tải nhật ký hoạt động.");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // LOAD LẦN ĐẦU
  // =========================================================
  useEffect(() => {
    fetchLogs();
  }, []);

  // =========================================================
  // SEARCH DELAY
  // =========================================================
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 400);

    return () => clearTimeout(timer);
  }, [keyword, action, entityType]);

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
      second: "2-digit",
    }).format(date);
  };

  // =========================================================
  // ACTION
  // =========================================================
  const getActionConfig = (value) => {
    switch (value) {
      case "DELETE":
        return {
          text: "Xóa",
          icon: Trash2,
          className: "bg-red-50 text-red-700 border-red-200",
        };

      case "RESTORE":
        return {
          text: "Khôi phục",
          icon: RotateCcw,
          className: "bg-green-50 text-green-700 border-green-200",
        };

      case "CREATE":
        return {
          text: "Thêm mới",
          icon: Database,
          className: "bg-blue-50 text-blue-700 border-blue-200",
        };

      case "UPDATE":
        return {
          text: "Cập nhật",
          icon: Database,
          className: "bg-amber-50 text-amber-700 border-amber-200",
        };

      default:
        return {
          text: value || "-",
          icon: History,
          className: "bg-slate-50 text-slate-700 border-slate-200",
        };
    }
  };

  // =========================================================
  // ENTITY
  // =========================================================
  const getEntityText = (value) => {
    const labels = {
      TRAINING_CLASS: "Lớp học",
      TRAINING_CLASS_OPENING: "Đợt tổ chức",
    };

    return labels[value] || value || "-";
  };

  // =========================================================
  // THỐNG KÊ NHANH
  // =========================================================
  const summary = useMemo(() => {
    return {
      total: logs.length,

      deleted: logs.filter((item) => item.action === "DELETE").length,

      restored: logs.filter((item) => item.action === "RESTORE").length,
    };
  }, [logs]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700">
              <History size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Nhật ký hoạt động
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Theo dõi lịch sử thao tác của tài khoản quản trị.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchLogs}
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

      {/* SUMMARY */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Tổng hoạt động</p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {summary.total}
          </p>
        </div>

        <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Thao tác xóa</p>

          <p className="mt-2 text-2xl font-bold text-red-600">
            {summary.deleted}
          </p>
        </div>

        <div className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Đã khôi phục</p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {summary.restored}
          </p>
        </div>
      </div>

      {/* FILTER */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_200px_220px]">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm admin, tên dữ liệu..."
              className="
                h-11
                w-full
                rounded-xl
                border
                border-slate-200
                bg-white
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

          <select
            value={action}
            onChange={(event) => setAction(event.target.value)}
            className="
              h-11
              rounded-xl
              border
              border-slate-200
              bg-white
              px-3
              text-sm
              outline-none
              focus:border-green-500
            "
          >
            <option value="">Tất cả thao tác</option>

            <option value="DELETE">Xóa</option>

            <option value="RESTORE">Khôi phục</option>
          </select>

          <select
            value={entityType}
            onChange={(event) => setEntityType(event.target.value)}
            className="
              h-11
              rounded-xl
              border
              border-slate-200
              bg-white
              px-3
              text-sm
              outline-none
              focus:border-green-500
            "
          >
            <option value="">Tất cả loại dữ liệu</option>

            <option value="TRAINING_CLASS">Lớp học</option>

            <option value="TRAINING_CLASS_OPENING">Đợt tổ chức</option>
          </select>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-4">#</th>

                <th className="px-5 py-4">Quản trị viên</th>

                <th className="px-5 py-4">Thao tác</th>

                <th className="px-5 py-4">Loại dữ liệu</th>

                <th className="px-5 py-4">Đối tượng</th>

                <th className="px-5 py-4">Thời gian</th>

                <th className="px-5 py-4">IP</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-14 text-center text-sm text-slate-500"
                  >
                    Đang tải nhật ký...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center">
                    <History
                      size={34}
                      className="mx-auto mb-3 text-slate-300"
                    />

                    <p className="font-medium text-slate-600">
                      Chưa có nhật ký hoạt động
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((item, index) => {
                  const config = getActionConfig(item.action);

                  const ActionIcon = config.icon;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4 text-sm text-slate-500">
                        {index + 1}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                            <User size={17} />
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              {item.admin_fullname ||
                                item.admin_username ||
                                "Admin"}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-500">
                              {item.admin_username}

                              {item.admin_role ? ` • ${item.admin_role}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`
                            inline-flex
                            items-center
                            gap-1.5
                            rounded-lg
                            border
                            px-2.5
                            py-1.5
                            text-xs
                            font-semibold
                            ${config.className}
                          `}
                        >
                          <ActionIcon size={14} />

                          {config.text}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700">
                          {getEntityText(item.entity_type)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <p className="max-w-[320px] text-sm font-medium text-slate-800">
                          {item.entity_name || "-"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          ID: {item.entity_id ?? "-"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 whitespace-nowrap text-sm text-slate-600">
                          <Clock size={15} className="text-slate-400" />

                          {formatDateTime(item.created_at)}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-500">
                        {item.ip_address || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
