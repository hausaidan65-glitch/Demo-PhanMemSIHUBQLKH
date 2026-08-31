import { useEffect, useMemo, useState } from "react";
import axios from "axios";

import { CheckCircle2, Loader2, PlusCircle } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const TARGET_TYPES = {
  TRAINING: "TRAINING",
  SEMINAR: "SEMINAR",
  NETWORKING: "NETWORKING",
};

function GoogleFormTargetSelector({ selectedSheet, onTargetChange }) {
  const token = localStorage.getItem("admin_token");

  const authConfig = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    [token],
  );

  // =====================================================
  // TARGET TYPE
  // =====================================================

  const [targetType, setTargetType] = useState("");

  // =====================================================
  // TRAINING
  // =====================================================

  const [trainingCourses, setTrainingCourses] = useState([]);

  const [courses, setCourses] = useState([]);

  const [openings, setOpenings] = useState([]);

  const [trainingCourseId, setTrainingCourseId] = useState("");

  const [courseId, setCourseId] = useState("");

  const [openingId, setOpeningId] = useState("");

  // =====================================================
  // LOADING
  // =====================================================

  const [loadingTrainingCourses, setLoadingTrainingCourses] = useState(false);

  const [loadingCourses, setLoadingCourses] = useState(false);

  const [loadingOpenings, setLoadingOpenings] = useState(false);

  // =====================================================
  // CREATE MODES
  // =====================================================

  const [showCreateTrainingCourse, setShowCreateTrainingCourse] =
    useState(false);

  const [showCreateCourse, setShowCreateCourse] = useState(false);

  const [showCreateOpening, setShowCreateOpening] = useState(false);

  // =====================================================
  // CREATE FORMS
  // =====================================================

  const [newTrainingCourse, setNewTrainingCourse] = useState({
    name: "",
    description: "",
  });

  const [newCourse, setNewCourse] = useState({
    name: "",
    description: "",
  });

  const [newOpening, setNewOpening] = useState({
    class_name: "",
    class_code: "",
    location: "",

    organization_start_date: "",
    organization_end_date: "",

    schedule_note: "",
    max_students: 50,

    sessions: [],
  });

  const [creating, setCreating] = useState("");

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  // =====================================================
  // RESET KHI ĐỔI SHEET
  // =====================================================

  useEffect(() => {
    setTargetType("");

    setTrainingCourseId("");
    setCourseId("");
    setOpeningId("");

    setCourses([]);
    setOpenings([]);

    setShowCreateTrainingCourse(false);
    setShowCreateCourse(false);
    setShowCreateOpening(false);

    setMessage({
      type: "",
      text: "",
    });
  }, [selectedSheet?.sheetName]);

  // =====================================================
  // BÁO TARGET RA PARENT
  // =====================================================

  useEffect(() => {
    if (!onTargetChange) {
      return;
    }

    if (targetType !== TARGET_TYPES.TRAINING) {
      onTargetChange({
        type: targetType || null,
      });

      return;
    }

    // =====================================================
    // LẤY THÔNG TIN ĐỢT ĐANG CHỌN
    // =====================================================

    const selectedOpening =
      openings.find((item) => Number(item.id) === Number(openingId)) || null;

    onTargetChange({
      type: TARGET_TYPES.TRAINING,

      trainingCourseId: trainingCourseId ? Number(trainingCourseId) : null,

      courseId: courseId ? Number(courseId) : null,

      openingId: openingId ? Number(openingId) : null,

      // ===================================================
      // DÙNG CHO CAPACITY PREVIEW Ở PARENT
      // ===================================================

      openingInfo: selectedOpening
        ? {
            id: Number(selectedOpening.id),

            class_name: selectedOpening.class_name || null,

            current_students: Number(selectedOpening.current_students) || 0,

            max_students: Number(selectedOpening.max_students) || 0,

            status: selectedOpening.status || null,
            organization_start_date:
              selectedOpening.organization_start_date || null,

            organization_end_date:
              selectedOpening.organization_end_date || null,

            effective_start_date: selectedOpening.effective_start_date || null,

            effective_end_date: selectedOpening.effective_end_date || null,
          }
        : null,

      isComplete: Boolean(trainingCourseId && courseId && openingId),
    });
  }, [
    targetType,
    trainingCourseId,
    courseId,
    openingId,
    openings,
    onTargetChange,
  ]);

  // =====================================================
  // LOAD KHÓA ĐÀO TẠO
  // =====================================================

  const loadTrainingCourses = async () => {
    try {
      setLoadingTrainingCourses(true);

      const response = await axios.get(`${API_URL}/training-courses`);

      setTrainingCourses(response.data?.data || []);
    } catch (error) {
      console.error(
        "Load training courses error:",
        error.response?.data || error,
      );

      setTrainingCourses([]);

      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Không thể tải danh sách Khóa đào tạo.",
      });
    } finally {
      setLoadingTrainingCourses(false);
    }
  };

  // =====================================================
  // LOAD LỚP HỌC THEO KHÓA ĐÀO TẠO
  // =====================================================

  const loadCourses = async (selectedTrainingCourseId) => {
    if (!selectedTrainingCourseId) {
      setCourses([]);
      return;
    }

    try {
      setLoadingCourses(true);

      const response = await axios.get(
        `${API_URL}/courses/program/${selectedTrainingCourseId}`,
      );

      setCourses(response.data?.data || []);
    } catch (error) {
      console.error("Load courses error:", error.response?.data || error);

      setCourses([]);

      setMessage({
        type: "error",
        text:
          error.response?.data?.message || "Không thể tải danh sách Lớp học.",
      });
    } finally {
      setLoadingCourses(false);
    }
  };

  // =====================================================
  // LOAD ĐỢT TỔ CHỨC
  // =====================================================

  const loadOpenings = async (selectedCourseId) => {
    if (!selectedCourseId) {
      setOpenings([]);
      return;
    }

    try {
      setLoadingOpenings(true);

      const response = await axios.get(
        `${API_URL}/course-classes/course/${selectedCourseId}`,
      );

      setOpenings(response.data?.data || []);
    } catch (error) {
      console.error("Load openings error:", error.response?.data || error);

      setOpenings([]);

      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "Không thể tải danh sách Đợt tổ chức.",
      });
    } finally {
      setLoadingOpenings(false);
    }
  };

  // =====================================================
  // CHỌN TYPE
  // =====================================================

  const handleTargetTypeChange = async (type) => {
    setTargetType(type);

    setTrainingCourseId("");
    setCourseId("");
    setOpeningId("");

    setCourses([]);
    setOpenings([]);

    setShowCreateTrainingCourse(false);
    setShowCreateCourse(false);
    setShowCreateOpening(false);

    setMessage({
      type: "",
      text: "",
    });

    if (type === TARGET_TYPES.TRAINING) {
      await loadTrainingCourses();
    }
  };

  // =====================================================
  // CHỌN KHÓA ĐÀO TẠO
  // =====================================================

  const handleTrainingCourseChange = async (value) => {
    setTrainingCourseId(value);

    setCourseId("");
    setOpeningId("");

    setOpenings([]);

    await loadCourses(value);
  };

  // =====================================================
  // CHỌN LỚP HỌC
  // =====================================================

  const handleCourseChange = async (value) => {
    setCourseId(value);

    setOpeningId("");

    await loadOpenings(value);
  };

  // =====================================================
  // TẠO KHÓA ĐÀO TẠO
  // =====================================================

  const handleCreateTrainingCourse = async () => {
    const name = newTrainingCourse.name.trim();

    if (!name) {
      setMessage({
        type: "warning",
        text: "Vui lòng nhập tên Khóa đào tạo.",
      });

      return;
    }

    try {
      setCreating("TRAINING_COURSE");

      setMessage({
        type: "",
        text: "",
      });

      const response = await axios.post(
        `${API_URL}/training-courses`,
        {
          training_course_name: name,

          description: newTrainingCourse.description.trim() || null,

          status: "ACTIVE",
        },
        authConfig,
      );

      const created = response.data?.data;

      if (!created?.id) {
        throw new Error("Backend không trả về ID Khóa đào tạo.");
      }

      // Load lại danh sách Khóa đào tạo
      await loadTrainingCourses();

      // Tự chọn khóa vừa tạo
      setTrainingCourseId(String(created.id));

      // Reset tầng dưới
      setCourseId("");
      setOpeningId("");

      setCourses([]);
      setOpenings([]);

      // Load lớp học thuộc khóa vừa tạo
      await loadCourses(created.id);

      setShowCreateTrainingCourse(false);

      setNewTrainingCourse({
        name: "",
        description: "",
      });

      setMessage({
        type: "success",
        text: `Đã tạo Khóa đào tạo "${name}".`,
      });
    } catch (error) {
      console.error(
        "Create training course error:",
        error.response?.data || error,
      );

      setMessage({
        type: "error",

        text:
          error.response?.data?.message ||
          error.message ||
          "Không thể tạo Khóa đào tạo.",
      });
    } finally {
      setCreating("");
    }
  };

  // =====================================================
  // TẠO LỚP HỌC
  //
  // DB/API cũ gọi field cha là program_id.
  // Nhưng về nghiệp vụ đây chính là trainingCourseId.
  // =====================================================

  const handleCreateCourse = async () => {
    const name = newCourse.name.trim();

    if (!trainingCourseId) {
      setMessage({
        type: "warning",
        text: "Vui lòng chọn Khóa đào tạo trước.",
      });

      return;
    }

    if (!name) {
      setMessage({
        type: "warning",
        text: "Vui lòng nhập tên Lớp học.",
      });

      return;
    }

    try {
      setCreating("COURSE");

      const response = await axios.post(
        `${API_URL}/courses`,
        {
          // field legacy của API hiện tại
          program_id: Number(trainingCourseId),

          course_name: name,

          description: newCourse.description.trim() || null,

          status: "OPEN",
        },
        authConfig,
      );

      const created = response.data?.data;

      if (!created?.id) {
        throw new Error("Backend không trả về ID Lớp học.");
      }

      await loadCourses(trainingCourseId);

      setCourseId(String(created.id));

      setOpeningId("");
      setOpenings([]);

      await loadOpenings(created.id);

      setShowCreateCourse(false);

      setNewCourse({
        name: "",
        description: "",
      });

      setMessage({
        type: "success",
        text: "Đã tạo Lớp học mới.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          error.message ||
          "Không thể tạo Lớp học.",
      });
    } finally {
      setCreating("");
    }
  };

  // =====================================================
  // TẠO ĐỢT TỔ CHỨC
  // =====================================================

  const handleCreateOpening = async () => {
    if (!courseId) {
      setMessage({
        type: "warning",
        text: "Vui lòng chọn Lớp học trước.",
      });

      return;
    }

    const className = newOpening.class_name.trim();

    if (!className) {
      setMessage({
        type: "warning",
        text: "Vui lòng nhập tên Đợt tổ chức.",
      });

      return;
    }
    const organizationStartDate = newOpening.organization_start_date;

    const organizationEndDate = newOpening.organization_end_date;

    if (!organizationStartDate) {
      setMessage({
        type: "warning",
        text: "Vui lòng chọn ngày bắt đầu tổ chức.",
      });

      return;
    }

    if (!organizationEndDate) {
      setMessage({
        type: "warning",
        text: "Vui lòng chọn ngày kết thúc tổ chức.",
      });

      return;
    }

    if (organizationEndDate < organizationStartDate) {
      setMessage({
        type: "warning",
        text: "Ngày kết thúc tổ chức không được trước ngày bắt đầu.",
      });

      return;
    }
    try {
      setCreating("OPENING");

      setMessage({
        type: "",
        text: "",
      });

      // =====================================================
      // QUAN TRỌNG
      //
      // Dùng đúng API tạo ĐỢT TỔ CHỨC hiện có:
      //
      // POST /api/classes/:courseId/openings
      //
      // Không dùng POST /api/course-classes
      // vì endpoint đó đi vào flow createFullClass khác.
      // =====================================================

      const response = await axios.post(
        `${API_URL}/classes/${courseId}/openings`,
        {
          class_name: className,

          class_code: newOpening.class_code.trim() || null,

          location: newOpening.location.trim() || null,

          organization_start_date: newOpening.organization_start_date,

          organization_end_date: newOpening.organization_end_date,

          schedule_note: newOpening.schedule_note.trim() || null,

          max_students: Number(newOpening.max_students) || 50,

          status: "OPEN",

          sessions: [],
        },
        authConfig,
      );

      const created = response.data?.data;

      const createdId =
        created?.opening_id ?? created?.id ?? created?.openingId ?? null;

      if (!createdId) {
        throw new Error("Đã tạo Đợt tổ chức nhưng Backend không trả về ID.");
      }

      // =====================================================
      // LOAD LẠI DROPDOWN
      // =====================================================

      await loadOpenings(courseId);

      // Tự chọn Đợt vừa tạo
      setOpeningId(String(createdId));

      setShowCreateOpening(false);

      setNewOpening({
        class_name: "",
        class_code: "",
        location: "",
        schedule_note: "",
        organization_start_date: "",
        organization_end_date: "",
        max_students: 50,
        sessions: [],
      });

      setMessage({
        type: "success",
        text: `Đã tạo Đợt tổ chức "${className}".`,
      });
    } catch (error) {
      console.error("Create opening error:", error.response?.data || error);

      setMessage({
        type: "error",

        text:
          error.response?.data?.message ||
          error.message ||
          "Không thể tạo Đợt tổ chức.",
      });
    } finally {
      setCreating("");
    }
  };

  // =====================================================
  // UI
  // =====================================================

  if (!selectedSheet) {
    return null;
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          Bước tiếp theo
        </p>

        <h3 className="mt-1 text-lg font-bold text-slate-900">
          Dữ liệu này thuộc đâu?
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Chọn đúng nghiệp vụ trước khi hệ thống map dữ liệu.
        </p>
      </div>

      {/* MESSAGE */}

      {message.text && (
        <div
          className={`mt-4 rounded-xl border p-3 text-sm font-medium ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : message.type === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* TYPE */}

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {[
          {
            value: TARGET_TYPES.TRAINING,
            label: "Khóa đào tạo",
          },
          {
            value: TARGET_TYPES.SEMINAR,
            label: "Hội thảo",
          },
          {
            value: TARGET_TYPES.NETWORKING,
            label: "Sự kiện kết nối",
          },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleTargetTypeChange(option.value)}
            className={`rounded-2xl border p-4 text-left font-bold transition ${
              targetType === option.value
                ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* =====================================================
          TRAINING
      ===================================================== */}

      {targetType === TARGET_TYPES.TRAINING && (
        <div className="mt-6 space-y-5">
          {/* KHÓA ĐÀO TẠO */}

          <div className="rounded-2xl border border-slate-200 p-4">
            <label className="text-sm font-bold text-slate-800">
              1. Khóa đào tạo
            </label>

            <p className="mt-1 text-xs text-slate-500">
              Ví dụ: Chương trình huấn luyện nâng cao năng lực về khởi nghiệp
              ĐMST cho Startup, doanh nghiệp nhỏ và vừa (SME).
            </p>

            <div className="mt-3">
              {loadingTrainingCourses ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 size={17} className="animate-spin" />
                  Đang tải...
                </div>
              ) : (
                <select
                  value={trainingCourseId}
                  onChange={(event) =>
                    handleTrainingCourseChange(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="">-- Chọn Khóa đào tạo --</option>

                  {trainingCourses.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.training_course_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowCreateTrainingCourse((value) => !value)}
              className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-blue-600"
            >
              <PlusCircle size={17} />
              Tạo Khóa đào tạo mới
            </button>

            {showCreateTrainingCourse && (
              <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4">
                <input
                  value={newTrainingCourse.name}
                  onChange={(event) =>
                    setNewTrainingCourse((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Tên Khóa đào tạo *"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                />

                <textarea
                  value={newTrainingCourse.description}
                  onChange={(event) =>
                    setNewTrainingCourse((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={2}
                  placeholder="Mô tả"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                />

                <button
                  type="button"
                  onClick={handleCreateTrainingCourse}
                  disabled={creating === "TRAINING_COURSE"}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {creating === "TRAINING_COURSE"
                    ? "Đang tạo..."
                    : "Tạo Khóa đào tạo"}
                </button>
              </div>
            )}
          </div>

          {/* LỚP HỌC */}

          <div className="rounded-2xl border border-slate-200 p-4">
            <label className="text-sm font-bold text-slate-800">
              2. Lớp học
            </label>

            <p className="mt-1 text-xs text-slate-500">
              Ví dụ: Khai báo thuế và tổ chức thực hiện chế độ kế toán cho doanh
              nghiệp.
            </p>

            <select
              value={courseId}
              disabled={!trainingCourseId || loadingCourses}
              onChange={(event) => handleCourseChange(event.target.value)}
              className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
            >
              <option value="">-- Chọn Lớp học --</option>

              {courses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.course_name}
                </option>
              ))}
            </select>

            {trainingCourseId && !loadingCourses && courses.length === 0 && (
              <p className="mt-2 text-sm font-medium text-amber-700">
                Khóa đào tạo này chưa có Lớp học.
              </p>
            )}

            <button
              type="button"
              disabled={!trainingCourseId}
              onClick={() => setShowCreateCourse((value) => !value)}
              className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-blue-600 disabled:text-slate-400"
            >
              <PlusCircle size={17} />
              Tạo Lớp học mới
            </button>

            {showCreateCourse && trainingCourseId && (
              <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4">
                <input
                  value={newCourse.name}
                  onChange={(event) =>
                    setNewCourse((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Tên Lớp học *"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                />

                <textarea
                  value={newCourse.description}
                  onChange={(event) =>
                    setNewCourse((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={2}
                  placeholder="Mô tả"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                />

                <button
                  type="button"
                  onClick={handleCreateCourse}
                  disabled={creating === "COURSE"}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {creating === "COURSE" ? "Đang tạo..." : "Tạo Lớp học"}
                </button>
              </div>
            )}
          </div>

          {/* ĐỢT TỔ CHỨC */}

          <div className="rounded-2xl border border-slate-200 p-4">
            <label className="text-sm font-bold text-slate-800">
              3. Đợt tổ chức
            </label>

            <p className="mt-1 text-xs text-slate-500">
              Ví dụ: Lớp 1 hoặc Lớp 2.
            </p>

            <select
              value={openingId}
              disabled={!courseId || loadingOpenings}
              onChange={(event) => setOpeningId(event.target.value)}
              className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:bg-slate-100"
            >
              <option value="">-- Chọn Đợt tổ chức --</option>

              {openings.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.class_name || item.class_code || `Đợt #${item.id}`}
                </option>
              ))}
            </select>

            {courseId && !loadingOpenings && openings.length === 0 && (
              <p className="mt-2 text-sm font-medium text-amber-700">
                Lớp học này chưa có Đợt tổ chức.
              </p>
            )}

            <button
              type="button"
              disabled={!courseId}
              onClick={() => setShowCreateOpening((value) => !value)}
              className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-blue-600 disabled:text-slate-400"
            >
              <PlusCircle size={17} />
              Tạo Đợt tổ chức mới
            </button>

            {showCreateOpening && courseId && (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input
                  value={newOpening.class_name}
                  onChange={(event) =>
                    setNewOpening((current) => ({
                      ...current,
                      class_name: event.target.value,
                    }))
                  }
                  placeholder="Tên đợt, ví dụ Lớp 1 *"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />

                <input
                  value={newOpening.class_code}
                  onChange={(event) =>
                    setNewOpening((current) => ({
                      ...current,
                      class_code: event.target.value,
                    }))
                  }
                  placeholder="Mã lớp"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />

                <input
                  value={newOpening.location}
                  onChange={(event) =>
                    setNewOpening((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                  placeholder="Địa điểm"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">
                    Ngày bắt đầu tổ chức *
                  </label>

                  <input
                    type="date"
                    value={newOpening.organization_start_date}
                    onChange={(event) =>
                      setNewOpening((current) => ({
                        ...current,

                        organization_start_date: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">
                    Ngày kết thúc tổ chức *
                  </label>

                  <input
                    type="date"
                    min={newOpening.organization_start_date || undefined}
                    value={newOpening.organization_end_date}
                    onChange={(event) =>
                      setNewOpening((current) => ({
                        ...current,

                        organization_end_date: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                  />
                </div>
                <input
                  value={newOpening.schedule_note}
                  onChange={(event) =>
                    setNewOpening((current) => ({
                      ...current,
                      schedule_note: event.target.value,
                    }))
                  }
                  placeholder="Lịch học / ghi chú"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />

                <input
                  type="number"
                  min="1"
                  value={newOpening.max_students}
                  onChange={(event) =>
                    setNewOpening((current) => ({
                      ...current,
                      max_students: event.target.value,
                    }))
                  }
                  placeholder="Số lượng tối đa"
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                />

                <button
                  type="button"
                  onClick={handleCreateOpening}
                  disabled={creating === "OPENING"}
                  className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  {creating === "OPENING" ? "Đang tạo..." : "Tạo Đợt tổ chức"}
                </button>
              </div>
            )}
          </div>

          {/* COMPLETE */}

          {trainingCourseId && courseId && openingId && (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
              <CheckCircle2 size={20} className="mt-0.5 shrink-0" />

              <div>
                <p className="font-bold">Đã xác định nơi nhận dữ liệu</p>

                <p className="mt-1 text-sm">
                  Sheet này đã sẵn sàng chuyển sang bước mapping cột.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* EVENT PHASE SAU */}

      {targetType === TARGET_TYPES.SEMINAR && (
        <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
          Phần chọn Hội thảo sẽ nối ở bước kế tiếp.
        </div>
      )}

      {targetType === TARGET_TYPES.NETWORKING && (
        <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-700">
          Phần chọn Sự kiện kết nối sẽ nối ở bước kế tiếp.
        </div>
      )}
    </section>
  );
}

export default GoogleFormTargetSelector;
