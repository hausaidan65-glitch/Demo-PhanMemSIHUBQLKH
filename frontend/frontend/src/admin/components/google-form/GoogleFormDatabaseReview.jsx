import { useMemo, useState } from "react";

import {
  AlertTriangle,
  CheckCircle2,
  Search,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";

// =====================================================
// DATABASE STATUS
// =====================================================

const STATUS_CONFIG = {
  NEW: {
    label: "Người mới",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },

  EXISTING: {
    label: "Hồ sơ đã có",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },

  ALREADY_REGISTERED: {
    label: "Đã đăng ký",
    className: "border-slate-200 bg-slate-100 text-slate-600",
  },

  CONFLICT: {
    label: "Xung đột",
    className: "border-red-200 bg-red-50 text-red-700",
  },
};

const FILTERS = [
  {
    value: "CONFLICT",
    label: "Cần xử lý",
  },

  {
    value: "ALL",
    label: "Tất cả",
  },

  {
    value: "NEW",
    label: "Người mới",
  },

  {
    value: "EXISTING",
    label: "Hồ sơ đã có",
  },

  {
    value: "ALREADY_REGISTERED",
    label: "Đã đăng ký",
  },
];

// =====================================================
// BASIC
// =====================================================

function text(value) {
  return String(value ?? "").trim();
}

// =====================================================
// EXISTING USER
//
// Validator có thể trả:
//
// existingUser
//
// hoặc conflict:
//
// existing: {
//   user
// }
//
// hoặc:
//
// existing: {
//   emailUser,
//   phoneUser
// }
// =====================================================

function getExistingUsers(row) {
  const result = [];

  if (row?.existingUser) {
    result.push({
      type: "existing",
      user: row.existingUser,
    });
  }

  if (row?.existing?.user) {
    result.push({
      type: "existing",
      user: row.existing.user,
    });
  }

  if (row?.existing?.emailUser) {
    result.push({
      type: "email",
      user: row.existing.emailUser,
    });
  }

  if (row?.existing?.phoneUser) {
    result.push({
      type: "phone",
      user: row.existing.phoneUser,
    });
  }

  /*
   * Tránh render trùng cùng user.
   */
  const seen = new Set();

  return result.filter((item) => {
    const id = item?.user?.id;

    if (!id) {
      return true;
    }

    if (seen.has(id)) {
      return false;
    }

    seen.add(id);

    return true;
  });
}

// =====================================================
// COMPONENT
// =====================================================

function GoogleFormDatabaseReview({ validation }) {
  const [filter, setFilter] = useState("CONFLICT");

  const [keyword, setKeyword] = useState("");

  const rows = validation?.rows || [];

  const summary = validation?.summary || {};

  // =====================================================
  // COUNTS
  // =====================================================

  const getCount = (type) => {
    switch (type) {
      case "ALL":
        return summary.total || 0;

      case "NEW":
        return summary.new || 0;

      case "EXISTING":
        return summary.existing || 0;

      case "ALREADY_REGISTERED":
        return summary.alreadyRegistered || 0;

      case "CONFLICT":
        return summary.conflict || 0;

      default:
        return 0;
    }
  };

  // =====================================================
  // FILTER ROWS
  // =====================================================

  const filteredRows = useMemo(() => {
    const q = text(keyword).toLowerCase();

    return rows.filter((row) => {
      if (filter !== "ALL" && row.dbStatus !== filter) {
        return false;
      }

      if (!q) {
        return true;
      }

      const existingUsers = getExistingUsers(row);

      const haystack = [
        row?.data?.fullname,
        row?.data?.phone,
        row?.data?.email,
        row?.data?.organization,
        row?.dbMessage,

        ...existingUsers.flatMap((item) => [
          item?.user?.fullname,
          item?.user?.phone,
          item?.user?.email,
          item?.user?.company,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [rows, filter, keyword]);

  if (!validation) {
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
              Đối chiếu Database
            </p>

            <h3 className="mt-1 text-lg font-bold text-slate-900">
              Kiểm tra hồ sơ SIHUB
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Người mới và hồ sơ đã có có thể tiếp tục import. Chỉ các dòng xung
              đột cần Admin kiểm tra.
            </p>
          </div>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700">
            {summary.readyToCommit || 0} người sẵn sàng import
          </div>
        </div>
      </div>

      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <div className="grid gap-3 border-b border-slate-200 bg-slate-50/50 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* NEW */}

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-blue-700">
            <UserPlus size={17} />

            <span className="text-xs font-bold">Người mới</span>
          </div>

          <p className="mt-2 text-2xl font-bold text-blue-800">
            {summary.new || 0}
          </p>
        </div>

        {/* EXISTING */}

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <UserCheck size={17} />

            <span className="text-xs font-bold">Hồ sơ đã có</span>
          </div>

          <p className="mt-2 text-2xl font-bold text-emerald-800">
            {summary.existing || 0}
          </p>
        </div>

        {/* ALREADY */}

        <div className="rounded-xl border border-slate-200 bg-slate-100 p-4">
          <div className="flex items-center gap-2 text-slate-600">
            <Users size={17} />

            <span className="text-xs font-bold">Đã đăng ký</span>
          </div>

          <p className="mt-2 text-2xl font-bold text-slate-700">
            {summary.alreadyRegistered || 0}
          </p>
        </div>

        {/* CONFLICT */}

        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-700">
            <XCircle size={17} />

            <span className="text-xs font-bold">Xung đột</span>
          </div>

          <p className="mt-2 text-2xl font-bold text-red-800">
            {summary.conflict || 0}
          </p>
        </div>
      </div>

      {/* =====================================================
          FILTER / SEARCH
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
          ROW LIST
      ===================================================== */}

      <div className="divide-y divide-slate-100">
        {filteredRows.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CheckCircle2 size={28} className="mx-auto text-emerald-500" />

            <p className="mt-3 font-bold text-slate-700">
              Không có dữ liệu trong nhóm này
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Không cần Admin xử lý thêm.
            </p>
          </div>
        ) : (
          filteredRows.map((row) => {
            const config = STATUS_CONFIG[row.dbStatus] || STATUS_CONFIG.NEW;

            const existingUsers = getExistingUsers(row);

            return (
              <div
                key={`${row.rowNumber}-${row.dbStatus}-${row.data?.email || ""}-${row.data?.phone || ""}`}
                className="p-5 hover:bg-slate-50/60"
              >
                {/* TOP */}

                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">
                      Dòng {row.rowNumber}
                    </p>

                    <h4 className="mt-1 text-base font-bold text-slate-900">
                      {row.data?.fullname || "Chưa có họ tên"}
                    </h4>
                  </div>

                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${config.className}`}
                  >
                    {config.label}
                  </span>
                </div>

                {/* GOOGLE FORM DATA */}

                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Dữ liệu Google Form
                  </p>

                  <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <p className="text-xs text-slate-400">Họ và tên</p>

                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {row.data?.fullname || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">Số điện thoại</p>

                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {row.data?.phone || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">Email</p>

                      <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                        {row.data?.email || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">Đơn vị</p>

                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {row.data?.organization || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* DB MESSAGE */}

                {row.dbMessage && (
                  <div
                    className={`mt-3 rounded-xl border p-4 text-sm ${
                      row.dbStatus === "CONFLICT"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : row.dbStatus === "ALREADY_REGISTERED"
                          ? "border-slate-200 bg-slate-100 text-slate-600"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    <div className="flex gap-2">
                      {row.dbStatus === "CONFLICT" ? (
                        <AlertTriangle size={17} className="mt-0.5 shrink-0" />
                      ) : (
                        <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
                      )}

                      <p className="font-medium">{row.dbMessage}</p>
                    </div>
                  </div>
                )}

                {/* EXISTING SIHUB USERS */}

                {existingUsers.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Hồ sơ SIHUB liên quan
                    </p>

                    <div className="mt-2 grid gap-3 xl:grid-cols-2">
                      {existingUsers.map((item, index) => (
                        <div
                          key={`${item.type}-${item.user?.id}-${index}`}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-bold text-slate-800">
                              {item.user?.fullname || `User #${item.user?.id}`}
                            </p>

                            {item.type === "email" && (
                              <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700">
                                Trùng email
                              </span>
                            )}

                            {item.type === "phone" && (
                              <span className="rounded-full bg-purple-100 px-2 py-1 text-[10px] font-bold text-purple-700">
                                Trùng SĐT
                              </span>
                            )}
                          </div>

                          <div className="mt-3 space-y-1 text-sm text-slate-600">
                            <p>
                              SĐT: <strong>{item.user?.phone || "—"}</strong>
                            </p>

                            <p>
                              Email: <strong>{item.user?.email || "—"}</strong>
                            </p>

                            <p>
                              Đơn vị:{" "}
                              <strong>{item.user?.company || "—"}</strong>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CONFLICT CODE - chỉ dev/admin cần */}

                {row.dbStatus === "CONFLICT" && row.conflictCode && (
                  <p className="mt-3 text-xs font-medium text-slate-400">
                    Mã xung đột: {row.conflictCode}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <div className="border-t border-slate-200 bg-slate-50 p-5">
        {summary.conflict > 0 ? (
          <p className="text-sm leading-6 text-slate-600">
            Có <strong className="text-red-600">{summary.conflict}</strong> dòng
            xung đột. Các dòng này sẽ không được import tự động.{" "}
            <strong>{summary.readyToCommit}</strong> người còn lại có thể tiếp
            tục.
          </p>
        ) : (
          <p className="text-sm font-medium text-emerald-700">
            Không có xung đột Database. Toàn bộ {summary.readyToCommit || 0}{" "}
            người hợp lệ có thể tiếp tục import.
          </p>
        )}
      </div>
    </section>
  );
}

export default GoogleFormDatabaseReview;
