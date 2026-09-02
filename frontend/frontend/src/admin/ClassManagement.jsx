import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import CourseClassProgressModal from "./training/progress/CourseClassProgressModal";
import {
  ChevronDown,
  Eye,
  Loader2,
  ScanLine,
  MapPin,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  UserRound,
  FileSpreadsheet,
  X,
} from "lucide-react";

const API_URL = "http://localhost:5000/api";
const EMPTY_OPENING_FORM = {
  class_code: "",
  class_name: "",
  intake_name: "",
  trainer_name: "",
  location: "",

  register_open: "",
  register_close: "",

  // Thời gian tổ chức fallback.
  organization_start_date: "",
  organization_end_date: "",

  max_students: 50,

  current_students: 0,

  status: "OPEN",
  schedule_note: "",
};
const EMPTY_SESSION_FORM = {
  id: null,

  session_no: 1,

  session_date: "",

  start_time: "",

  end_time: "",

  location: "",

  room: "",

  note: "",

  attendance_count: 0,
};
const EMPTY_FORM = {
  training_course_id: "",
  class_name: "",
  short_description: "",
  description: "",
  mission: "",
  duration: "",
  target_audience: "",
  learning_outcomes: "",
  status: "OPEN",
  thumbnail: null,
};

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const datePart = date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const timePart = date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${datePart} ${timePart}`;
}
function CapacityBattery({ current = 0, max = 1 }) {
  const percent = Math.min(Math.round((current / max) * 100), 100);

  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(percent);
    }, 100);

    return () => clearTimeout(timer);
  }, [percent]);

  const getColor = () => {
    if (width >= 90) {
      return "bg-red-500";
    }

    if (width >= 70) {
      return "bg-yellow-400";
    }

    return "bg-green-500";
  };

  return (
    <div className="min-w-[160px]">
      <div
        className="
        mb-2
        flex
        items-center
        justify-between
        text-xs
      "
      >
        <span className="text-slate-500">Sĩ số</span>

        <span className="font-semibold text-slate-700">
          {current}/{max}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {/* thân pin */}

        <div
          className="
 relative
 h-6
 flex-1
 overflow-hidden
 rounded-full
 border
 border-slate-300
 bg-slate-100
 shadow-inner
 "
        >
          <div
            className={`
              absolute
              left-0
              top-0
              h-full
              ${getColor()}
              transition-all
              duration-[1200ms]
              ease-out
            `}
            style={{
              width: `${width}%`,
            }}
          />
          <div
            className="
 absolute
 inset-0
 animate-pulse
 bg-white/20
 "
          />
        </div>

        {/* đầu pin */}

        <div
          className="
          h-3
          w-1.5
          rounded-r
          bg-slate-400
          "
        />
      </div>

      <p
        className="
        mt-1
        text-[11px]
        text-slate-400
      "
      >
        {width}% đã sử dụng
      </p>
    </div>
  );
}
function toDateTimeLocal(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 16);
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}
function toDateInputLocal(value) {
  if (!value) {
    return "";
  }

  // Nếu backend trả trực tiếp YYYY-MM-DD
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
function formatDate(value) {
  if (!value) {
    return "—";
  }

  const normalized = toDateInputLocal(value);

  if (!normalized) {
    return "—";
  }

  const [year, month, day] = normalized.split("-");

  return `${day}/${month}/${year}`;
}

function formatTime(value) {
  if (!value) {
    return "—";
  }

  return String(value).slice(0, 5);
}

function getStatusLabel(status) {
  const labels = {
    OPEN: "Đang mở",
    FULL: "Đã đầy",
    CLOSED: "Đã đóng",
    FINISHED: "Đã kết thúc",
  };

  return labels[status] || status;
}

function getStatusClass(status) {
  switch (status) {
    case "OPEN":
      return "border-green-200 bg-green-50 text-green-700";

    case "FULL":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "CLOSED":
      return "border-slate-200 bg-slate-100 text-slate-600";

    case "FINISHED":
      return "border-blue-200 bg-blue-50 text-blue-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function ClassManagement() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [trainingCourses, setTrainingCourses] = useState([]);

  const [loading, setLoading] = useState(false);
  const [trainingCourseLoading, setTrainingCourseLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openingSessionsLoading, setOpeningSessionsLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [progressOpening, setProgressOpening] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedOpening, setSelectedOpening] = useState(null);
  const [openingStudents, setOpeningStudents] = useState([]);
  const [openingSessions, setOpeningSessions] = useState([
    { ...EMPTY_SESSION_FORM },
  ]);
  const [studentListLoading, setStudentListLoading] = useState(false);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);
  const [studentRegistrations, setStudentRegistrations] = useState([]);
  const [studentDetailLoading, setStudentDetailLoading] = useState(false);
  const [editingClassId, setEditingClassId] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [showOpeningModal, setShowOpeningModal] = useState(false);
  const [missionFilter, setMissionFilter] = useState("");
  const [editingOpeningId, setEditingOpeningId] = useState(null);

  const [savingOpening, setSavingOpening] = useState(false);

  const [openingForm, setOpeningForm] = useState({
    ...EMPTY_OPENING_FORM,
  });
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [trainingCourseFilter, setTrainingCourseFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [monthFilter, setMonthFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  const [availableYears, setAvailableYears] = useState([]);
  const refreshing = loading || trainingCourseLoading;
  const [formData, setFormData] = useState({
    ...EMPTY_FORM,
  });

  const token = localStorage.getItem("admin_token");

  const authConfig = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    [token],
  );
  const fetchFilterOptions = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/classes/filter-options`);

      setAvailableYears(response.data.data?.years || []);
    } catch (error) {
      console.error("Lỗi tải năm lọc:", error.response?.data || error);

      setAvailableYears([]);
    }
  }, []);
  const fetchTrainingCourses = useCallback(async () => {
    try {
      setTrainingCourseLoading(true);

      const response = await axios.get(`${API_URL}/training-courses`);

      setTrainingCourses(response.data.data || []);
    } catch (error) {
      console.error(
        "Lỗi tải danh sách khóa đào tạo:",
        error.response?.data || error,
      );

      alert(
        error.response?.data?.message ||
          "Không thể tải danh sách khóa đào tạo.",
      );
    } finally {
      setTrainingCourseLoading(false);
    }
  }, []);
  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);

      const params = {};

      if (trainingCourseFilter) {
        params.training_course_id = trainingCourseFilter;
      }

      if (statusFilter) {
        params.status = statusFilter;
      }

      if (monthFilter) {
        params.month = monthFilter;
      }

      if (yearFilter) {
        params.year = yearFilter;
      }
      if (missionFilter) {
        params.mission = missionFilter.trim();
      }
      if (appliedKeyword) {
        params.keyword = appliedKeyword;
      }

      const response = await axios.get(`${API_URL}/classes`, {
        params,
      });

      setClasses(response.data.data || []);
    } catch (error) {
      console.error(
        "Lỗi tải danh sách lớp học:",
        error.response?.data || error,
      );

      alert(
        error.response?.data?.message || "Không thể tải danh sách lớp học.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    trainingCourseFilter,
    statusFilter,
    monthFilter,
    yearFilter,
    missionFilter,
    appliedKeyword,
  ]);
  useEffect(() => {
    fetchTrainingCourses();
    fetchFilterOptions();
  }, [fetchTrainingCourses, fetchFilterOptions]);
  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);
  const filteredClasses = classes;
  const totalPages = Math.ceil(filteredClasses.length / limit);

  const paginatedClasses = filteredClasses.slice(
    (page - 1) * limit,
    page * limit,
  );

  const startItem = filteredClasses.length === 0 ? 0 : (page - 1) * limit + 1;

  const endItem = Math.min(page * limit, filteredClasses.length);
  const resetForm = () => {
    setFormData({
      ...EMPTY_FORM,
    });
  };
  const openEditOpeningModal = async (opening) => {
    if (!selectedClass?.id || !opening?.id) {
      alert("Không xác định được đợt tổ chức.");

      return;
    }

    setEditingOpeningId(opening.id);

    setOpeningForm({
      class_code: opening.class_code || "",

      class_name: opening.class_name || "",

      intake_name: opening.intake_name || "",

      trainer_name: opening.trainer_name || "",

      location: opening.location || "",

      register_open: toDateTimeLocal(opening.register_open),

      register_close: toDateTimeLocal(opening.register_close),
      organization_start_date: toDateInputLocal(
        opening.organization_start_date,
      ),

      organization_end_date: toDateInputLocal(opening.organization_end_date),
      max_students: Number(opening.max_students) || 50,

      current_students: Number(opening.current_students) || 0,

      status: opening.status || "OPEN",

      schedule_note: opening.schedule_note || "",
    });

    setOpeningSessions([]);

    setShowOpeningModal(true);

    try {
      setOpeningSessionsLoading(true);

      const response = await axios.get(
        `${API_URL}/classes/${selectedClass.id}/openings/${opening.id}/sessions`,
        authConfig,
      );

      const sessions = Array.isArray(response.data?.data)
        ? response.data.data
        : [];

      setOpeningSessions(
        sessions.length > 0
          ? sessions.map((session, index) => ({
              id: Number(session.id) || null,

              session_no: index + 1,

              session_date: toDateInputLocal(session.session_date),

              start_time: String(session.start_time || "").slice(0, 5),

              end_time: String(session.end_time || "").slice(0, 5),

              location: session.location || "",

              room: session.room || "",

              note: session.note || "",

              attendance_count: Number(session.attendance_count) || 0,
            }))
          : [
              {
                ...EMPTY_SESSION_FORM,
              },
            ],
      );
    } catch (error) {
      console.error("Lỗi tải lịch buổi học:", error.response?.data || error);

      setOpeningSessions([
        {
          ...EMPTY_SESSION_FORM,
        },
      ]);

      alert(error.response?.data?.message || "Không thể tải lịch buổi học.");
    } finally {
      setOpeningSessionsLoading(false);
    }
  };
  const openCreateOpeningModal = () => {
    if (!selectedClass) {
      return;
    }

    setEditingOpeningId(null);

    setOpeningForm({
      ...EMPTY_OPENING_FORM,

      class_name: selectedClass.class_name
        ? `${selectedClass.class_name} - ĐỢT 1`
        : "",
    });

    setOpeningSessions([
      {
        ...EMPTY_SESSION_FORM,
        session_no: 1,
      },
    ]);

    setShowOpeningModal(true);
  };
  const closeOpeningModal = () => {
    if (savingOpening) {
      return;
    }

    setShowOpeningModal(false);

    setEditingOpeningId(null);

    setOpeningForm({
      ...EMPTY_OPENING_FORM,
    });
    setOpeningSessions([{ ...EMPTY_SESSION_FORM }]);
  };
  const updateOpeningField = (name, value) => {
    setOpeningForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };
  const updateOpeningSession = (index, field, value) => {
    setOpeningSessions((previous) =>
      previous.map((session, sessionIndex) =>
        sessionIndex === index
          ? {
              ...session,
              [field]: value,
            }
          : session,
      ),
    );
  };

  const addOpeningSession = () => {
    setOpeningSessions((previous) => {
      const lastSession = previous[previous.length - 1];

      if (
        lastSession &&
        (!lastSession.session_date ||
          !lastSession.start_time ||
          !lastSession.end_time)
      ) {
        alert(
          `Vui lòng nhập đầy đủ Buổi ${previous.length} trước khi thêm buổi mới.`,
        );

        return previous;
      }

      return [
        ...previous,
        {
          ...EMPTY_SESSION_FORM,
          id: null,
          session_no: previous.length + 1,
          location: openingForm.location || "",
        },
      ];
    });
  };
  const removeOpeningSession = (index) => {
    setOpeningSessions((previous) => {
      if (previous.length <= 1) {
        return previous;
      }

      const target = previous[index];

      if (Number(target?.attendance_count || 0) > 0) {
        alert("Buổi học đã có dữ liệu điểm danh nên không thể xóa.");

        return previous;
      }

      return previous
        .filter((_, sessionIndex) => sessionIndex !== index)
        .map((session, sessionIndex) => ({
          ...session,
          session_no: sessionIndex + 1,
        }));
    });
  };
  const openCreateModal = () => {
    setEditingClassId(null);
    resetForm();
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (saving) {
      return;
    }

    setShowCreateModal(false);
    setEditingClassId(null);
    resetForm();
  };
  const handleExportExcel = async () => {
    try {
      setExporting(true);

      const params = {};

      if (trainingCourseFilter) {
        params.training_course_id = trainingCourseFilter;
      }

      if (statusFilter) {
        params.status = statusFilter;
      }

      if (yearFilter) {
        params.year = yearFilter;
      }

      if (monthFilter) {
        params.month = monthFilter;
      }

      if (missionFilter) {
        params.mission = missionFilter.trim();
      }

      if (appliedKeyword) {
        params.keyword = appliedKeyword;
      }

      const response = await axios.get(`${API_URL}/classes/export`, {
        params,

        responseType: "blob",

        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;

      link.download = "danh-sach-lop-hoc.xlsx";

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Lỗi xuất Excel lớp học:", error);

      alert("Không thể xuất danh sách lớp học.");
    } finally {
      setExporting(false);
    }
  };
  const handleRefresh = async () => {
    await Promise.all([fetchTrainingCourses(), fetchClasses()]);
  };
  const handleOpenAttendance = (opening) => {
    if (!opening?.id) {
      alert("Không xác định được đợt tổ chức.");
      return;
    }

    navigate(`/admin/classes/openings/${opening.id}/attendance`, {
      state: {
        opening: {
          id: opening.id,
          class_name: opening.class_name,
          intake_name: opening.intake_name,
          location: opening.location,
          schedule_note: opening.schedule_note,
          trainer_name: opening.trainer_name,
        },

        parentClass: selectedClass
          ? {
              id: selectedClass.id,
              class_name: selectedClass.class_name,
              training_course_name: selectedClass.training_course_name,
            }
          : null,
      },
    });
  };
  const handleViewOpeningStudents = async (opening) => {
    try {
      setSelectedOpening(opening);
      setOpeningStudents([]);
      setStudentListLoading(true);

      const response = await axios.get(`${API_URL}/registrations`, {
        ...authConfig,

        params: {
          class_id: opening.id,
          page: 1,
          limit: 1000,
          view: "registrations",
        },
      });

      setOpeningStudents(response.data.data || []);
    } catch (error) {
      console.error(
        "Lỗi tải danh sách học viên của đợt:",
        error.response?.data || error,
      );

      setOpeningStudents([]);

      alert(
        error.response?.data?.message ||
          "Không thể tải danh sách học viên của đợt tổ chức.",
      );
    } finally {
      setStudentListLoading(false);
    }
  };
  const handleViewStudentDetail = async (student) => {
    if (!student?.user_id) {
      alert("Không xác định được học viên.");
      return;
    }

    try {
      setStudentDetailLoading(true);

      setSelectedStudentDetail({
        id: student.user_id,
        fullname: student.fullname,
        email: student.email,
        phone: student.phone,

        company: student.company || student.organization || null,

        position: student.position || student.user_position || null,
      });

      setStudentRegistrations([]);

      const response = await axios.get(`${API_URL}/registrations`, {
        ...authConfig,

        params: {
          user_id: student.user_id,
          page: 1,
          limit: 100,
          view: "registrations",
        },
      });

      setStudentRegistrations(
        Array.isArray(response.data?.data) ? response.data.data : [],
      );
    } catch (error) {
      console.error("Lỗi tải hồ sơ học viên:", error.response?.data || error);

      setSelectedStudentDetail(null);
      setStudentRegistrations([]);

      alert(error.response?.data?.message || "Không thể tải hồ sơ học viên.");
    } finally {
      setStudentDetailLoading(false);
    }
  };
  const handleViewClass = async (item) => {
    try {
      setDetailLoading(true);

      setSelectedClass(item);

      const response = await axios.get(`${API_URL}/classes/${item.id}`);

      setSelectedClass(response.data.data || item);
    } catch (error) {
      console.error("Lỗi tải chi tiết lớp học:", error.response?.data || error);

      setSelectedClass(null);

      alert(error.response?.data?.message || "Không thể tải chi tiết lớp học.");
    } finally {
      setDetailLoading(false);
    }
  };
  const handleResetFilters = () => {
    setKeyword("");
    setAppliedKeyword("");
    setTrainingCourseFilter("");
    setStatusFilter("");
    setMonthFilter("");
    setYearFilter("");
    setMissionFilter("");
    setPage(1);
  };
  const openEditModal = async (item) => {
    try {
      setEditLoading(true);

      const response = await axios.get(`${API_URL}/classes/${item.id}`);

      const classInfo = response.data.data || item;

      setEditingClassId(item.id);

      setFormData({
        training_course_id: String(classInfo.training_course_id || ""),

        class_name: classInfo.class_name || "",

        short_description: classInfo.short_description || "",

        description: classInfo.description || "",
        mission: classInfo.mission || "",

        duration: classInfo.duration || "",

        target_audience: classInfo.target_audience || "",

        learning_outcomes: classInfo.learning_outcomes || "",

        status: classInfo.status || "OPEN",

        thumbnail: null,
      });

      setShowCreateModal(true);
    } catch (error) {
      console.error("Lỗi tải dữ liệu sửa lớp:", error.response?.data || error);

      alert(error.response?.data?.message || "Không thể tải dữ liệu lớp học.");
    } finally {
      setEditLoading(false);
    }
  };

  const updateField = (name, value) => {
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ==========================
  // VALIDATE
  // ==========================

  const validateForm = () => {
    if (!formData.training_course_id) {
      return "Vui lòng chọn khóa đào tạo.";
    }

    if (!formData.class_name.trim()) {
      return "Vui lòng nhập tên lớp học.";
    }

    if (formData.class_name.trim().length > 255) {
      return "Tên lớp học không được vượt quá 255 ký tự.";
    }

    return null;
  };

  // ==========================
  // CREATE / UPDATE FULL CLASS
  // ==========================

  const handleSaveClass = async (event) => {
    event.preventDefault();

    const validationMessage = validateForm();

    if (validationMessage) {
      alert(validationMessage);
      return;
    }

    try {
      setSaving(true);

      // =====================================================
      // FormData vì có upload thumbnail
      // =====================================================
      const payload = new FormData();

      payload.append("training_course_id", formData.training_course_id);

      payload.append("class_name", formData.class_name.trim());

      payload.append("short_description", formData.short_description.trim());

      payload.append("description", formData.description.trim());

      payload.append("duration", formData.duration.trim());

      payload.append("target_audience", formData.target_audience.trim());

      payload.append("learning_outcomes", formData.learning_outcomes.trim());
      payload.append("mission", formData.mission.trim());

      payload.append("status", formData.status);

      // Chỉ gửi file nếu người dùng chọn ảnh mới
      if (formData.thumbnail) {
        payload.append("thumbnail", formData.thumbnail);
      }

      let response;

      // =====================================================
      // UPDATE
      // =====================================================
      if (editingClassId) {
        response = await axios.put(
          `${API_URL}/classes/${editingClassId}`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      }

      // =====================================================
      // CREATE
      // =====================================================
      else {
        response = await axios.post(`${API_URL}/classes`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }

      alert(
        response.data.message ||
          (editingClassId
            ? "Cập nhật lớp học thành công."
            : "Thêm lớp học thành công."),
      );

      closeCreateModal();

      await fetchClasses();
    } catch (error) {
      console.error("Lỗi lưu lớp học:", error.response?.data || error);

      alert(error.response?.data?.message || "Không thể lưu lớp học.");
    } finally {
      setSaving(false);
    }
  };
  const handleSaveOpening = async (event) => {
    event.preventDefault();

    if (!selectedClass?.id) {
      alert("Không xác định được lớp học.");
      return;
    }

    if (!openingForm.max_students || Number(openingForm.max_students) <= 0) {
      alert("Số học viên tối đa phải lớn hơn 0.");

      return;
    }

    if (
      openingForm.register_open &&
      openingForm.register_close &&
      new Date(openingForm.register_open) >=
        new Date(openingForm.register_close)
    ) {
      alert("Thời gian đóng đăng ký phải sau thời gian mở đăng ký.");

      return;
    }
    const organizationStartDate = openingForm.organization_start_date;

    const organizationEndDate = openingForm.organization_end_date;

    // Không bắt buộc ở Admin thường nếu đã có sessions.
    // Nhưng nếu nhập thì phải nhập đủ cặp.
    if (organizationStartDate && !organizationEndDate) {
      alert("Vui lòng nhập ngày kết thúc tổ chức.");

      return;
    }

    if (!organizationStartDate && organizationEndDate) {
      alert("Vui lòng nhập ngày bắt đầu tổ chức.");

      return;
    }

    if (
      organizationStartDate &&
      organizationEndDate &&
      organizationEndDate < organizationStartDate
    ) {
      alert("Ngày kết thúc tổ chức không được trước ngày bắt đầu.");

      return;
    }
    for (let index = 0; index < openingSessions.length; index += 1) {
      const session = openingSessions[index];

      if (!session.session_date) {
        alert(`Vui lòng chọn ngày học cho Buổi ${index + 1}.`);

        return;
      }

      if (!session.start_time) {
        alert(`Vui lòng nhập giờ bắt đầu cho Buổi ${index + 1}.`);

        return;
      }

      if (!session.end_time) {
        alert(`Vui lòng nhập giờ kết thúc cho Buổi ${index + 1}.`);

        return;
      }

      if (session.start_time >= session.end_time) {
        alert(`Giờ kết thúc của Buổi ${index + 1} phải sau giờ bắt đầu.`);

        return;
      }
    }
    const normalizedSessions = openingSessions.map((session, index) => ({
      id: Number(session.id) || null,

      session_no: index + 1,

      session_date: session.session_date || null,

      start_time: session.start_time || null,

      end_time: session.end_time || null,

      location: session.location.trim() || openingForm.location.trim() || null,

      room: session.room.trim() || null,

      note: session.note.trim() || null,
    }));
    const payload = {
      class_code: openingForm.class_code.trim() || null,
      class_name: openingForm.class_name.trim() || null,
      intake_name: openingForm.intake_name.trim() || null,
      trainer_name: openingForm.trainer_name.trim() || null,
      location: openingForm.location.trim() || null,

      register_open: openingForm.register_open || null,

      register_close: openingForm.register_close || null,
      organization_start_date: openingForm.organization_start_date || null,

      organization_end_date: openingForm.organization_end_date || null,
      max_students: Number(openingForm.max_students),

      status: openingForm.status,

      schedule_note: openingForm.schedule_note.trim() || null,

      sessions: normalizedSessions,
    };
    console.log("OPENING PAYLOAD:", payload);
    try {
      setSavingOpening(true);

      let response;

      // =====================================================
      // UPDATE OPENING
      // =====================================================
      if (editingOpeningId) {
        response = await axios.put(
          `${API_URL}/classes/${selectedClass.id}/openings/${editingOpeningId}`,
          payload,
          authConfig,
        );
      }

      // =====================================================
      // CREATE OPENING
      // =====================================================
      else {
        response = await axios.post(
          `${API_URL}/classes/${selectedClass.id}/openings`,
          payload,
          authConfig,
        );
      }

      alert(
        response.data.message ||
          (editingOpeningId
            ? "Cập nhật đợt tổ chức thành công."
            : "Thêm đợt tổ chức thành công."),
      );

      closeOpeningModal();

      // =====================================================
      // LOAD LẠI CHI TIẾT
      // =====================================================
      const detailResponse = await axios.get(
        `${API_URL}/classes/${selectedClass.id}`,
      );

      setSelectedClass(detailResponse.data.data);

      await fetchClasses();
    } catch (error) {
      console.error("Lỗi lưu đợt tổ chức:", error.response?.data || error);

      alert(error.response?.data?.message || "Không thể lưu đợt tổ chức.");
    } finally {
      setSavingOpening(false);
    }
  };
  const handleDeleteOpening = async (opening) => {
    if (!selectedClass?.id) {
      return;
    }

    const accepted = window.confirm(
      `Xóa đợt "${opening.class_name || opening.intake_name || `#${opening.id}`}"?\n\n` +
        "Đợt đã có học viên đăng ký sẽ không thể xóa.",
    );

    if (!accepted) {
      return;
    }

    try {
      const response = await axios.delete(
        `${API_URL}/classes/${selectedClass.id}/openings/${opening.id}`,
        authConfig,
      );

      alert(response.data.message || "Xóa đợt tổ chức thành công.");

      const detailResponse = await axios.get(
        `${API_URL}/classes/${selectedClass.id}`,
      );

      setSelectedClass(detailResponse.data.data);

      await fetchClasses();
    } catch (error) {
      alert(error.response?.data?.message || "Không thể xóa đợt tổ chức.");
    }
  };
  const handleDeleteClass = async (item) => {
    const accepted = window.confirm(
      `Xóa lớp "${item.class_name}"?\n\n` +
        "Lớp đã có học viên đăng ký sẽ không thể xóa.",
    );

    if (!accepted) {
      return;
    }

    try {
      const response = await axios.delete(
        `${API_URL}/classes/${item.id}`,
        authConfig,
      );

      alert(response.data.message || "Đã xóa lớp học.");

      await fetchClasses();
    } catch (error) {
      alert(error.response?.data?.message || "Không thể xóa lớp học.");
    }
  };

  return (
    <div className="space-y-5">
      {/* HEADER */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Quản lý lớp học</h1>

          <p className="mt-1 text-sm text-slate-500">
            Quản lý lớp học theo từng khóa đào tạo và các đợt tổ chức.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="
              flex
              items-center
              gap-2
              rounded-xl
              border
              border-slate-200
              bg-white
            px-3.5 py-2
              text-sm
              font-medium
              text-slate-700
              hover:bg-slate-50
              disabled:opacity-50
            "
          >
            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting || loading}
            className="
    flex
    items-center
    gap-2
    rounded-xl
    border
    border-green-200
    bg-white
    px-4
    py-2.5
    text-sm
    font-semibold
    text-green-700
    transition
    hover:bg-green-50
    disabled:opacity-50
  "
          >
            {exporting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <FileSpreadsheet size={18} />
            )}

            {exporting ? "Đang xuất..." : "Xuất Excel"}
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="
              flex
              items-center
              gap-2
              rounded-xl
              bg-green-600
              px-4
              py-2.5
              text-sm
              font-semibold
              text-white
              shadow-sm
              transition
              hover:bg-green-700
            "
          >
            <Plus size={18} />
            Thêm lớp học
          </button>
        </div>
      </div>

      {/* SUMMARY */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Tổng lớp học" value={classes.length} />

        <SummaryCard
          label="Đang mở"
          value={
            classes.filter(
              (item) => (item.effective_status || item.status) === "OPEN",
            ).length
          }
          valueClass="text-green-600"
        />

        <SummaryCard
          label="Tổng đợt tổ chức"
          value={classes.reduce(
            (sum, item) => sum + Number(item.total_class_openings || 0),
            0,
          )}
          valueClass="text-blue-600"
        />

        <SummaryCard
          label="Tổng học viên"
          value={classes.reduce(
            (sum, item) => sum + Number(item.total_students || 0),
            0,
          )}
          valueClass="text-violet-600"
        />
      </div>

      {/* FILTER */}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-2.5 xl:grid-cols-[minmax(240px,1fr)_auto_200px_140px_120px_120px_220px]">
          {/* Search */}

          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4">
            <Search size={18} className="text-slate-400" />

            <input
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setPage(1);
              }}
              placeholder="Tìm tên lớp học..."
              className="w-full bg-transparent px-3 py-3 text-sm outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setAppliedKeyword(keyword.trim());
              setPage(1);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
          >
            <Search size={18} />
            Tìm kiếm
          </button>
          {/* Khóa đào tạo */}

          <select
            value={trainingCourseFilter}
            onChange={(event) => {
              setTrainingCourseFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
          >
            <option value="">Tất cả khóa đào tạo</option>

            {trainingCourses.map((trainingCourse) => (
              <option key={trainingCourse.id} value={trainingCourse.id}>
                {trainingCourse.training_course_name}
              </option>
            ))}
          </select>

          {/* Trạng thái */}

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="OPEN">Đang mở</option>
            <option value="CLOSED">Đã đóng</option>
          </select>

          {/* Năm */}

          <select
            value={yearFilter}
            onChange={(event) => {
              setYearFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
          >
            <option value="">Tất cả năm</option>

            {availableYears.map((year) => (
              <option key={year} value={year}>
                Năm {year}
              </option>
            ))}
          </select>
          {/* Tháng */}

          <select
            value={monthFilter}
            onChange={(event) => {
              setMonthFilter(event.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
          >
            <option value="">Tất cả tháng</option>

            {Array.from({ length: 12 }, (_, index) => index + 1).map(
              (month) => (
                <option key={month} value={month}>
                  Tháng {month}
                </option>
              ),
            )}
          </select>
          <input
            type="text"
            value={missionFilter}
            onChange={(event) => {
              setMissionFilter(event.target.value);
              setPage(1);
            }}
            placeholder="Lọc theo nhiệm vụ..."
            className="
    rounded-xl
    border
    border-slate-200
    bg-white
    px-3
    py-2.5
    text-sm
    outline-none
    focus:border-green-500
  "
          />
        </div>
        {(appliedKeyword ||
          trainingCourseFilter ||
          statusFilter ||
          monthFilter ||
          missionFilter ||
          yearFilter) && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-sm font-semibold text-slate-500 hover:text-red-600"
            >
              Xóa bộ lọc
            </button>
          </div>
        )}
      </div>
      {/* TABLE */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] table-fixed">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="w-[32%] px-4 py-3">Lớp học</th>

                <th className="w-[31%] px-4 py-3">Khóa đào tạo</th>

                <th className="w-[10%] px-3 py-3">Đợt tổ chức</th>

                <th className="w-[8%] px-3 py-3">Học viên</th>

                <th className="w-[9%] px-3 py-3">Trạng thái</th>

                <th className="w-[10%] px-3 py-3 text-right">Thao tác</th>
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
                      Đang tải danh sách lớp học...
                    </p>
                  </td>
                </tr>
              ) : filteredClasses.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-16 text-center text-slate-500"
                  >
                    Chưa có lớp học phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedClasses.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 text-sm transition hover:bg-slate-50/70"
                  >
                    {/* LỚP HỌC */}

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                          {item.thumbnail ? (
                            <img
                              src={`http://localhost:5000${item.thumbnail}`}
                              alt={item.class_name || "Lớp học"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                              Chưa có ảnh
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">
                            {item.class_name || "Chưa đặt tên"}
                          </p>

                          {item.duration && (
                            <p className="mt-1 text-xs text-slate-500">
                              Thời lượng: {item.duration}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* KHÓA ĐÀO TẠO */}

                    <td className="max-w-[360px] px-5 py-4">
                      <p className="line-clamp-3 text-slate-700">
                        {item.training_course_name || "—"}
                      </p>
                    </td>

                    {/* ĐỢT TỔ CHỨC */}

                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                        {Number(item.total_class_openings || 0)} đợt
                      </span>
                    </td>

                    {/* HỌC VIÊN */}

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <UserRound size={17} className="text-slate-400" />

                        <span className="font-semibold text-slate-700">
                          {Number(item.total_students || 0)}
                        </span>
                      </div>
                    </td>

                    {/* STATUS */}

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
          ${getStatusClass(item.effective_status || item.status)}
        `}
                      >
                        {getStatusLabel(item.effective_status || item.status)}
                      </span>
                    </td>

                    {/* ACTION */}

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleViewClass(item)}
                          className="rounded-lg border border-blue-200 p-2 text-blue-600 hover:bg-blue-50"
                          title="Xem chi tiết"
                        >
                          <Eye size={17} />
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="rounded-lg border border-amber-200 p-2 text-amber-600 hover:bg-amber-50"
                          title="Sửa lớp"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteClass(item)}
                          className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                          title="Xóa lớp"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
            <b>
              {startItem}-{endItem}
            </b>{" "}
            trên <b>{filteredClasses.length}</b> lớp
          </p>

          <div className="flex items-center gap-3">
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="
 rounded-lg
 border
 px-3
 py-2
 "
            >
              <option value={10}>10 dòng</option>
              <option value={20}>20 dòng</option>
              <option value={50}>50 dòng</option>
            </select>

            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="
 rounded-lg
 border
 px-3
 py-2
 disabled:opacity-40
 "
            >
              ‹
            </button>

            <span className="text-sm">
              Trang {page}/{totalPages || 1}
            </span>

            <button
              disabled={page === totalPages || totalPages === 0}
              onClick={() => setPage((p) => p + 1)}
              className="
 rounded-lg
 border
 px-3
 py-2
 disabled:opacity-40
 "
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT CLASS MODAL */}

      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            {/* HEADER */}

            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingClassId ? "Cập nhật lớp học" : "Thêm lớp học"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingClassId
                    ? "Chỉnh sửa thông tin chung của lớp học."
                    : "Tạo lớp học mới thuộc một khóa đào tạo."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                disabled={saving}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={22} />
              </button>
            </div>

            {/* FORM */}

            <form onSubmit={handleSaveClass} className="space-y-6 p-6">
              {/* KHÓA ĐÀO TẠO */}

              <FormSelect
                label="Khóa đào tạo"
                required
                value={formData.training_course_id}
                onChange={(value) => updateField("training_course_id", value)}
                disabled={trainingCourseLoading}
              >
                <option value="">Chọn khóa đào tạo</option>

                {trainingCourses
                  .filter((item) => item.status !== "INACTIVE")
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.training_course_name}
                    </option>
                  ))}
              </FormSelect>

              {/* TÊN */}

              <FormInput
                label="Tên lớp học"
                required
                value={formData.class_name}
                onChange={(value) => updateField("class_name", value)}
                placeholder="VD: LOGISTICS & XUẤT NHẬP KHẨU"
              />

              {/* ẢNH */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Ảnh lớp học
                </label>

                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;

                    updateField("thumbnail", file);
                  }}
                  className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                />

                <p className="mt-2 text-xs text-slate-400">
                  Hỗ trợ JPG, PNG hoặc WEBP.
                </p>
              </div>

              {/* MÔ TẢ NGẮN */}

              <FormInput
                label="Mô tả ngắn"
                value={formData.short_description}
                onChange={(value) => updateField("short_description", value)}
                placeholder="Mô tả ngắn về lớp học..."
              />

              {/* DESCRIPTION */}

              <FormTextarea
                label="Mô tả chi tiết"
                value={formData.description}
                onChange={(value) => updateField("description", value)}
                placeholder="Thông tin chi tiết về nội dung lớp học..."
              />

              <div className="grid gap-5 md:grid-cols-2">
                {/* DURATION */}

                <FormInput
                  label="Thời lượng"
                  value={formData.duration}
                  onChange={(value) => updateField("duration", value)}
                  placeholder="VD: 6 buổi"
                />

                {/* STATUS */}

                <FormSelect
                  label="Trạng thái"
                  value={formData.status}
                  onChange={(value) => updateField("status", value)}
                >
                  <option value="OPEN">Đang mở</option>
                  <option value="CLOSED">Đã đóng</option>
                </FormSelect>
              </div>

              {/* TARGET */}

              <FormTextarea
                label="Đối tượng tham gia"
                value={formData.target_audience}
                onChange={(value) => updateField("target_audience", value)}
                placeholder="VD: Startup, doanh nghiệp nhỏ và vừa..."
              />

              {/* OUTCOME */}

              <FormTextarea
                label="Kết quả mong đợi"
                value={formData.learning_outcomes}
                onChange={(value) => updateField("learning_outcomes", value)}
                placeholder="Học viên đạt được gì sau khi hoàn thành lớp..."
              />
              <FormTextarea
                label="Nhiệm vụ"
                value={formData.mission}
                onChange={(value) => updateField("mission", value)}
                placeholder="VD: Nâng cao năng lực marketing, hỗ trợ doanh nghiệp tiếp cận khách hàng và phát triển thị trường..."
              />
              {/* ACTION */}

              <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white pt-4">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : editingClassId ? (
                    <Pencil size={18} />
                  ) : (
                    <Plus size={18} />
                  )}

                  {saving
                    ? "Đang lưu..."
                    : editingClassId
                      ? "Lưu thay đổi"
                      : "Thêm lớp học"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLASS DETAIL */}

      {selectedClass && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-slate-50 shadow-2xl">
            {/* HEADER */}

            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Chi tiết lớp học
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Thông tin lớp học và các đợt tổ chức.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedClass(null)}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={22} />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-20 text-center">
                <Loader2
                  size={30}
                  className="mx-auto animate-spin text-green-600"
                />

                <p className="mt-3 text-sm text-slate-500">
                  Đang tải chi tiết lớp học...
                </p>
              </div>
            ) : (
              <div className="space-y-6 p-6">
                {/* THÔNG TIN LỚP */}

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="grid lg:grid-cols-[320px_1fr]">
                    {/* IMAGE */}

                    <div className="min-h-[240px] bg-slate-100">
                      {selectedClass.thumbnail ? (
                        <img
                          src={`http://localhost:5000${selectedClass.thumbnail}`}
                          alt={selectedClass.class_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full min-h-[240px] items-center justify-center text-sm text-slate-400">
                          Chưa có ảnh lớp học
                        </div>
                      )}
                    </div>

                    {/* INFO */}

                    <div className="p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-2xl font-bold text-slate-900">
                            {selectedClass.class_name}
                          </h3>

                          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                            {selectedClass.short_description ||
                              "Chưa có mô tả ngắn."}
                          </p>
                        </div>

                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                            selectedClass.effective_status ||
                              selectedClass.status,
                          )}`}
                        >
                          {getStatusLabel(
                            selectedClass.effective_status ||
                              selectedClass.status,
                          )}
                        </span>
                      </div>

                      <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <DetailItem
                          label="Khóa đào tạo"
                          value={selectedClass.training_course_name}
                        />

                        <DetailItem
                          label="Thời lượng"
                          value={selectedClass.duration}
                        />

                        <DetailItem
                          label="Đối tượng tham gia"
                          value={selectedClass.target_audience}
                        />

                        <DetailItem
                          label="Tổng học viên"
                          value={`${Number(
                            selectedClass.total_students || 0,
                          )} học viên`}
                        />
                      </div>

                      {selectedClass.description && (
                        <div className="mt-5 rounded-xl bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Mô tả chi tiết
                          </p>

                          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                            {selectedClass.description}
                          </p>
                        </div>
                      )}

                      {selectedClass.learning_outcomes && (
                        <div className="mt-4 rounded-xl bg-green-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
                            Kết quả mong đợi
                          </p>

                          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                            {selectedClass.learning_outcomes}
                          </p>
                        </div>
                      )}
                      {selectedClass.mission && (
                        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                            Nhiệm vụ
                          </p>

                          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                            {selectedClass.mission}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* OPENINGS */}

                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Đợt tổ chức
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {selectedClass.class_openings?.length || 0} đợt tổ chức
                        của lớp học.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={openCreateOpeningModal}
                      className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
                    >
                      <Plus size={18} />
                      Thêm đợt tổ chức
                    </button>
                  </div>

                  {!selectedClass.class_openings?.length ? (
                    <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center">
                      <p className="font-medium text-slate-700">
                        Chưa có đợt tổ chức
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Lớp học đã được tạo nhưng chưa có đợt mở lớp.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-5 space-y-4">
                      {selectedClass.class_openings.map((opening) => (
                        <div
                          key={opening.id}
                          className="rounded-2xl border border-slate-200 p-5"
                        >
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-bold text-slate-900">
                                  {opening.class_name || `Đợt #${opening.id}`}
                                </h4>

                                <span
                                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                                    opening.effective_status || opening.status,
                                  )}`}
                                >
                                  {getStatusLabel(
                                    opening.effective_status || opening.status,
                                  )}
                                </span>
                              </div>

                              {opening.intake_name && (
                                <p className="mt-1 text-sm font-medium text-blue-600">
                                  {opening.intake_name}
                                </p>
                              )}

                              <div className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                                <p className="text-slate-600">
                                  <b>Giảng viên:</b>{" "}
                                  {opening.trainer_name || "Chưa cập nhật"}
                                </p>

                                <p className="text-slate-600">
                                  <b>Địa điểm:</b>{" "}
                                  {opening.location || "Chưa cập nhật"}
                                </p>

                                <p className="text-slate-600">
                                  <b>Sĩ số:</b>{" "}
                                  {Number(opening.current_students || 0)}/
                                  {Number(opening.max_students || 50)}
                                </p>

                                <p className="text-slate-600">
                                  <b>Mở đăng ký:</b>{" "}
                                  {formatDateTime(opening.register_open)}
                                </p>

                                <p className="text-slate-600">
                                  <b>Đóng đăng ký:</b>{" "}
                                  {formatDateTime(opening.register_close)}
                                </p>

                                <p className="text-slate-600">
                                  <b>Học viên đăng ký:</b>{" "}
                                  {Number(opening.total_registrations || 0)}
                                </p>
                                <p className="text-slate-600">
                                  <b>Thời gian tổ chức:</b>{" "}
                                  {opening.effective_start_date
                                    ? formatDate(opening.effective_start_date)
                                    : "Chưa cập nhật"}
                                  {" → "}
                                  {opening.effective_end_date
                                    ? formatDate(opening.effective_end_date)
                                    : "Chưa cập nhật"}
                                </p>
                              </div>

                              {opening.schedule_note && (
                                <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                  <b>Lịch:</b> {opening.schedule_note}
                                </div>
                              )}
                            </div>

                            <div className="flex shrink-0 flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => setProgressOpening(opening)}
                                className="rounded-lg border border-violet-200 px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                              >
                                Cập nhật tiến độ
                              </button>
                              {/* XEM HỌC VIÊN */}

                              <button
                                type="button"
                                onClick={() =>
                                  handleViewOpeningStudents(opening)
                                }
                                className="rounded-lg border border-blue-200 p-2 text-blue-600 hover:bg-blue-50"
                                title="Xem danh sách học viên"
                              >
                                <Eye size={17} />
                              </button>

                              {/* ĐIỂM DANH */}

                              <button
                                type="button"
                                onClick={() => handleOpenAttendance(opening)}
                                className="
      inline-flex
      items-center
      gap-2
      rounded-lg
      border
      border-emerald-200
      px-3
      py-2
      text-sm
      font-semibold
      text-emerald-700
      transition
      hover:bg-emerald-50
    "
                                title="Điểm danh QR"
                              >
                                <ScanLine size={17} />
                                Điểm danh
                              </button>

                              {/* SỬA */}

                              <button
                                type="button"
                                onClick={() => openEditOpeningModal(opening)}
                                className="rounded-lg border border-amber-200 p-2 text-amber-600 hover:bg-amber-50"
                                title="Sửa đợt"
                              >
                                <Pencil size={17} />
                              </button>

                              {/* XÓA */}

                              <button
                                type="button"
                                onClick={() => handleDeleteOpening(opening)}
                                className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                                title="Xóa đợt"
                              >
                                <Trash2 size={17} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      )}
      {/* =========================================
    OPENING STUDENT LIST MODAL
========================================= */}

      {selectedOpening && (
        <div className="fixed inset-0 z-[125] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            {/* HEADER */}
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Danh sách học viên
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedOpening.class_name ||
                    selectedOpening.intake_name ||
                    `Đợt #${selectedOpening.id}`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedOpening(null);
                  setOpeningStudents([]);
                }}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={22} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {/* SUMMARY */}
              <div className="grid gap-4 sm:grid-cols-3">
                <OpeningStudentSummary
                  label="Học viên đăng ký"
                  value={openingStudents.length}
                />

                <OpeningStudentSummary
                  label="Sĩ số tối đa"
                  value={Number(selectedOpening.max_students || 0)}
                />

                <OpeningStudentSummary
                  label="Còn trống"
                  value={Math.max(
                    Number(selectedOpening.max_students || 0) -
                      openingStudents.length,
                    0,
                  )}
                />
              </div>

              {/* TABLE */}
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px]">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-4">Học viên</th>

                        <th className="px-5 py-4">Liên hệ</th>

                        <th className="px-5 py-4">Đơn vị / Chức vụ</th>

                        <th className="px-5 py-4">Trạng thái</th>

                        <th className="px-5 py-4">Ngày đăng ký</th>
                        <th className="px-5 py-4 text-right">Thao tác</th>
                      </tr>
                    </thead>

                    <tbody>
                      {studentListLoading ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-16 text-center">
                            <Loader2
                              size={30}
                              className="mx-auto animate-spin text-green-600"
                            />

                            <p className="mt-3 text-sm text-slate-500">
                              Đang tải danh sách học viên...
                            </p>
                          </td>
                        </tr>
                      ) : openingStudents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-16 text-center">
                            <UserRound
                              size={36}
                              className="mx-auto text-slate-300"
                            />

                            <p className="mt-3 font-medium text-slate-700">
                              Chưa có học viên
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              Chưa có học viên đăng ký đợt tổ chức này.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        openingStudents.map((student) => (
                          <tr
                            key={student.id}
                            className="border-b border-slate-100 text-sm transition hover:bg-slate-50"
                          >
                            {/* HỌC VIÊN */}
                            <td className="px-5 py-4">
                              <p className="font-semibold text-slate-900">
                                {student.fullname || "—"}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                Mã đăng ký #{student.id}
                              </p>
                            </td>

                            {/* LIÊN HỆ */}
                            <td className="px-5 py-4">
                              <p className="text-slate-700">
                                {student.email || "—"}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {student.phone || "—"}
                              </p>
                            </td>

                            {/* ĐƠN VỊ */}
                            <td className="px-5 py-4">
                              <p className="text-slate-700">
                                {student.company || "Chưa có đơn vị"}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {student.position || "Chưa có chức vụ"}
                              </p>
                            </td>

                            {/* STATUS */}
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getRegistrationStatusClass(
                                  student.register_status,
                                )}`}
                              >
                                {getRegistrationStatusLabel(
                                  student.register_status,
                                )}
                              </span>
                            </td>

                            {/* NGÀY */}
                            <td className="px-5 py-4 text-slate-600">
                              {formatDateTime(student.created_at)}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleViewStudentDetail(student)
                                  }
                                  className="rounded-lg border border-blue-200 p-2 text-blue-600 hover:bg-blue-50"
                                  title="Xem hồ sơ học viên"
                                >
                                  <Eye size={17} />
                                </button>
                              </div>
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
      )}
      {/* =========================================
    STUDENT DETAIL MODAL
========================================= */}

      {selectedStudentDetail && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            {/* HEADER */}
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Hồ sơ học viên
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Thông tin cá nhân và lịch sử tham gia đào tạo.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedStudentDetail(null);
                  setStudentRegistrations([]);
                }}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={22} />
              </button>
            </div>

            <div className="space-y-6 p-6">
              {/* LOADING */}
              {studentDetailLoading ? (
                <div className="py-20 text-center">
                  <Loader2
                    size={32}
                    className="mx-auto animate-spin text-green-600"
                  />

                  <p className="mt-3 text-sm text-slate-500">
                    Đang tải hồ sơ học viên...
                  </p>
                </div>
              ) : (
                <>
                  {/* =====================================
                THÔNG TIN CÁ NHÂN
            ===================================== */}

                  <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <h3 className="mb-5 text-lg font-bold text-slate-900">
                      Thông tin học viên
                    </h3>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <StudentDetailItem
                        label="Họ và tên"
                        value={selectedStudentDetail.fullname}
                      />

                      <StudentDetailItem
                        label="Email"
                        value={selectedStudentDetail.email}
                      />

                      <StudentDetailItem
                        label="Điện thoại"
                        value={selectedStudentDetail.phone}
                      />

                      <StudentDetailItem
                        label="Tổng lượt đăng ký"
                        value={studentRegistrations.length}
                      />

                      <StudentDetailItem
                        label="Đơn vị"
                        value={selectedStudentDetail.company}
                      />

                      <StudentDetailItem
                        label="Chức vụ"
                        value={selectedStudentDetail.position}
                      />
                    </div>
                  </section>

                  {/* =====================================
                LỊCH SỬ ĐÀO TẠO
            ===================================== */}

                  <section>
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          Lịch sử khóa học
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          Toàn bộ khóa, lớp và đợt học viên đã đăng ký.
                        </p>
                      </div>

                      <span className="rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                        {studentRegistrations.length} lượt đăng ký
                      </span>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px]">
                          <thead className="bg-slate-50">
                            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              <th className="px-5 py-4">Khóa đào tạo</th>

                              <th className="px-5 py-4">Lớp học</th>

                              <th className="px-5 py-4">Đợt tổ chức</th>

                              <th className="px-5 py-4">Trạng thái</th>

                              <th className="px-5 py-4">Check-in</th>

                              <th className="px-5 py-4">Ngày đăng ký</th>
                            </tr>
                          </thead>

                          <tbody>
                            {studentRegistrations.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={6}
                                  className="px-5 py-14 text-center text-slate-500"
                                >
                                  Học viên chưa có lịch sử đăng ký.
                                </td>
                              </tr>
                            ) : (
                              studentRegistrations.map(
                                (registration, index) => (
                                  <tr
                                    key={`${registration.id}-${index}`}
                                    className="border-t border-slate-100 text-sm hover:bg-slate-50"
                                  >
                                    {/* KHÓA */}
                                    <td className="px-5 py-4 font-medium text-slate-900">
                                      {registration.training_course_name || "—"}
                                    </td>

                                    {/* LỚP */}
                                    <td className="px-5 py-4 text-slate-700">
                                      {registration.training_class_name ||
                                        registration.course_name ||
                                        "—"}
                                    </td>

                                    {/* ĐỢT */}
                                    <td className="px-5 py-4 text-slate-600">
                                      {registration.opening_name ||
                                        registration.class_name ||
                                        "—"}
                                    </td>

                                    {/* STATUS */}
                                    <td className="px-5 py-4">
                                      <span
                                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getRegistrationStatusClass(
                                          registration.register_status,
                                        )}`}
                                      >
                                        {getRegistrationStatusLabel(
                                          registration.register_status,
                                        )}
                                      </span>
                                    </td>

                                    {/* CHECK IN */}
                                    <td className="px-5 py-4">
                                      <span
                                        className={
                                          Number(
                                            registration.checked_in || 0,
                                          ) === 1
                                            ? "font-semibold text-green-600"
                                            : "text-slate-400"
                                        }
                                      >
                                        {Number(
                                          registration.checked_in || 0,
                                        ) === 1
                                          ? "Đã check-in"
                                          : "Chưa check-in"}
                                      </span>
                                    </td>

                                    {/* CREATED */}
                                    <td className="px-5 py-4 text-slate-600">
                                      {formatDateTime(registration.created_at)}
                                    </td>
                                  </tr>
                                ),
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* =========================================
    OPENING MODAL
========================================= */}

      {showOpeningModal && selectedClass && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            {/* =====================================
          HEADER
      ===================================== */}

            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingOpeningId
                    ? "Cập nhật đợt tổ chức"
                    : "Thêm đợt tổ chức"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Lớp: {selectedClass.class_name}
                </p>
              </div>

              <button
                type="button"
                onClick={closeOpeningModal}
                disabled={savingOpening}
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={22} />
              </button>
            </div>

            {/* =====================================
          FORM
      ===================================== */}

            <form
              onSubmit={handleSaveOpening}
              className="flex min-h-0 flex-1 flex-col"
            >
              {/* =====================================
            BODY SCROLL
        ===================================== */}

              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                <div className="space-y-7">
                  {/* ===============================
                THÔNG TIN ĐỢT
            =============================== */}

                  <section>
                    <div className="mb-4">
                      <h3 className="font-bold text-slate-900">
                        Thông tin đợt tổ chức
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Khai báo thông tin chung, thời gian đăng ký và sĩ số.
                      </p>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <FormInput
                        label="Mã đợt / mã lớp"
                        value={openingForm.class_code}
                        onChange={(value) =>
                          updateOpeningField("class_code", value)
                        }
                        placeholder="VD: LOG-2026-01"
                      />

                      <FormInput
                        label="Tên hiển thị của đợt"
                        value={openingForm.class_name}
                        onChange={(value) =>
                          updateOpeningField("class_name", value)
                        }
                        placeholder="VD: Logistics - Đợt tháng 9/2026"
                      />

                      <FormInput
                        label="Khóa tuyển sinh"
                        value={openingForm.intake_name}
                        onChange={(value) =>
                          updateOpeningField("intake_name", value)
                        }
                        placeholder="VD: Đợt tháng 9/2026"
                      />

                      <FormInput
                        label="Giảng viên"
                        value={openingForm.trainer_name}
                        onChange={(value) =>
                          updateOpeningField("trainer_name", value)
                        }
                        placeholder="Nguyễn Văn A"
                      />

                      <div className="md:col-span-2">
                        <FormInput
                          label="Địa điểm"
                          value={openingForm.location}
                          onChange={(value) =>
                            updateOpeningField("location", value)
                          }
                          placeholder="273 Điện Biên Phủ, TP.HCM"
                        />
                      </div>

                      <FormDateTime
                        label="Mở đăng ký"
                        value={openingForm.register_open}
                        onChange={(value) =>
                          updateOpeningField("register_open", value)
                        }
                      />

                      <FormDateTime
                        label="Đóng đăng ký"
                        value={openingForm.register_close}
                        onChange={(value) =>
                          updateOpeningField("register_close", value)
                        }
                      />
                      <div className="md:col-span-2">
                        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                          <p className="text-sm font-bold text-blue-900">
                            Thời gian tổ chức
                          </p>

                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <FormInput
                              label="Ngày bắt đầu tổ chức"
                              type="date"
                              value={openingForm.organization_start_date}
                              onChange={(value) =>
                                updateOpeningField(
                                  "organization_start_date",
                                  value,
                                )
                              }
                            />

                            <FormInput
                              label="Ngày kết thúc tổ chức"
                              type="date"
                              value={openingForm.organization_end_date}
                              onChange={(value) =>
                                updateOpeningField(
                                  "organization_end_date",
                                  value,
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                      <FormInput
                        label="Số học viên tối đa"
                        type="number"
                        min="1"
                        value={openingForm.max_students}
                        onChange={(value) =>
                          updateOpeningField("max_students", value)
                        }
                      />

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Số học viên hiện tại
                        </label>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                          {Number(openingForm.current_students || 0)}
                        </div>

                        <p className="mt-1.5 text-xs text-slate-400">
                          Tự động tính từ số học viên đăng ký.
                        </p>
                      </div>

                      <FormSelect
                        label="Trạng thái"
                        value={openingForm.status}
                        onChange={(value) =>
                          updateOpeningField("status", value)
                        }
                      >
                        <option value="OPEN">Đang mở</option>
                        <option value="FULL">Đã đầy</option>
                        <option value="CLOSED">Đã đóng</option>
                        <option value="FINISHED">Đã kết thúc</option>
                      </FormSelect>

                      <div className="md:col-span-2">
                        <FormInput
                          label="Ghi chú lịch"
                          value={openingForm.schedule_note}
                          onChange={(value) =>
                            updateOpeningField("schedule_note", value)
                          }
                          placeholder="VD: Ngày 10/09 - 15/09/2026"
                        />
                      </div>
                    </div>
                  </section>

                  {/* ===============================
                BUỔI HỌC
            =============================== */}

                  <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    {/* HEADER SESSION */}

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          Buổi học
                        </h3>
                        <p className="mt-1 text-xs font-semibold text-green-700">
                          Hiện có {openingSessions.length} buổi
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Khai báo ngày và thời gian từng buổi để dùng cho điểm
                          danh và trạng thái tự động.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={addOpeningSession}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2.5 text-sm font-semibold text-green-700 transition hover:bg-green-50"
                      >
                        <Plus size={17} />
                        Thêm buổi
                      </button>
                    </div>

                    {/* SESSION LIST */}
                    {openingSessionsLoading ? (
                      <div className="py-12 text-center">
                        <Loader2
                          size={28}
                          className="mx-auto animate-spin text-green-600"
                        />

                        <p className="mt-3 text-sm text-slate-500">
                          Đang tải lịch buổi học...
                        </p>
                      </div>
                    ) : (
                      <div className="mt-5 space-y-4">
                        {openingSessions.map((session, index) => (
                          <div
                            key={session.id ?? `new-session-${index}`}
                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                          >
                            {/* SESSION HEADER */}

                            <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-50 text-sm font-bold text-green-700">
                                  {index + 1}
                                </div>

                                <div>
                                  <p className="font-bold text-slate-900">
                                    Buổi {index + 1}
                                  </p>
                                  {Number(session.attendance_count || 0) >
                                    0 && (
                                    <span className="mt-1 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                      Có dữ liệu điểm danh
                                    </span>
                                  )}
                                  <p className="text-xs text-slate-400">
                                    Thông tin lịch học
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => removeOpeningSession(index)}
                                disabled={
                                  openingSessions.length <= 1 ||
                                  Number(session.attendance_count || 0) > 0
                                }
                                className="rounded-lg border border-red-200 p-2 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                                title={
                                  Number(session.attendance_count || 0) > 0
                                    ? "Buổi đã có dữ liệu điểm danh nên không thể xóa"
                                    : "Xóa buổi"
                                }
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>

                            {/* DATE TIME */}

                            <div className="grid gap-4 lg:grid-cols-3">
                              <FormInput
                                label="Ngày học"
                                type="date"
                                required
                                value={session.session_date}
                                onChange={(value) =>
                                  updateOpeningSession(
                                    index,
                                    "session_date",
                                    value,
                                  )
                                }
                              />

                              <FormInput
                                label="Giờ bắt đầu"
                                type="time"
                                required
                                value={session.start_time}
                                onChange={(value) =>
                                  updateOpeningSession(
                                    index,
                                    "start_time",
                                    value,
                                  )
                                }
                              />

                              <FormInput
                                label="Giờ kết thúc"
                                type="time"
                                required
                                value={session.end_time}
                                onChange={(value) =>
                                  updateOpeningSession(index, "end_time", value)
                                }
                              />
                            </div>

                            {/* LOCATION */}

                            <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                              <FormInput
                                label="Địa điểm buổi học"
                                value={session.location}
                                onChange={(value) =>
                                  updateOpeningSession(index, "location", value)
                                }
                                placeholder={
                                  openingForm.location ||
                                  "Dùng địa điểm chung của đợt"
                                }
                              />

                              <FormInput
                                label="Phòng"
                                value={session.room}
                                onChange={(value) =>
                                  updateOpeningSession(index, "room", value)
                                }
                                placeholder="VD: P.101"
                              />
                            </div>

                            {/* NOTE */}

                            <div className="mt-4">
                              <FormInput
                                label="Ghi chú buổi học"
                                value={session.note}
                                onChange={(value) =>
                                  updateOpeningSession(index, "note", value)
                                }
                                placeholder="VD: Buổi khai giảng"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* EDIT MODE NOTE */}
                </div>
              </div>

              {/* =====================================
            FOOTER ACTION
        ===================================== */}

              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">
                <button
                  type="button"
                  onClick={closeOpeningModal}
                  disabled={savingOpening}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={savingOpening}
                  className="inline-flex min-w-[160px] items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-60"
                >
                  {savingOpening ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : editingOpeningId ? (
                    <Pencil size={18} />
                  ) : (
                    <Plus size={18} />
                  )}

                  {savingOpening
                    ? "Đang lưu..."
                    : editingOpeningId
                      ? "Lưu thay đổi"
                      : "Thêm đợt tổ chức"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {progressOpening && (
        <CourseClassProgressModal
          key={progressOpening.id}
          opening={progressOpening}
          onClose={() => setProgressOpening(null)}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, valueClass = "text-slate-900" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>

      <p className={`mt-1.5 text-2xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}
function getRegistrationStatusLabel(status) {
  const labels = {
    PENDING: "Chờ duyệt",
    CONFIRMED: "Đã xác nhận",
    REJECTED: "Đã từ chối",
    CANCELLED: "Đã hủy",
  };

  return labels[status] || status || "—";
}

function getRegistrationStatusClass(status) {
  switch (status) {
    case "CONFIRMED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "REJECTED":
      return "border-red-200 bg-red-50 text-red-700";

    case "CANCELLED":
      return "border-slate-200 bg-slate-100 text-slate-600";

    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function OpeningStudentSummary({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-sm text-slate-500">{label}</p>

      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
function SectionTitle({ title, description }) {
  return (
    <div>
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>

      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  required = false,
  type = "text",
  placeholder = "",
  min,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}

        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <input
        type={type}
        value={value ?? ""}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
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
          transition
          focus:border-green-500
          focus:ring-4
          focus:ring-green-100
        "
      />
    </div>
  );
}
function FormTextarea({ label, value, onChange, placeholder = "" }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <textarea
        rows={4}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="
          w-full
          resize-y
          rounded-xl
          border
          border-slate-200
          bg-white
          px-4
          py-3
          text-sm
          outline-none
          transition
          focus:border-green-500
          focus:ring-4
          focus:ring-green-100
        "
      />
    </div>
  );
}
function FormDateTime({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        type="datetime-local"
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
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
          transition
          focus:border-green-500
          focus:ring-4
          focus:ring-green-100
        "
      />
    </div>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  children,
  required = false,
  disabled = false,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}

        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          disabled={disabled}
          className="
            w-full
            appearance-none
            rounded-xl
            border
            border-slate-200
            bg-white
            px-4
            py-3
            pr-10
            text-sm
            outline-none
            transition
            focus:border-green-500
            focus:ring-4
            focus:ring-green-100
            disabled:cursor-not-allowed
            disabled:bg-slate-100
          "
        >
          {children}
        </select>

        <ChevronDown
          size={17}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
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
function StudentDetailItem({ label, value }) {
  return (
    <div className="rounded-xl bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold text-slate-800">
        {value === null || value === undefined || value === "" ? "—" : value}
      </p>
    </div>
  );
}
export default ClassManagement;
