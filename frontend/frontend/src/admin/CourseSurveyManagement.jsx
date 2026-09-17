import { useCallback, useEffect, useState } from "react";

import {
  ClipboardList,
  Eye,
  FileSpreadsheet,
  Loader2,
  RefreshCcw,
  Trash2,
  X,
} from "lucide-react";

import courseSurveyApi from "../services/courseSurveyApi";

// =====================================================
// NHÃN TIẾNG VIỆT
// =====================================================
const SATISFACTION_LABELS = {
  VERY_DISSATISFIED: "Rất không hài lòng",
  DISSATISFIED: "Không hài lòng",
  NEUTRAL: "Bình thường",
  SATISFIED: "Hài lòng",
  VERY_SATISFIED: "Rất hài lòng",
};

const AGREEMENT_LABELS = {
  STRONGLY_DISAGREE: "Rất không đồng ý",
  DISAGREE: "Không đồng ý",
  NEUTRAL: "Bình thường",
  AGREE: "Đồng ý",
  STRONGLY_AGREE: "Rất đồng ý",
};

const DURATION_LABELS = {
  TOO_LONG: "Quá dài",
  LONG: "Dài",
  JUST_RIGHT: "Vừa đủ",
  SHORT: "Ngắn",
  TOO_SHORT: "Quá ngắn",
};

const SURVEY_QUESTIONS = [
  {
    key: "q1_content_meets_objective",
    label: "Câu 1: Nội dung khóa học đáp ứng được mục tiêu đề ra",
    labels: SATISFACTION_LABELS,
  },
  {
    key: "q2_materials_clear_useful",
    label: "Câu 2: Tài liệu học tập (slide, giáo trình) rõ ràng, hữu ích",
    labels: SATISFACTION_LABELS,
  },
  {
    key: "q3_knowledge_practical",
    label: "Câu 3: Kiến thức có tính thực tiễn cao, đã áp dụng vào công việc",
    labels: AGREEMENT_LABELS,
  },
  {
    key: "q4_trainer_expertise",
    label: "Câu 4: Giảng viên có kiến thức chuyên môn sâu rộng",
    labels: AGREEMENT_LABELS,
  },
  {
    key: "q5_trainer_delivery",
    label: "Câu 5: Phong cách truyền đạt của giảng viên rõ ràng, lôi cuốn",
    labels: AGREEMENT_LABELS,
  },
  {
    key: "q6_trainer_support",
    label: "Câu 6: Giảng viên giải đáp thắc mắc của học viên tốt",
    labels: SATISFACTION_LABELS,
  },
  {
    key: "q7_duration",
    label: "Câu 7: Thời lượng khóa học (quá dài/quá ngắn/vừa đủ)",
    labels: DURATION_LABELS,
  },
  {
    key: "q8_most_satisfied",
    label: "Câu 8: Điểm bạn cảm thấy hài lòng nhất về khóa học là gì?",
  },
  {
    key: "q9_improvement",
    label: "Câu 9: Điểm nào khóa học cần cải thiện để tốt hơn?",
  },
  {
    key: "q10_next_course_suggestion",
    label: "Câu 10: Đề xuất của bạn về các khóa học tiếp theo (nếu có)",
  },
];

function toLabel(labels, value) {
  return labels[value] || value || "—";
}

function formatDateTime(value) {
  if (!value) {
    return "—";
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
    hour12: false,
  }).format(date);
}

function getClassOptionLabel(item) {
  const name = item.class_name || `Đợt #${item.id}`;

  return item.class_code ? `${name} (${item.class_code})` : name;
}

