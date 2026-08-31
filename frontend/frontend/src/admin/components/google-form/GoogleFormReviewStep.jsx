import { useMemo, useState } from "react";

import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Search,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";

const FILTERS = [
  {
    value: "ACTION_REQUIRED",
    label: "Cần xử lý",
  },
  {
    value: "ALL",
    label: "Tất cả",
  },
  {
    value: "READY",
    label: "Sẵn sàng",
  },
  {
    value: "WARNING",
    label: "Cảnh báo",
  },
  {
    value: "ERROR",
    label: "Lỗi",
  },
  {
    value: "DUPLICATE_FILE",
    label: "Trùng file",
  },
  {
    value: "JUNK",
    label: "Rác",
  },
];

// =====================================================
// STATUS CONFIG
// =====================================================

const STATUS_CONFIG = {
  READY: {
    label: "Sẵn sàng",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },

  WARNING: {
    label: "Cảnh báo",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },

  ERROR: {
    label: "Lỗi",
    className: "border-red-200 bg-red-50 text-red-700",
  },

  DUPLICATE_FILE: {
    label: "Trùng file",
    className: "border-purple-200 bg-purple-50 text-purple-700",
  },

  JUNK: {
    label: "Rác",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  },
};

// =====================================================
// COMPONENT
// =====================================================