export default function CourseSurveyManagement() {
  const [surveys, setSurveys] = useState([]);
  const [classes, setClasses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(null);

  const [classId, setClassId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [exporting, setExporting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSurvey, setDetailSurvey] = useState(null);

  const [reloadKey, setReloadKey] = useState(0);

  const buildFilters = useCallback(
    () => ({
      class_id: classId || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [classId, from, to],
  );

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const response = await courseSurveyApi.list({
          ...buildFilters(),
          page,
          limit,
        });

        if (!active) {
          return;
        }

        setSurveys(
          Array.isArray(response.data?.data) ? response.data.data : [],
        );
        setTotal(Number(response.data?.total) || 0);
        setTotalPages(Number(response.data?.total_pages) || 1);
        setError("");
      } catch (err) {
        if (!active) {
          return;
        }

        console.error("Lỗi tải danh sách khảo sát:", err.response?.data || err);

        setError(
          err.response?.data?.message || "Không thể tải danh sách khảo sát.",
        );
        setSurveys([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [buildFilters, page, limit, reloadKey]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const response = await courseSurveyApi.listClasses();

        if (active) {
          setClasses(
            Array.isArray(response.data?.data) ? response.data.data : [],
          );
        }
      } catch (err) {
        console.error("Lỗi tải danh sách lớp:", err.response?.data || err);

        if (active) {
          setClasses([]);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const reloadSurveys = () => {
    setLoading(true);
    setReloadKey((previous) => previous + 1);
  };

  const handleResetFilters = () => {
    setLoading(true);
    setClassId("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      setMessage(null);

      const response = await courseSurveyApi.exportExcel(buildFilters());

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;

      link.download = `khao-sat-sau-khoa-hoc-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Lỗi xuất Excel khảo sát:", err.response?.data || err);

      let errorMessage = "Không thể xuất Excel khảo sát.";

      try {
        if (err.response?.data instanceof Blob) {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);

          errorMessage = parsed?.message || errorMessage;
        } else {
          errorMessage = err.response?.data?.message || errorMessage;
        }
      } catch {
        // giữ message mặc định
      }

      setMessage({ type: "error", text: errorMessage });
    } finally {
      setExporting(false);
    }
  };

  const openDetail = async (survey) => {
    if (!survey?.id) {
      return;
    }

    try {
      setDetailOpen(true);
      setDetailLoading(true);
      setDetailSurvey(null);

      const response = await courseSurveyApi.getById(survey.id);

      setDetailSurvey(response.data?.data || null);
    } catch (err) {
      console.error("Lỗi tải chi tiết khảo sát:", err.response?.data || err);

      setMessage({
        type: "error",
        text: err.response?.data?.message || "Không thể tải chi tiết khảo sát.",
      });

      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (survey) => {
    const className = survey.class_name || `Đợt #${survey.class_id}`;

    const confirmed = window.confirm(
      `Xóa khảo sát của "${className}"?\n\nHành động này không thể hoàn tác.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(survey.id);
      setMessage(null);

      await courseSurveyApi.remove(survey.id);

      setMessage({ type: "success", text: "Xóa khảo sát thành công." });

      reloadSurveys();
    } catch (err) {
      console.error("Lỗi xóa khảo sát:", err.response?.data || err);

      setMessage({
        type: "error",
        text: err.response?.data?.message || "Không thể xóa khảo sát.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const hasFilters = Boolean(classId || from || to);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Khảo sát sau khóa học
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Xem, lọc và quản lý các phiếu đánh giá sau khóa học của học viên.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {exporting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Đang xuất...
            </>
          ) : (
            <>
              <FileSpreadsheet size={18} />
              Xuất Excel
            </>
          )}
        </button>
      </div>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* FILTERS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Lớp / Đợt tổ chức
            </label>

            <select
              value={classId}
              onChange={(event) => {
                setLoading(true);
                setClassId(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-green-500"
            >
              <option value="">Tất cả lớp</option>

              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {getClassOptionLabel(item)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Từ ngày
            </label>

            <input
              type="date"
              value={from}
              onChange={(event) => {
                setLoading(true);
                setFrom(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-green-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Đến ngày
            </label>

            <input
              type="date"
              value={to}
              onChange={(event) => {
                setLoading(true);
                setTo(event.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-green-500"
            />
          </div>
        </div>

        {hasFilters && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-red-600"
            >
              <RefreshCcw size={16} />
              Xóa bộ lọc
            </button>
          </div>
        )}
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="w-[26%] px-4 py-3">Lớp / Đợt tổ chức</th>
                <th className="w-[26%] px-4 py-3">Khóa học</th>
                <th className="w-[16%] px-4 py-3">Thời gian gửi</th>
                <th className="w-[20%] px-4 py-3">Đánh giá nhanh</th>
                <th className="w-[12%] px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <Loader2
                      size={30}
                      className="mx-auto animate-spin text-green-600"
                    />

                    <p className="mt-3 text-sm text-slate-500">
                      Đang tải danh sách khảo sát...
                    </p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-16 text-center text-red-600"
                  >
                    {error}
                  </td>
                </tr>
              ) : surveys.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-16 text-center text-slate-500"
                  >
                    Chưa có phiếu khảo sát phù hợp.
                  </td>
                </tr>
              ) : (
                surveys.map((survey) => (
                  <tr
                    key={survey.id}
                    className="border-b border-slate-100 text-sm transition hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-4">
                      <p className="break-words font-semibold text-slate-900">
                        {survey.class_name || `Đợt #${survey.class_id}`}
                      </p>

                      {survey.class_code && (
                        <p className="mt-1 text-xs text-slate-500">
                          Mã lớp: {survey.class_code}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <p className="line-clamp-2 break-words text-slate-700">
                        {survey.course_name || "—"}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {formatDateTime(survey.created_at)}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="inline-flex rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                          {toLabel(
                            SATISFACTION_LABELS,
                            survey.q1_content_meets_objective,
                          )}
                        </span>

                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {toLabel(DURATION_LABELS, survey.q7_duration)}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openDetail(survey)}
                          className="rounded-lg border border-blue-200 p-2 text-blue-600 hover:bg-blue-50"
                          title="Xem chi tiết"
                        >
                          <Eye size={17} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(survey)}
                          disabled={deletingId === survey.id}
                          className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Xóa khảo sát"
                        >
                          {deletingId === survey.id ? (
                            <Loader2 size={17} className="animate-spin" />
                          ) : (
                            <Trash2 size={17} />
                          )}
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
        <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Tổng cộng <b>{total}</b> phiếu khảo sát
          </p>

          <div className="flex items-center gap-3">
            <select
              value={limit}
              onChange={(event) => {
                setLoading(true);
                setLimit(Number(event.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-500"
            >
              <option value={10}>10 / trang</option>
              <option value={20}>20 / trang</option>
              <option value={50}>50 / trang</option>
            </select>

            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setPage((previous) => Math.max(previous - 1, 1));
              }}
              disabled={page <= 1}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Trước
            </button>

            <span className="text-sm font-medium text-slate-600">
              Trang {page} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setPage((previous) => Math.min(previous + 1, totalPages));
              }}
              disabled={page >= totalPages}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-6">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">
                  <ClipboardList size={20} />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Chi tiết phiếu khảo sát
                  </h2>

                  <p className="mt-0.5 text-sm text-slate-500">
                    {detailSurvey?.class?.class_name ||
                      detailSurvey?.class_name ||
                      `Đợt #${detailSurvey?.class_id || ""}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                aria-label="Đóng"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              {detailLoading ? (
                <div className="py-16 text-center">
                  <Loader2
                    size={30}
                    className="mx-auto animate-spin text-green-600"
                  />

                  <p className="mt-3 text-sm text-slate-500">
                    Đang tải chi tiết...
                  </p>
                </div>
              ) : detailSurvey ? (
                <>
                  <div className="grid gap-3 rounded-2xl bg-slate-50 p-5 text-sm sm:grid-cols-2">
                    <p className="text-slate-600">
                      <b>Lớp:</b>{" "}
                      {detailSurvey.class?.class_name ||
                        detailSurvey.class_name ||
                        "—"}
                    </p>

                    <p className="text-slate-600">
                      <b>Mã lớp:</b>{" "}
                      {detailSurvey.class?.class_code ||
                        detailSurvey.class_code ||
                        "—"}
                    </p>

                    <p className="break-words text-slate-600 sm:col-span-2">
                      <b>Khóa học:</b>{" "}
                      {detailSurvey.class?.course_name ||
                        detailSurvey.course_name ||
                        "—"}
                    </p>

                    <p className="text-slate-600">
                      <b>Thời gian gửi:</b>{" "}
                      {formatDateTime(detailSurvey.created_at)}
                    </p>
                  </div>

                  <div className="mt-5 space-y-4">
                    {SURVEY_QUESTIONS.map((question) => (
                      <div
                        key={question.key}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <p className="text-sm font-semibold leading-6 text-slate-700">
                          {question.label}
                        </p>

                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-900">
                          {question.labels
                            ? toLabel(
                                question.labels,
                                detailSurvey[question.key],
                              )
                            : detailSurvey[question.key] || "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="py-10 text-center text-sm text-slate-500">
                  Không có dữ liệu.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