function GoogleFormReviewStep({ cleanedPreview }) {
  const [filter, setFilter] = useState("ACTION_REQUIRED");

  const [keyword, setKeyword] = useState("");

  const rows = cleanedPreview?.rows || [];

  const summary = cleanedPreview?.summary || {};

  // =====================================================
  // FILTER
  // =====================================================

  const filteredRows = useMemo(() => {
    const search = String(keyword || "")
      .trim()
      .toLowerCase();

    return rows.filter((row) => {
      // -----------------------------------------------
      // STATUS
      // -----------------------------------------------

      if (filter === "ACTION_REQUIRED") {
        if (row.status !== "WARNING" && row.status !== "ERROR") {
          return false;
        }
      } else if (filter !== "ALL" && row.status !== filter) {
        return false;
      }

      // -----------------------------------------------
      // SEARCH
      // -----------------------------------------------

      if (!search) {
        return true;
      }

      const searchable = [
        row.data?.fullname,
        row.data?.phone,
        row.data?.email,
        row.data?.organization,
        row.data?.position,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(search);
    });
  }, [rows, filter, keyword]);

  // =====================================================
  // COUNTS
  // =====================================================

  const getCount = (type) => {
    if (type === "ALL") {
      return summary.total || 0;
    }

    if (type === "ACTION_REQUIRED") {
      return Number(summary.warning || 0) + Number(summary.error || 0);
    }

    if (type === "READY") {
      return summary.ready || 0;
    }

    if (type === "WARNING") {
      return summary.warning || 0;
    }

    if (type === "ERROR") {
      return summary.error || 0;
    }

    if (type === "JUNK") {
      return summary.junk || 0;
    }

    if (type === "DUPLICATE_FILE") {
      return summary.duplicate || 0;
    }

    return 0;
  };

  if (!cleanedPreview) {
    return null;
  }

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Kiểm tra dữ liệu
            </p>

            <h3 className="mt-1 text-lg font-bold text-slate-900">
              Danh sách chuẩn bị import
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Hệ thống đã tự loại dữ liệu rác, phát hiện trùng trong file và chỉ
              yêu cầu Admin xem các dòng cần xử lý.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700">
            <Zap size={17} />
            {summary.importable || 0} người có thể import nhanh
          </div>
        </div>
      </div>

      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <div className="grid gap-3 border-b border-slate-200 bg-slate-50/50 p-5 sm:grid-cols-2 lg:grid-cols-5">
        {/* READY */}

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 size={17} />

            <span className="text-xs font-bold">Sẵn sàng</span>
          </div>

          <p className="mt-2 text-2xl font-bold text-emerald-800">
            {summary.ready || 0}
          </p>
        </div>

        {/* WARNING */}

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle size={17} />

            <span className="text-xs font-bold">Cảnh báo</span>
          </div>

          <p className="mt-2 text-2xl font-bold text-amber-800">
            {summary.warning || 0}
          </p>
        </div>

        {/* ERROR */}

        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <div className="flex items-center gap-2 text-red-700">
            <XCircle size={17} />

            <span className="text-xs font-bold">Lỗi</span>
          </div>

          <p className="mt-2 text-2xl font-bold text-red-800">
            {summary.error || 0}
          </p>
        </div>

        {/* DUPLICATE */}

        <div className="rounded-xl border border-purple-200 bg-purple-50 p-3">
          <div className="flex items-center gap-2 text-purple-700">
            <Copy size={17} />

            <span className="text-xs font-bold">Trùng file</span>
          </div>

          <p className="mt-2 text-2xl font-bold text-purple-800">
            {summary.duplicate || 0}
          </p>
        </div>

        {/* JUNK */}

        <div className="rounded-xl border border-slate-200 bg-slate-100 p-3">
          <div className="flex items-center gap-2 text-slate-600">
            <Trash2 size={17} />

            <span className="text-xs font-bold">Rác</span>
          </div>

          <p className="mt-2 text-2xl font-bold text-slate-700">
            {summary.junk || 0}
          </p>
        </div>
      </div>

      {/* =====================================================
          FILTER
      ===================================================== */}

      <div className="border-b border-slate-200 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => {
              const active = filter === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                    active
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"
                  }`}
                >
                  {item.label}

                  <span
                    className={`ml-2 ${
                      active ? "text-blue-100" : "text-slate-400"
                    }`}
                  >
                    {getCount(item.value)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* SEARCH */}

          <div className="relative w-full xl:w-[320px]">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm tên, SĐT, email..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>
      </div>

      {/* =====================================================
          TABLE
      ===================================================== */}

      <div className="overflow-x-auto">
        <table className="min-w-[1000px] w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold text-slate-500">
                Dòng
              </th>

              <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold text-slate-500">
                Họ và tên
              </th>

              <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold text-slate-500">
                Số điện thoại
              </th>

              <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold text-slate-500">
                Email
              </th>

              <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold text-slate-500">
                Đơn vị
              </th>

              <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold text-slate-500">
                Trạng thái
              </th>

              <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-bold text-slate-500">
                Ghi chú
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-sm text-slate-400"
                >
                  Không có dữ liệu trong nhóm này.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const config = STATUS_CONFIG[row.status] || STATUS_CONFIG.READY;

                const notes = [...(row.errors || []), ...(row.warnings || [])];

                return (
                  <tr
                    key={`${row.rowNumber}-${row.duplicateKey || ""}`}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-400">
                      {row.rowNumber}
                    </td>

                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">
                        {row.data?.fullname || "—"}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {row.data?.phone || "—"}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {row.data?.email || "—"}
                    </td>

                    <td className="max-w-[220px] px-4 py-3 text-slate-700">
                      <div className="line-clamp-2">
                        {row.data?.organization || "—"}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold ${config.className}`}
                      >
                        {config.label}
                      </span>
                    </td>

                    <td className="max-w-[320px] px-4 py-3">
                      {notes.length > 0 ? (
                        <div className="space-y-1">
                          {notes.map((note, index) => (
                            <p
                              key={`${note}-${index}`}
                              className="text-xs leading-5 text-slate-600"
                            >
                              • {note}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Không có vấn đề
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <div className="border-t border-slate-200 bg-slate-50 p-5">
        <p className="text-sm leading-6 text-slate-600">
          <strong>Chế độ import nhanh:</strong> các dòng Sẵn sàng và Cảnh báo có
          thể tiếp tục. Dòng Lỗi, Trùng file và Rác sẽ chưa được đưa vào
          Database.
        </p>
      </div>
    </section>
  );
}

export default GoogleFormReviewStep;
