import EventStatisticsCharts from "./EventStatisticsCharts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  UserPlus,
  UserRound,
  Users,
  BarChart3,
  ArrowRightLeft,
  FileSpreadsheet,
  X,
} from "lucide-react";

const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const API_URL = RAW_API_URL.replace(/\/+$/, "").endsWith("/api")
  ? RAW_API_URL.replace(/\/+$/, "")
  : `${RAW_API_URL.replace(/\/+$/, "")}/api`;
const SERVER_URL = API_URL.replace(/\/api$/, "");

const EMPTY_EVENT_FORM = {
  event_name: "",
  event_type: "EXHIBITION",
  parent_event_id: "",
  event_code: "",
  short_description: "",
  description: "",
  mission: "",
  thumbnail: "",
  location: "",
  start_datetime: "",
  end_datetime: "",
  year: new Date().getFullYear(),
  organizer: "SIHUB",
  max_participants: 0,
  status: "OPEN",
};

const EMPTY_PARTICIPANT_FORM = {
  user_id: "",
  search_text: "",
  participant_role: "Khách tham dự",
  organization: "",
  position: "",
  note: "",
  registration_status: "CONFIRMED",
};
function getAgeGroupLabel(value) {
  const labels = {
    UNDER_18: "Dưới 18 tuổi",
    "18-24": "Từ 18-24 tuổi",
    "18-25": "Từ 18-25 tuổi",
    "25-35": "Từ 25-35 tuổi",
    "26-35": "Từ 26-35 tuổi",
    "36-45": "Từ 36-45 tuổi",
    "46_PLUS": "Trên 45 tuổi",
  };

  return labels[value] || value || "—";
}
function getStartupStageLabel(value) {
  const labels = {
    NONE: "Không có startup",
    IDEA: "Giai đoạn ý tưởng",
    PROTOTYPE: "Giai đoạn prototype",
    MVP: "Giai đoạn prototype/MVP",
    EARLY_REVENUE: "Đã có sản phẩm và doanh thu ban đầu",
    GROWTH: "Giai đoạn tăng trưởng",
    SCALE: "Giai đoạn mở rộng",
  };

  return labels[value] || value || "—";
}

function getProjectFieldLabel(value, otherValue) {
  const labels = {
    ECOMMERCE: "Lĩnh vực Thương mại điện tử",
    FINTECH: "Lĩnh vực Công nghệ tài chính",
    LOGISTICS: "Lĩnh vực Logistic",
    EDTECH: "Lĩnh vực Công nghệ giáo dục",
    HEALTHCARE: "Lĩnh vực Y tế và chăm sóc sức khỏe",
    HIGH_TECH_AGRICULTURE: "Lĩnh vực Nông nghiệp công nghệ cao",
    SUSTAINABILITY: "Lĩnh vực Phát triển bền vững",
    AI_DIGITAL_TRANSFORMATION: "Lĩnh vực Chuyển đổi số, trí tuệ nhân tạo",
    CYBERSECURITY: "Lĩnh vực An ninh mạng",
    CULTURAL_INDUSTRY: "Lĩnh vực công nghiệp văn hoá",
    OTHER: otherValue ? `Lĩnh vực khác: ${otherValue}` : "Lĩnh vực khác",
  };

  return labels[value] || value || "—";
}
function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 16);
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function getGenderLabel(value) {
  const labels = {
    MALE: "Nam",
    FEMALE: "Nữ",
    OTHER: "Khác",
  };

  return labels[value] || value || "—";
}

function getUserTypeLabel(value) {
  const labels = {
    STARTUP: "Startup/Dự án (Chưa thành lập doanh nghiệp)",
    BUSINESS: "Doanh nghiệp",
    STUDENT: "Sinh viên",
    UNIVERSITY: "Trường đại học / Viện nghiên cứu",
    OTHER: "Khác",
  };

  return labels[value] || value || "—";
}

function getFemaleFounderLabel(value) {
  if (value === null || value === undefined) {
    return "—";
  }

  return Number(value) === 1 ? "Có" : "Không";
}

function getProgramSelectionLabel(value) {
  if (value === "YES") {
    return "Tôi thuộc chương trình trên";
  }

  if (value === "NO") {
    return "Tôi không thuộc chương trình trên";
  }

  return value || "—";
}

function getJoinAgainLabel(value) {
  if (value === "YES") return "Có";
  if (value === "NO") return "Không";

  return value || "—";
}
function getStatusLabel(status) {
  return (
    {
      DRAFT: "Bản nháp",
      OPEN: "Đang mở",
      CLOSED: "Đã đóng",
      FINISHED: "Đã kết thúc",
    }[status] ||
    status ||
    "—"
  );
}

function getStatusClass(status) {
  switch (status) {
    case "OPEN":
      return "border-green-200 bg-green-50 text-green-700";
    case "DRAFT":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "CLOSED":
      return "border-slate-200 bg-slate-100 text-slate-600";
    case "FINISHED":
      return "border-blue-200 bg-blue-50 text-blue-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

export default function StartupConnectionDay({ eventType = "EXHIBITION" }) {
  const isExhibition = eventType === "EXHIBITION";

  const pageTitle = isExhibition ? "Quản lý Triển lãm" : "Quản lý Hội thảo";
  const pageDescription = isExhibition
    ? "Quản lý các triển lãm thuộc Startup Connection Day."
    : "Quản lý các hội thảo thuộc Startup Connection Day.";
  const createButtonLabel = isExhibition ? "Thêm triển lãm" : "Thêm hội thảo";
  const rowLabel = isExhibition ? "triển lãm" : "hội thảo";

  const [events, setEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [exhibitions, setExhibitions] = useState([]);
  const [childSeminars, setChildSeminars] = useState([]);
  const [exhibitionSurveys, setExhibitionSurveys] = useState([]);

  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [selectedParticipantDetail, setSelectedParticipantDetail] =
    useState(null);
  const [participantListSearch, setParticipantListSearch] = useState("");
  const [transferEvent, setTransferEvent] = useState(null);

  const [transferMode, setTransferMode] = useState("");
  // TO_SEMINAR | TO_EXHIBITION

  const [transferParentId, setTransferParentId] = useState("");

  const [transferLoading, setTransferLoading] = useState(false);

  const [transferDetail, setTransferDetail] = useState(null);
  const [surveyExporting, setSurveyExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCharts, setShowCharts] = useState(false);

  const [chartLoading, setChartLoading] = useState(false);

  const [statistics, setStatistics] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [missionFilter, setMissionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [eventForm, setEventForm] = useState({ ...EMPTY_EVENT_FORM });

  const [selectedEvent, setSelectedEvent] = useState(null);

  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [participantSaving, setParticipantSaving] = useState(false);
  const [participantForm, setParticipantForm] = useState({
    ...EMPTY_PARTICIPANT_FORM,
  });
  const [participantUsers, setParticipantUsers] = useState([]);
  const [participantSearchLoading, setParticipantSearchLoading] =
    useState(false);
  const [selectedParticipantUser, setSelectedParticipantUser] = useState(null);
  const participantSearchTimer = useRef(null);

  const token = localStorage.getItem("admin_token");
  const authConfig = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    [token],
  );

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);

      const response = await axios.get(`${API_URL}/startup-connection/events`, {
        params: {
          type: eventType,

          status: statusFilter || undefined,

          year: yearFilter || undefined,

          month: monthFilter || undefined,

          mission: missionFilter.trim() || undefined,

          keyword: appliedKeyword || undefined,
        },

        ...authConfig,
      });

      setEvents(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      console.error(
        "Lỗi tải Startup Connection Day:",
        error.response?.data || error,
      );

      setEvents([]);

      alert(
        error.response?.data?.message || `Không thể tải danh sách ${rowLabel}.`,
      );
    } finally {
      setLoading(false);
    }
  }, [
    authConfig,
    eventType,
    rowLabel,
    statusFilter,
    yearFilter,
    monthFilter,
    missionFilter,
    appliedKeyword,
  ]);

  const fetchAllEvents = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_URL}/startup-connection/events`,
        authConfig,
      );
      setAllEvents(
        Array.isArray(response.data?.data) ? response.data.data : [],
      );
    } catch (error) {
      console.error(
        "Lỗi tải tổng quan Startup Connection Day:",
        error.response?.data || error,
      );
      setAllEvents([]);
    }
  }, [authConfig]);

  const fetchExhibitions = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/startup-connection/events`, {
        params: { type: "EXHIBITION" },
        ...authConfig,
      });
      setExhibitions(
        Array.isArray(response.data?.data) ? response.data.data : [],
      );
    } catch (error) {
      console.error(
        "Lỗi tải danh sách triển lãm:",
        error.response?.data || error,
      );
      setExhibitions([]);
    }
  }, [authConfig]);

  useEffect(() => {
    fetchEvents();
    fetchAllEvents();
  }, [fetchEvents, fetchAllEvents]);

  useEffect(() => {
    if (!isExhibition) {
      fetchExhibitions();
    }
  }, [isExhibition, fetchExhibitions]);

  const availableYears = useMemo(() => {
    const values = new Set();
    allEvents.forEach((item) => {
      if (item.year) values.add(Number(item.year));
      if (item.start_datetime) {
        const date = new Date(item.start_datetime);
        if (!Number.isNaN(date.getTime())) values.add(date.getFullYear());
      }
    });
    return [...values].sort((a, b) => b - a);
  }, [allEvents]);

  const filteredEvents = events;
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / limit));
  const paginatedEvents = filteredEvents.slice(
    (page - 1) * limit,
    page * limit,
  );
  const startItem = filteredEvents.length === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, filteredEvents.length);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const totalExhibitions = allEvents.filter(
    (item) => item.event_type === "EXHIBITION",
  ).length;
  const totalSeminars = allEvents.filter(
    (item) => item.event_type === "SEMINAR",
  ).length;
  const totalParticipants = allEvents.reduce(
    (sum, item) => sum + Number(item.total_participants || 0),
    0,
  );
  const totalOpenCurrentType = events.filter(
    (item) => item.status === "OPEN",
  ).length;
  const handleResetFilters = () => {
    setKeyword("");
    setAppliedKeyword("");
    setStatusFilter("");
    setYearFilter("");
    setMonthFilter("");
    setMissionFilter("");
    setPage(1);
  };
  const handleExportExhibitionSurvey = async () => {
    if (!selectedEvent?.id) {
      return;
    }

    try {
      setSurveyExporting(true);

      const response = await axios.get(`${API_URL}/exhibition-surveys/export`, {
        params: {
          event_id: selectedEvent.id,
        },

        responseType: "blob",

        ...authConfig,
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;

      link.download = `khao-sat-trien-lam-${selectedEvent.id}.xlsx`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(
        "Lỗi xuất khảo sát triển lãm:",
        error.response?.data || error,
      );

      alert(
        error.response?.data?.message || "Không thể xuất khảo sát triển lãm.",
      );
    } finally {
      setSurveyExporting(false);
    }
  };
  const fetchStatistics = async () => {
    try {
      setChartLoading(true);

      const response = await axios.get(
        `${API_URL}/startup-connection/events/statistics`,
        {
          params: {
            type: eventType,

            status: statusFilter || undefined,

            year: yearFilter || undefined,

            month: monthFilter || undefined,

            mission: missionFilter.trim() || undefined,

            keyword: appliedKeyword || undefined,
          },

          ...authConfig,
        },
      );

      setStatistics(response.data?.data || null);

      setShowCharts(true);
    } catch (error) {
      console.error(
        "Lỗi tải biểu đồ Startup Connection:",
        error.response?.data || error,
      );

      alert(error.response?.data?.message || "Không thể tải dữ liệu biểu đồ.");
    } finally {
      setChartLoading(false);
    }
  };
  const handleExportExcel = async () => {
    try {
      setExporting(true);

      const response = await axios.get(
        `${API_URL}/startup-connection/events/export`,
        {
          params: {
            type: eventType,

            status: statusFilter || undefined,

            year: yearFilter || undefined,

            month: monthFilter || undefined,

            // QUAN TRỌNG:
            // dùng keyword đã bấm Tìm kiếm,
            // không dùng chữ người dùng đang gõ dở.
            keyword: appliedKeyword || undefined,
            mission: missionFilter.trim() || undefined,
          },

          headers: {
            Authorization: `Bearer ${token}`,
          },

          responseType: "blob",
        },
      );

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;

      let fileName =
        eventType === "EXHIBITION"
          ? "danh-sach-trien-lam"
          : "danh-sach-hoi-thao";

      if (yearFilter) {
        fileName += `-${yearFilter}`;
      }

      if (monthFilter) {
        fileName += `-thang-${monthFilter}`;
      }

      link.download = `${fileName}.xlsx`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Lỗi xuất Excel:", error);

      alert("Không thể xuất dữ liệu Excel.");
    } finally {
      setExporting(false);
    }
  };
  const resetEventForm = () => {
    setEventForm({
      ...EMPTY_EVENT_FORM,
      event_type: eventType,
      year: new Date().getFullYear(),
    });
  };

  const openCreateEventModal = () => {
    setEditingEventId(null);
    setEventForm({
      ...EMPTY_EVENT_FORM,
      event_type: eventType,
      parent_event_id: "",
      year: new Date().getFullYear(),
    });
    setShowEventModal(true);
  };

  const closeEventModal = () => {
    if (saving) return;
    setShowEventModal(false);
    setEditingEventId(null);
    resetEventForm();
  };

  const updateEventField = (name, value) => {
    setEventForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openEditEventModal = async (item) => {
    try {
      setSaving(true);
      const response = await axios.get(
        `${API_URL}/startup-connection/events/${item.id}`,
        authConfig,
      );
      const data = response.data?.data || item;

      setEditingEventId(item.id);
      setEventForm({
        event_name: data.event_name || "",
        event_type: data.event_type || eventType,
        parent_event_id: data.parent_event_id
          ? String(data.parent_event_id)
          : "",
        event_code: data.event_code || "",
        short_description: data.short_description || "",
        description: data.description || "",
        mission: data.mission || "",
        thumbnail: data.thumbnail || "",
        location: data.location || "",
        start_datetime: toDateTimeLocal(data.start_datetime),
        end_datetime: toDateTimeLocal(data.end_datetime),
        year: data.year || new Date().getFullYear(),
        organizer: data.organizer || "SIHUB",
        max_participants: Number(data.max_participants || 0),
        status: data.status || "OPEN",
      });
      setShowEventModal(true);
    } catch (error) {
      console.error(
        "Lỗi lấy dữ liệu sửa sự kiện:",
        error.response?.data || error,
      );
      alert(error.response?.data?.message || "Không thể tải dữ liệu sự kiện.");
    } finally {
      setSaving(false);
    }
  };

  const validateEventForm = () => {
    if (!eventForm.event_name.trim()) return `Vui lòng nhập tên ${rowLabel}.`;
    if (eventForm.start_datetime && eventForm.end_datetime) {
      if (
        new Date(eventForm.start_datetime) >= new Date(eventForm.end_datetime)
      ) {
        return "Thời gian kết thúc phải sau thời gian bắt đầu.";
      }
    }
    if (Number(eventForm.max_participants) < 0) {
      return "Số người tối đa không được nhỏ hơn 0.";
    }
    return null;
  };

  const handleSaveEvent = async (event) => {
    event.preventDefault();
    const validationMessage = validateEventForm();
    if (validationMessage) {
      alert(validationMessage);
      return;
    }

    const payload = {
      event_name: eventForm.event_name.trim(),
      event_type: eventType,
      parent_event_id:
        eventType === "SEMINAR" && eventForm.parent_event_id
          ? Number(eventForm.parent_event_id)
          : null,
      event_code: eventForm.event_code.trim() || null,
      short_description: eventForm.short_description.trim() || null,
      description: eventForm.description.trim() || null,
      mission: eventForm.mission.trim() || null,
      thumbnail: eventForm.thumbnail.trim() || null,
      location: eventForm.location.trim() || null,
      start_datetime: eventForm.start_datetime || null,
      end_datetime: eventForm.end_datetime || null,
      year: Number(eventForm.year) || null,
      organizer: eventForm.organizer.trim() || null,
      max_participants: Number(eventForm.max_participants) || 0,
      status: eventForm.status,
    };

    try {
      setSaving(true);
      const response = editingEventId
        ? await axios.put(
            `${API_URL}/startup-connection/events/${editingEventId}`,
            payload,
            authConfig,
          )
        : await axios.post(
            `${API_URL}/startup-connection/events`,
            payload,
            authConfig,
          );

      alert(response.data?.message || "Lưu dữ liệu thành công.");
      closeEventModal();
      await Promise.all([fetchEvents(), fetchAllEvents()]);
      if (!isExhibition) await fetchExhibitions();
    } catch (error) {
      console.error(
        "Lỗi lưu Startup Connection Day:",
        error.response?.data || error,
      );
      alert(error.response?.data?.message || "Không thể lưu dữ liệu.");
    } finally {
      setSaving(false);
    }
  };
  const handleUploadEventImage = async (file) => {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      alert("Chỉ hỗ trợ ảnh JPG, JPEG, PNG hoặc WEBP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Ảnh không được vượt quá 5MB.");
      return;
    }

    try {
      setImageUploading(true);

      const formData = new FormData();

      formData.append("image", file);

      const response = await axios.post(
        `${API_URL}/event-images/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const thumbnail = response.data?.data?.thumbnail;

      if (!thumbnail) {
        throw new Error("API không trả về đường dẫn ảnh.");
      }

      setEventForm((previous) => ({
        ...previous,
        thumbnail,
      }));
    } catch (error) {
      console.error(
        "Upload ảnh Startup Connection Day lỗi:",
        error.response?.data || error,
      );

      alert(error.response?.data?.message || "Không thể tải ảnh lên.");
    } finally {
      setImageUploading(false);
    }
  };
  const handleDeleteEvent = async (item) => {
    const accepted = window.confirm(`Xóa \"${item.event_name}\"?`);
    if (!accepted) return;

    try {
      const response = await axios.delete(
        `${API_URL}/startup-connection/events/${item.id}`,
        authConfig,
      );
      alert(response.data?.message || "Xóa thành công.");
      if (selectedEvent?.id === item.id) setSelectedEvent(null);
      await Promise.all([fetchEvents(), fetchAllEvents()]);
    } catch (error) {
      console.error("Lỗi xóa sự kiện:", error.response?.data || error);
      alert(error.response?.data?.message || "Không thể xóa dữ liệu.");
    }
  };
  const handleOpenTransfer = async (item) => {
    try {
      setTransferLoading(true);

      setTransferEvent(item);
      setTransferParentId("");

      const detailResponse = await axios.get(
        `${API_URL}/startup-connection/events/${item.id}`,
        authConfig,
      );

      const detail = detailResponse.data?.data || item;

      let children = [];

      if (item.event_type === "EXHIBITION") {
        const seminarResponse = await axios.get(
          `${API_URL}/startup-connection/events`,
          {
            params: {
              type: "SEMINAR",
              parent_event_id: item.id,
            },

            ...authConfig,
          },
        );

        children = Array.isArray(seminarResponse.data?.data)
          ? seminarResponse.data.data
          : [];
      }

      setTransferDetail({
        ...detail,

        child_seminars: children,
      });

      setTransferMode(
        item.event_type === "EXHIBITION" ? "TO_SEMINAR" : "TO_EXHIBITION",
      );
    } catch (error) {
      console.error(
        "Lỗi tải dữ liệu chuyển loại:",
        error.response?.data || error,
      );

      setTransferEvent(null);
      setTransferDetail(null);

      alert("Không thể tải dữ liệu sự kiện.");
    } finally {
      setTransferLoading(false);
    }
  };
  const handleTransferEventType = async () => {
    if (!transferEvent?.id || !transferDetail) {
      return;
    }

    try {
      setTransferLoading(true);

      // =====================================================
      // TRIỂN LÃM -> HỘI THẢO
      // =====================================================
      if (transferMode === "TO_SEMINAR") {
        const childSeminars = Array.isArray(transferDetail.child_seminars)
          ? transferDetail.child_seminars
          : [];

        /*
         * CASE 1:
         * Triển lãm import nhầm nhưng đã có Hội thảo con.
         *
         * Không đổi Triển lãm thành Hội thảo.
         * Chỉ tách Hội thảo con ra thành Hội thảo độc lập.
         */
        if (childSeminars.length === 1) {
          const seminar = childSeminars[0];

          const accepted = window.confirm(
            `Triển lãm "${transferEvent.event_name}" đang có 1 Hội thảo trực thuộc.\n\n` +
              `Hệ thống sẽ tách Hội thảo "${seminar.event_name}" thành Hội thảo độc lập và giữ nguyên người tham dự.\n\n` +
              "Bạn có muốn tiếp tục?",
          );

          if (!accepted) {
            return;
          }

          await axios.put(
            `${API_URL}/startup-connection/events/${seminar.id}`,
            {
              event_name: seminar.event_name,

              event_type: "SEMINAR",

              parent_event_id: null,

              event_code: seminar.event_code || null,

              short_description: seminar.short_description || null,

              description: seminar.description || null,
              mission: seminar.mission || null,
              thumbnail: seminar.thumbnail || null,

              location: seminar.location || null,

              start_datetime: seminar.start_datetime || null,

              end_datetime: seminar.end_datetime || null,

              year:
                seminar.year || transferEvent.year || new Date().getFullYear(),

              organizer:
                seminar.organizer || transferEvent.organizer || "SIHUB",

              max_participants: Number(seminar.max_participants || 0),

              status: seminar.status || "OPEN",
            },

            authConfig,
          );

          alert(
            "Đã tách Hội thảo khỏi Triển lãm. Người tham dự được giữ nguyên.",
          );

          setTransferEvent(null);
          setTransferDetail(null);
          setTransferMode("");

          await Promise.all([fetchEvents(), fetchAllEvents()]);

          return;
        }

        /*
         * CASE 2:
         * Có nhiều hơn 1 Hội thảo con.
         *
         * Không tự động xử lý vì không biết Admin muốn giữ cái nào.
         */
        if (childSeminars.length > 1) {
          alert(
            `Triển lãm này đang có ${childSeminars.length} Hội thảo trực thuộc. ` +
              "Không thể tự động chuyển vì có nguy cơ làm sai dữ liệu.",
          );

          return;
        }

        /*
         * CASE 3:
         * Không có Hội thảo con.
         *
         * Có thể đổi chính record Exhibition -> Seminar.
         */
        const accepted = window.confirm(
          `Chuyển "${transferEvent.event_name}" từ Triển lãm sang Hội thảo?\n\n` +
            "Thông tin sự kiện hiện tại sẽ được giữ lại.",
        );

        if (!accepted) {
          return;
        }

        await axios.put(
          `${API_URL}/startup-connection/events/${transferEvent.id}`,
          {
            event_name: transferDetail.event_name,

            event_type: "SEMINAR",

            parent_event_id: transferParentId ? Number(transferParentId) : null,

            event_code: transferDetail.event_code || null,

            short_description: transferDetail.short_description || null,

            description: transferDetail.description || null,
            mission: transferDetail.mission || null,

            thumbnail: transferDetail.thumbnail || null,

            location: transferDetail.location || null,

            start_datetime: transferDetail.start_datetime || null,

            end_datetime: transferDetail.end_datetime || null,

            year: transferDetail.year || new Date().getFullYear(),

            organizer: transferDetail.organizer || "SIHUB",

            max_participants: Number(transferDetail.max_participants || 0),

            status: transferDetail.status || "OPEN",
          },

          authConfig,
        );

        alert("Đã chuyển Triển lãm sang Hội thảo.");

        setTransferEvent(null);
        setTransferDetail(null);
        setTransferMode("");
        setTransferParentId("");

        await Promise.all([fetchEvents(), fetchAllEvents()]);

        return;
      }

      // =====================================================
      // HỘI THẢO -> TRIỂN LÃM
      // =====================================================
      if (transferMode === "TO_EXHIBITION") {
        const accepted = window.confirm(
          `Chuyển "${transferEvent.event_name}" từ Hội thảo sang Triển lãm?`,
        );

        if (!accepted) {
          return;
        }

        await axios.put(
          `${API_URL}/startup-connection/events/${transferEvent.id}`,
          {
            event_name: transferDetail.event_name,

            event_type: "EXHIBITION",

            parent_event_id: null,

            event_code: transferDetail.event_code || null,

            short_description: transferDetail.short_description || null,

            description: transferDetail.description || null,
            mission: transferDetail.mission || null,
            thumbnail: transferDetail.thumbnail || null,

            location: transferDetail.location || null,

            start_datetime: transferDetail.start_datetime || null,

            end_datetime: transferDetail.end_datetime || null,

            year: transferDetail.year || new Date().getFullYear(),

            organizer: transferDetail.organizer || "SIHUB",

            max_participants: Number(transferDetail.max_participants || 0),

            status: transferDetail.status || "OPEN",
          },

          authConfig,
        );

        alert("Đã chuyển Hội thảo sang Triển lãm.");

        setTransferEvent(null);
        setTransferDetail(null);
        setTransferMode("");

        await Promise.all([fetchEvents(), fetchAllEvents()]);
      }
    } catch (error) {
      console.error(
        "Lỗi chuyển loại Startup Connection:",
        error.response?.data || error,
      );

      alert(error.response?.data?.message || "Không thể chuyển loại sự kiện.");
    } finally {
      setTransferLoading(false);
    }
  };
  const handleViewEvent = async (item) => {
    try {
      setDetailLoading(true);
      setParticipantListSearch("");
      setSelectedEvent(item);
      setChildSeminars([]);
      setExhibitionSurveys([]);
      setSelectedSurvey(null);
      setSelectedParticipantDetail(null);

      const response = await axios.get(
        `${API_URL}/startup-connection/events/${item.id}`,
        authConfig,
      );

      const detail = response.data?.data || item;

      setSelectedEvent(detail);

      setExhibitionSurveys(Array.isArray(detail.surveys) ? detail.surveys : []);

      if (detail.event_type !== "EXHIBITION") {
        return;
      }

      const seminarResponse = await axios.get(
        `${API_URL}/startup-connection/events`,
        {
          params: {
            type: "SEMINAR",
            parent_event_id: detail.id,
          },
          ...authConfig,
        },
      );

      setChildSeminars(
        Array.isArray(seminarResponse.data?.data)
          ? seminarResponse.data.data
          : [],
      );
    } catch (error) {
      console.error("Lỗi xem chi tiết:", error.response?.data || error);

      setSelectedEvent(null);
      setChildSeminars([]);
      setExhibitionSurveys([]);
      setSelectedSurvey(null);

      alert(error.response?.data?.message || "Không thể tải chi tiết.");
    } finally {
      setDetailLoading(false);
    }
  };

  const openParticipantModal = () => {
    setParticipantForm({ ...EMPTY_PARTICIPANT_FORM });
    setParticipantUsers([]);
    setSelectedParticipantUser(null);
    setShowParticipantModal(true);
  };

  const closeParticipantModal = () => {
    if (participantSaving) return;
    setParticipantUsers([]);
    setSelectedParticipantUser(null);
    setShowParticipantModal(false);
    setParticipantForm({ ...EMPTY_PARTICIPANT_FORM });
  };

  const updateParticipantField = (name, value) => {
    setParticipantForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const searchParticipantUsers = async (keyword) => {
    const search = String(keyword || "").trim();
    if (search.length < 2) {
      setParticipantUsers([]);
      return;
    }

    try {
      setParticipantSearchLoading(true);
      const response = await axios.get(`${API_URL}/users`, {
        params: {
          keyword: search,
          limit: 10,
          page: 1,
        },
        ...authConfig,
      });

      const users = Array.isArray(response.data?.data)
        ? response.data.data
        : [];
      const existingUserIds = new Set(
        (selectedEvent?.participants || []).map((participant) =>
          Number(participant.user_id),
        ),
      );

      setParticipantUsers(
        users.filter((user) => !existingUserIds.has(Number(user.id))),
      );
    } catch (error) {
      console.error("Lỗi tìm người tham dự:", error.response?.data || error);
      setParticipantUsers([]);
    } finally {
      setParticipantSearchLoading(false);
    }
  };

  const handleParticipantSearch = (value) => {
    updateParticipantField("search_text", value);
    setSelectedParticipantUser(null);
    updateParticipantField("user_id", "");

    if (participantSearchTimer.current) {
      clearTimeout(participantSearchTimer.current);
    }

    if (value.trim().length < 2) {
      setParticipantUsers([]);
      return;
    }

    participantSearchTimer.current = setTimeout(() => {
      searchParticipantUsers(value);
    }, 350);
  };

  useEffect(() => {
    return () => {
      if (participantSearchTimer.current) {
        clearTimeout(participantSearchTimer.current);
      }
    };
  }, []);

  const refreshSelectedEvent = async (eventId) => {
    const response = await axios.get(
      `${API_URL}/startup-connection/events/${eventId}`,
      authConfig,
    );
    setSelectedEvent(response.data?.data || null);
  };

  const handleAddParticipant = async (event) => {
    event.preventDefault();
    if (!selectedEvent?.id) return;

    const userId = Number(participantForm.user_id);
    if (!Number.isInteger(userId) || userId <= 0) {
      alert("Vui lòng chọn người tham dự.");
      return;
    }

    try {
      setParticipantSaving(true);
      const response = await axios.post(
        `${API_URL}/startup-connection/events/${selectedEvent.id}/participants`,
        {
          user_id: userId,
          participant_role: participantForm.participant_role.trim() || null,
          organization: participantForm.organization.trim() || null,
          position: participantForm.position.trim() || null,
          note: participantForm.note.trim() || null,
          registration_status: participantForm.registration_status,
        },
        authConfig,
      );

      alert(response.data?.message || "Thêm người tham dự thành công.");
      closeParticipantModal();
      await refreshSelectedEvent(selectedEvent.id);
      await Promise.all([fetchEvents(), fetchAllEvents()]);
    } catch (error) {
      console.error("Lỗi thêm người tham dự:", error.response?.data || error);
      alert(error.response?.data?.message || "Không thể thêm người tham dự.");
    } finally {
      setParticipantSaving(false);
    }
  };

  const handleDeleteParticipant = async (participant) => {
    if (!selectedEvent?.id) return;
    if (!window.confirm(`Xóa \"${participant.fullname}\" khỏi danh sách?`)) {
      return;
    }

    try {
      const response = await axios.delete(
        `${API_URL}/startup-connection/events/${selectedEvent.id}/participants/${participant.id}`,
        authConfig,
      );
      alert(response.data?.message || "Xóa người tham dự thành công.");
      await refreshSelectedEvent(selectedEvent.id);
      await Promise.all([fetchEvents(), fetchAllEvents()]);
    } catch (error) {
      alert(error.response?.data?.message || "Không thể xóa người tham dự.");
    }
  };
  const filteredParticipants = useMemo(() => {
    const participants = Array.isArray(selectedEvent?.participants)
      ? selectedEvent.participants
      : [];

    const search = participantListSearch.trim().toLowerCase();

    if (!search) {
      return participants;
    }

    return participants.filter((participant) => {
      const searchableText = [
        participant.fullname,
        participant.email,
        participant.phone,
        participant.organization,
        participant.company,
        participant.position,
        participant.user_position,
        participant.participant_role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(search);
    });
  }, [selectedEvent?.participants, participantListSearch]);
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{pageTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">{pageDescription}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={fetchStatistics}
            disabled={chartLoading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {chartLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <BarChart3 size={18} />
            )}

            {chartLoading ? "Đang tổng hợp..." : "Xem biểu đồ"}
          </button>
          <button
            type="button"
            onClick={() => {
              fetchEvents();
              fetchAllEvents();
            }}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting || loading}
            className="flex items-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2.5 text-sm font-semibold text-green-700 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
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
            onClick={openCreateEventModal}
            className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            <Plus size={18} />
            {createButtonLabel}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label={isExhibition ? "Tổng triển lãm" : "Tổng hội thảo"}
          value={events.length}
        />
        <SummaryCard
          label="Đang mở"
          value={totalOpenCurrentType}
          valueClass="text-green-600"
        />
        <SummaryCard
          label="Tổng Startup Connection Day"
          value={allEvents.length}
          valueClass="text-blue-600"
        />
        <SummaryCard
          label="Người tham dự"
          value={totalParticipants}
          valueClass="text-violet-600"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_auto_220px_200px_150px_150px]">
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4">
            <Search size={18} className="text-slate-400" />
            <input
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setPage(1);
              }}
              placeholder={`Tìm theo tên ${rowLabel}...`}
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
          <input
            type="text"
            value={missionFilter}
            onChange={(event) => {
              setMissionFilter(event.target.value);
              setPage(1);
            }}
            placeholder="Lọc theo nhiệm vụ..."
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
          />
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
            <option value="FINISHED">Đã kết thúc</option>
            <option value="DRAFT">Bản nháp</option>
          </select>

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
        </div>

        {(appliedKeyword ||
          missionFilter ||
          statusFilter ||
          yearFilter ||
          monthFilter) && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-sm font-medium text-green-600 hover:text-green-700"
            >
              Xóa bộ lọc
            </button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px]">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-4">
                  {isExhibition ? "Triển lãm" : "Hội thảo"}
                </th>

                <th className="px-5 py-4">Thời gian</th>
                <th className="px-5 py-4">Địa điểm</th>
                <th className="px-5 py-4">Người tham dự</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4">Thời gian gửi </th>

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
                      Đang tải dữ liệu...
                    </p>
                  </td>
                </tr>
              ) : paginatedEvents.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-16 text-center text-slate-500"
                  >
                    Chưa có {rowLabel} phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 text-sm transition hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4">
                      <div className="max-w-[360px]">
                        <p className="font-semibold text-slate-900">
                          {item.event_name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.event_code || "Chưa có mã"}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-start gap-2">
                        <CalendarDays
                          size={17}
                          className="mt-0.5 shrink-0 text-slate-400"
                        />
                        <div>
                          <p className="text-slate-700">
                            {formatDateTime(item.start_datetime)}
                          </p>
                          {item.end_datetime && (
                            <p className="mt-1 text-xs text-slate-400">
                              đến {formatDateTime(item.end_datetime)}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="max-w-[260px] px-5 py-4">
                      <div className="flex items-start gap-2">
                        <MapPin
                          size={17}
                          className="mt-0.5 shrink-0 text-slate-400"
                        />
                        <p className="line-clamp-2 text-slate-600">
                          {item.location || "Chưa cập nhật"}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <UserRound size={17} className="text-slate-400" />
                        <span className="font-semibold">
                          {Number(item.total_participants || 0)}
                        </span>
                        {Number(item.max_participants || 0) > 0 && (
                          <span className="text-slate-400">
                            /{item.max_participants}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                          item.status,
                        )}`}
                      >
                        {getStatusLabel(item.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-500">
                      {formatDateTime(item.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleViewEvent(item)}
                          className="rounded-lg border border-blue-200 p-2 text-blue-600 hover:bg-blue-50"
                          title="Xem chi tiết"
                        >
                          <Eye size={17} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenTransfer(item)}
                          className="rounded-lg border border-violet-200 p-2 text-violet-600 hover:bg-violet-50"
                          title={
                            isExhibition
                              ? "Chuyển sang Hội thảo"
                              : "Chuyển sang Triển lãm"
                          }
                        >
                          <ArrowRightLeft size={17} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditEventModal(item)}
                          className="rounded-lg border border-amber-200 p-2 text-amber-600 hover:bg-amber-50"
                          title="Sửa"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(item)}
                          className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                          title="Xóa"
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

        <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Hiển thị{" "}
            <b>
              {startItem}-{endItem}
            </b>{" "}
            trên <b>{filteredEvents.length}</b> {rowLabel}
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
              disabled={page <= 1}
              onClick={() => setPage((previous) => Math.max(previous - 1, 1))}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>

            <span className="min-w-24 text-center text-sm">
              Trang {page}/{totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((previous) => Math.min(previous + 1, totalPages))
              }
              className="rounded-lg border border-slate-200 p-2 text-slate-600 disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
      {transferEvent && transferDetail && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {transferMode === "TO_SEMINAR"
                    ? "Chuyển sang Hội thảo"
                    : "Chuyển sang Triển lãm"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Kiểm tra dữ liệu trước khi chuyển loại.
                </p>
              </div>

              <button
                type="button"
                disabled={transferLoading}
                onClick={() => {
                  setTransferEvent(null);
                  setTransferDetail(null);
                  setTransferMode("");
                  setTransferParentId("");
                }}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={22} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Sự kiện
                </p>

                <p className="mt-2 font-bold text-slate-900">
                  {transferEvent.event_name}
                </p>
              </div>

              {transferMode === "TO_SEMINAR" && (
                <>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-700">
                      Hội thảo đang trực thuộc
                    </p>

                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {transferDetail.child_seminars?.length || 0}
                    </p>
                  </div>

                  {transferDetail.child_seminars?.length === 0 && (
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Hội thảo mới thuộc Triển lãm nào?
                      </label>

                      <select
                        value={transferParentId}
                        onChange={(event) =>
                          setTransferParentId(event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      >
                        <option value="">Hội thảo độc lập</option>

                        {exhibitions
                          .filter(
                            (exhibition) =>
                              Number(exhibition.id) !==
                              Number(transferEvent.id),
                          )
                          .map((exhibition) => (
                            <option key={exhibition.id} value={exhibition.id}>
                              {exhibition.event_name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {transferDetail.child_seminars?.length === 1 && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-700">
                      Triển lãm này đã có một Hội thảo trực thuộc. Hệ thống sẽ{" "}
                      <b>không tạo Hội thảo mới</b>. Hội thảo hiện có sẽ được
                      tách ra thành Hội thảo độc lập và giữ nguyên người tham
                      dự.
                    </div>
                  )}

                  {transferDetail.child_seminars?.length > 1 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-700">
                      Triển lãm đang có nhiều Hội thảo trực thuộc. Hệ thống sẽ
                      không tự động chuyển để tránh làm sai dữ liệu.
                    </div>
                  )}
                </>
              )}

              {transferMode === "TO_EXHIBITION" && (
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm leading-6 text-violet-700">
                  Hội thảo sẽ trở thành Triển lãm và không còn thuộc Triển lãm
                  cha hiện tại.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
              <button
                type="button"
                disabled={transferLoading}
                onClick={() => {
                  setTransferEvent(null);
                  setTransferDetail(null);
                  setTransferMode("");
                  setTransferParentId("");
                }}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
              >
                Hủy
              </button>

              <button
                type="button"
                disabled={
                  transferLoading ||
                  (transferMode === "TO_SEMINAR" &&
                    (transferDetail.child_seminars?.length || 0) > 1)
                }
                onClick={handleTransferEventType}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {transferLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ArrowRightLeft size={18} />
                )}
                Xác nhận chuyển
              </button>
            </div>
          </div>
        </div>
      )}
      {showEventModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingEventId ? `Cập nhật ${rowLabel}` : createButtonLabel}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{pageDescription}</p>
              </div>
              <button
                type="button"
                onClick={closeEventModal}
                disabled={saving}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-6 p-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Loại
                  </label>
                  <div className="flex min-h-[46px] items-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                    {isExhibition ? "Triển lãm" : "Hội thảo"}
                  </div>
                </div>

                <FormInput
                  label={`Mã ${rowLabel}`}
                  value={eventForm.event_code}
                  onChange={(value) => updateEventField("event_code", value)}
                  placeholder={
                    isExhibition ? "VD: SCD-EX-2026" : "VD: SCD-HT-01"
                  }
                />

                <div className="md:col-span-2">
                  <FormInput
                    label={`Tên ${rowLabel}`}
                    required
                    value={eventForm.event_name}
                    onChange={(value) => updateEventField("event_name", value)}
                    placeholder={
                      isExhibition
                        ? "VD: SMART GREEN LIVING 2026"
                        : "VD: HỘI THẢO GIẢI PHÁP SỐNG XANH"
                    }
                  />
                </div>

                {!isExhibition && (
                  <div className="md:col-span-2">
                    <FormSelect
                      label="Thuộc triển lãm"
                      value={eventForm.parent_event_id}
                      onChange={(value) =>
                        updateEventField("parent_event_id", value)
                      }
                    >
                      <option value="">
                        Hội thảo độc lập / Không thuộc triển lãm
                      </option>
                      {exhibitions.map((exhibition) => (
                        <option key={exhibition.id} value={exhibition.id}>
                          {exhibition.event_name}
                        </option>
                      ))}
                    </FormSelect>
                  </div>
                )}

                <div className="md:col-span-2">
                  <FormInput
                    label="Địa điểm"
                    value={eventForm.location}
                    onChange={(value) => updateEventField("location", value)}
                    placeholder="VD: SIHUB - TP.HCM"
                  />
                </div>

                <FormDateTime
                  label="Thời gian bắt đầu"
                  value={eventForm.start_datetime}
                  onChange={(value) =>
                    updateEventField("start_datetime", value)
                  }
                />
                <FormDateTime
                  label="Thời gian kết thúc"
                  value={eventForm.end_datetime}
                  onChange={(value) => updateEventField("end_datetime", value)}
                />
                <FormInput
                  label="Năm"
                  type="number"
                  min="2000"
                  value={eventForm.year}
                  onChange={(value) => updateEventField("year", value)}
                />
                <FormInput
                  label="Đơn vị tổ chức"
                  value={eventForm.organizer}
                  onChange={(value) => updateEventField("organizer", value)}
                  placeholder="SIHUB"
                />

                <FormInput
                  label="Số người tối đa"
                  type="number"
                  min="0"
                  value={eventForm.max_participants}
                  onChange={(value) =>
                    updateEventField("max_participants", value)
                  }
                />
                <FormSelect
                  label="Trạng thái"
                  value={eventForm.status}
                  onChange={(value) => updateEventField("status", value)}
                >
                  <option value="OPEN">Đang mở</option>
                  <option value="CLOSED">Đã đóng</option>
                  <option value="FINISHED">Đã kết thúc</option>
                  <option value="DRAFT">Bản nháp</option>
                </FormSelect>
              </div>

              <FormInput
                label="Mô tả ngắn"
                value={eventForm.short_description}
                onChange={(value) =>
                  updateEventField("short_description", value)
                }
                placeholder={`Mô tả ngắn về ${rowLabel}...`}
              />
              <FormTextarea
                label="Mô tả chi tiết"
                value={eventForm.description}
                onChange={(value) => updateEventField("description", value)}
                placeholder={`Thông tin chi tiết về ${rowLabel}...`}
              />
              <FormTextarea
                label="Nhiệm vụ"
                value={eventForm.mission}
                onChange={(value) => updateEventField("mission", value)}
                placeholder={
                  isExhibition
                    ? "VD: Trưng bày giải pháp, kết nối doanh nghiệp, nhà đầu tư và hệ sinh thái..."
                    : "VD: Cập nhật kiến thức, kết nối chuyên gia và thúc đẩy hợp tác..."
                }
              />
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Ảnh sự kiện
                </label>

                <label
                  className={`
      flex cursor-pointer flex-col items-center justify-center
      rounded-2xl border-2 border-dashed border-slate-200
      bg-slate-50 px-6 py-8
      transition hover:border-green-300 hover:bg-green-50/40
      ${imageUploading ? "pointer-events-none opacity-60" : ""}
    `}
                >
                  {imageUploading ? (
                    <>
                      <Loader2
                        size={28}
                        className="animate-spin text-green-600"
                      />

                      <p className="mt-3 text-sm font-semibold text-slate-700">
                        Đang tải ảnh...
                      </p>
                    </>
                  ) : (
                    <>
                      <Plus size={28} className="text-green-600" />

                      <p className="mt-3 text-sm font-semibold text-slate-700">
                        Chọn ảnh từ máy
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        JPG, PNG, WEBP · tối đa 5MB
                      </p>
                    </>
                  )}

                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.jfif,image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={imageUploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];

                      handleUploadEventImage(file);

                      event.target.value = "";
                    }}
                  />
                </label>

                {eventForm.thumbnail && (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <img
                      src={
                        eventForm.thumbnail.startsWith("http")
                          ? eventForm.thumbnail
                          : `${SERVER_URL}${eventForm.thumbnail}`
                      }
                      alt="Ảnh sự kiện"
                      className="h-52 w-full object-cover"
                    />

                    <div className="flex items-center justify-between gap-4 px-4 py-3">
                      <p className="min-w-0 truncate text-xs text-slate-500">
                        {eventForm.thumbnail}
                      </p>

                      <button
                        type="button"
                        onClick={() => updateEventField("thumbnail", "")}
                        className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Xóa ảnh
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={closeEventModal}
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
                  ) : editingEventId ? (
                    <Pencil size={18} />
                  ) : (
                    <Plus size={18} />
                  )}
                  {saving
                    ? "Đang lưu..."
                    : editingEventId
                      ? "Lưu thay đổi"
                      : createButtonLabel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-slate-50 shadow-2xl">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Chi tiết{" "}
                  {selectedEvent.event_type === "EXHIBITION"
                    ? "Triển lãm"
                    : "Hội thảo"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedEvent.event_type === "EXHIBITION"
                    ? "Thông tin chi tiết và danh sách phản hồi khảo sát."
                    : "Thông tin chi tiết và danh sách người tham dự."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedEvent(null);
                  setSelectedParticipantDetail(null);
                  setSelectedSurvey(null);
                  setChildSeminars([]);
                  setExhibitionSurveys([]);
                }}
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
                  Đang tải chi tiết...
                </p>
              </div>
            ) : (
              <div className="space-y-6 p-6">
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="grid lg:grid-cols-[320px_1fr]">
                    <div className="min-h-[250px] bg-slate-100">
                      {selectedEvent.thumbnail ? (
                        <img
                          src={
                            selectedEvent.thumbnail.startsWith("http")
                              ? selectedEvent.thumbnail
                              : `${SERVER_URL}${selectedEvent.thumbnail}`
                          }
                          alt={selectedEvent.event_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full min-h-[250px] items-center justify-center text-sm text-slate-400">
                          Chưa có ảnh
                        </div>
                      )}
                    </div>

                    <div className="p-6">
                      <div className="flex flex-wrap items-center gap-2">
                        <EventTypeBadge type={selectedEvent.event_type} />
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                            selectedEvent.status,
                          )}`}
                        >
                          {getStatusLabel(selectedEvent.status)}
                        </span>
                      </div>

                      <h3 className="mt-3 text-2xl font-bold text-slate-900">
                        {selectedEvent.event_name}
                      </h3>
                      <p className="mt-2 text-sm text-slate-500">
                        {selectedEvent.event_code || "Chưa có mã"}
                      </p>

                      <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        {selectedEvent.event_type === "SEMINAR" && (
                          <DetailItem
                            label="Thuộc triển lãm"
                            value={
                              selectedEvent.parent_event_name ||
                              "Hội thảo độc lập"
                            }
                          />
                        )}
                        <DetailItem
                          label="Đơn vị tổ chức"
                          value={selectedEvent.organizer}
                        />
                        <DetailItem
                          label="Số hội thảo trực thuộc"
                          value={`${childSeminars.length} hội thảo`}
                        />

                        <DetailItem
                          label="Thời gian bắt đầu"
                          value={formatDateTime(selectedEvent.start_datetime)}
                        />
                        <DetailItem
                          label="Thời gian kết thúc"
                          value={formatDateTime(selectedEvent.end_datetime)}
                        />
                        <DetailItem
                          label="Địa điểm"
                          value={selectedEvent.location}
                        />
                        <DetailItem
                          label={
                            selectedEvent.event_type === "EXHIBITION"
                              ? "Phản hồi khảo sát"
                              : "Người tham dự"
                          }
                          value={
                            selectedEvent.event_type === "EXHIBITION"
                              ? `${exhibitionSurveys.length} phản hồi`
                              : `${Number(selectedEvent.total_participants || 0)}${
                                  Number(selectedEvent.max_participants || 0) >
                                  0
                                    ? `/${selectedEvent.max_participants}`
                                    : ""
                                } người`
                          }
                        />
                      </div>

                      {selectedEvent.description && (
                        <div className="mt-5 rounded-xl bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Mô tả chi tiết
                          </p>
                          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                            {selectedEvent.description}
                          </p>
                        </div>
                      )}
                      {selectedEvent.mission && (
                        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                            Nhiệm vụ
                          </p>

                          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                            {selectedEvent.mission}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {selectedEvent.event_type === "EXHIBITION" && (
                  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900">
                      Hội thảo thuộc triển lãm
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {childSeminars.length} hội thảo đang thuộc triển lãm này.
                    </p>

                    {childSeminars.length === 0 ? (
                      <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center">
                        <p className="font-medium text-slate-700">
                          Chưa có hội thảo
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Triển lãm chưa có hội thảo trực thuộc.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-5 space-y-3">
                        {childSeminars.map((seminar) => (
                          <div
                            key={seminar.id}
                            className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="font-semibold text-slate-900">
                                {seminar.event_name}
                              </p>

                              <p className="mt-1 text-sm text-slate-500">
                                {formatDateTime(seminar.start_datetime)}
                              </p>

                              <p className="mt-1 text-sm text-slate-500">
                                {seminar.location || "Chưa cập nhật địa điểm"}
                              </p>

                              <p className="mt-1 text-xs text-slate-400">
                                {Number(seminar.total_participants || 0)} người
                                tham dự
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleViewEvent(seminar)}
                              className="self-start rounded-lg border border-blue-200 p-2 text-blue-600 hover:bg-blue-50 sm:self-auto"
                              title="Xem chi tiết hội thảo"
                            >
                              <Eye size={17} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}
                {selectedEvent.event_type === "EXHIBITION" && (
                  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          Khảo sát triển lãm
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {exhibitionSurveys.length} phản hồi khảo sát.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleExportExhibitionSurvey}
                        disabled={
                          surveyExporting || exhibitionSurveys.length === 0
                        }
                        className="flex items-center justify-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {surveyExporting ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <FileSpreadsheet size={18} />
                        )}

                        {surveyExporting
                          ? "Đang xuất..."
                          : "Xuất Excel khảo sát"}
                      </button>
                    </div>

                    {exhibitionSurveys.length === 0 ? (
                      <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center">
                        <FileSpreadsheet
                          size={30}
                          className="mx-auto text-slate-300"
                        />

                        <p className="mt-3 font-medium text-slate-700">
                          Chưa có phản hồi khảo sát
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Chưa có đơn vị gửi khảo sát cho triển lãm này.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[1350px]">
                            <thead className="bg-slate-50">
                              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                <th className="px-4 py-3">Người phản hồi</th>

                                <th className="px-4 py-3">Đơn vị</th>

                                <th className="px-4 py-3">Lĩnh vực</th>

                                <th className="px-4 py-3">Giai đoạn</th>

                                <th className="px-4 py-3">Nhân sự</th>

                                <th className="px-4 py-3">NQ20</th>

                                <th className="px-4 py-3 text-center">
                                  Khách ghé
                                </th>

                                <th className="px-4 py-3 text-center">B2B</th>

                                <th className="px-4 py-3 text-center">MOU</th>

                                <th className="px-4 py-3">Doanh thu</th>
                                <th className="px-4 py-3">Thời gian gửi</th>
                                <th className="px-4 py-3 text-right">
                                  Thao tác
                                </th>
                              </tr>
                            </thead>

                            <tbody>
                              {exhibitionSurveys.map((survey) => (
                                <tr
                                  key={survey.id}
                                  className="border-t border-slate-100 text-sm"
                                >
                                  <td className="px-4 py-4">
                                    <p className="font-semibold text-slate-900">
                                      {survey.fullname || "—"}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                      {survey.email || "—"}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-400">
                                      {survey.phone || "—"}
                                    </p>
                                  </td>

                                  <td className="px-4 py-4 text-slate-600">
                                    {survey.organization || "—"}
                                  </td>

                                  <td className="px-4 py-4 text-slate-600">
                                    {getProjectFieldLabel(
                                      survey.project_field,
                                      survey.project_field_other,
                                    )}
                                  </td>

                                  <td className="px-4 py-4 text-slate-600">
                                    {getStartupStageLabel(survey.startup_stage)}
                                  </td>

                                  <td className="px-4 py-4 text-slate-600">
                                    {survey.team_size || "—"}
                                  </td>

                                  <td className="px-4 py-4 text-slate-600">
                                    {getProgramSelectionLabel(
                                      survey.program_selection_status,
                                    )}
                                  </td>

                                  <td className="px-4 py-4 text-center font-semibold text-slate-700">
                                    {Number(survey.visitor_count || 0)}
                                  </td>

                                  <td className="px-4 py-4 text-center font-semibold text-slate-700">
                                    {Number(survey.b2b_matching_count || 0)}
                                  </td>

                                  <td className="px-4 py-4 text-center text-slate-700">
                                    {survey.mou_count ?? "—"}
                                  </td>

                                  <td className="px-4 py-4 font-medium text-slate-700">
                                    {survey.exhibition_revenue
                                      ? `${Number(
                                          survey.exhibition_revenue,
                                        ).toLocaleString("vi-VN")} đ`
                                      : "—"}
                                  </td>
                                  <td className="px-4 py-4 text-slate-500">
                                    {formatDateTime(survey.created_at)}
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="flex justify-end">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setSelectedSurvey(survey)
                                        }
                                        className="rounded-lg border border-blue-200 p-2 text-blue-600 hover:bg-blue-50"
                                        title="Xem chi tiết khảo sát"
                                      >
                                        <Eye size={17} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </section>
                )}
                {selectedEvent.event_type !== "EXHIBITION" && (
                  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          Người tham dự
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {selectedEvent.participants?.length || 0} người đang
                          tham dự.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={openParticipantModal}
                        className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
                      >
                        <UserPlus size={18} />
                        Thêm người tham dự
                      </button>
                      <div className="mt-5">
                        <div className="relative">
                          <Search
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                          />

                          <input
                            type="text"
                            value={participantListSearch}
                            onChange={(event) =>
                              setParticipantListSearch(event.target.value)
                            }
                            placeholder="Tìm họ tên, email, số điện thoại, đơn vị..."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-11 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-100"
                          />

                          {participantListSearch && (
                            <button
                              type="button"
                              onClick={() => setParticipantListSearch("")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                              title="Xóa tìm kiếm"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>

                        {participantListSearch && (
                          <p className="mt-2 text-xs text-slate-500">
                            Tìm thấy{" "}
                            <span className="font-semibold text-green-600">
                              {filteredParticipants.length}
                            </span>{" "}
                            / {selectedEvent.participants?.length || 0} người
                            tham dự
                          </p>
                        )}
                      </div>
                    </div>

                    {!selectedEvent.participants?.length ? (
                      <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center">
                        <Users size={30} className="mx-auto text-slate-300" />

                        <p className="mt-3 font-medium text-slate-700">
                          Chưa có người tham dự
                        </p>
                      </div>
                    ) : filteredParticipants.length === 0 ? (
                      <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
                        <Search size={30} className="mx-auto text-slate-300" />

                        <p className="mt-3 font-semibold text-slate-700">
                          Không tìm thấy người tham dự
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Thử tìm bằng họ tên, email, số điện thoại hoặc đơn vị
                          khác.
                        </p>

                        <button
                          type="button"
                          onClick={() => setParticipantListSearch("")}
                          className="mt-4 text-sm font-semibold text-green-600 hover:text-green-700"
                        >
                          Xóa tìm kiếm
                        </button>
                      </div>
                    ) : (
                      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[900px]">
                            <thead className="bg-slate-50">
                              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                <th className="px-4 py-3">Người tham dự</th>
                                <th className="px-4 py-3">Liên hệ</th>
                                <th className="px-4 py-3">Đơn vị</th>
                                <th className="px-4 py-3">Vai trò</th>
                                <th className="px-4 py-3">Trạng thái</th>
                                <th className="px-4 py-3 text-right">
                                  Thao tác
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredParticipants.map((participant) => (
                                <tr
                                  key={participant.id}
                                  className="border-t border-slate-100 text-sm"
                                >
                                  <td className="px-4 py-4">
                                    <p className="font-semibold text-slate-900">
                                      {participant.fullname}
                                    </p>
                                  </td>
                                  <td className="px-4 py-4">
                                    <p className="text-slate-700">
                                      {participant.email || "—"}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {participant.phone || "—"}
                                    </p>
                                  </td>
                                  <td className="px-4 py-4 text-slate-600">
                                    {participant.organization ||
                                      participant.company ||
                                      "—"}
                                  </td>
                                  <td className="px-4 py-4 text-slate-600">
                                    {participant.participant_role || "—"}
                                  </td>
                                  <td className="px-4 py-4">
                                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                                      {participant.registration_status ===
                                      "CONFIRMED"
                                        ? "Đã xác nhận"
                                        : participant.registration_status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="flex justify-end gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setSelectedParticipantDetail(
                                            participant,
                                          )
                                        }
                                        className="rounded-lg border border-blue-200 p-2 text-blue-600 hover:bg-blue-50"
                                        title="Xem chi tiết người tham dự"
                                      >
                                        <Eye size={17} />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDeleteParticipant(participant)
                                        }
                                        className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                                        title="Xóa người tham dự"
                                      >
                                        <Trash2 size={17} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </section>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {selectedSurvey && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-slate-50 shadow-2xl">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Chi tiết khảo sát triển lãm
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Phản hồi #{selectedSurvey.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSurvey(null)}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={22} />
              </button>
            </div>

            <div className="space-y-6 p-6">
              {/* 1 */}
              <SurveySection title="1. Thông tin người đại diện / đơn vị">
                <SurveyItem label="Họ và tên" value={selectedSurvey.fullname} />

                <SurveyItem label="Chức vụ" value={selectedSurvey.position} />

                <SurveyItem
                  label="Đơn vị công tác"
                  value={selectedSurvey.organization}
                />

                <SurveyItem
                  label="Số điện thoại"
                  value={selectedSurvey.phone}
                />

                <SurveyItem label="Email" value={selectedSurvey.email} />
              </SurveySection>

              {/* 2 */}
              <SurveySection title="2. Thông tin người tham gia">
                <SurveyItem
                  label="Giới tính"
                  value={getGenderLabel(selectedSurvey.gender)}
                />

                <SurveyItem
                  label="Có nữ Founder / Co-Founder"
                  value={getFemaleFounderLabel(selectedSurvey.female_founder)}
                />

                <SurveyItem
                  label="Nhóm tuổi"
                  value={getAgeGroupLabel(selectedSurvey.age_group)}
                />

                <SurveyItem
                  label="Nhóm đối tượng"
                  value={getUserTypeLabel(selectedSurvey.user_type)}
                />
              </SurveySection>

              {/* 3 */}
              <SurveySection title="3. Dự án / sản phẩm">
                <SurveyItem
                  label="Lĩnh vực"
                  value={getProjectFieldLabel(
                    selectedSurvey.project_field,
                    selectedSurvey.project_field_other,
                  )}
                />

                <SurveyItem
                  label="Giai đoạn Startup / Dự án"
                  value={getStartupStageLabel(selectedSurvey.startup_stage)}
                />
                <SurveyItem label="Nhân sự" value={selectedSurvey.team_size} />

                <SurveyItem
                  label="NQ20"
                  value={getProgramSelectionLabel(
                    selectedSurvey.program_selection_status,
                  )}
                />

                <SurveyItem
                  label="Tên sản phẩm trưng bày"
                  value={selectedSurvey.exhibition_product_name}
                />

                <SurveyItem
                  label="Số sản phẩm trưng bày"
                  value={selectedSurvey.exhibition_product_quantity}
                />
              </SurveySection>

              {/* 4 */}
              <SurveySection title="4. Nhu cầu kết nối">
                <SurveyLongItem
                  label="Mong muốn gặp gỡ doanh nghiệp"
                  value={selectedSurvey.networking_expectation}
                />

                <SurveyLongItem
                  label="Yêu cầu kết nối đặc biệt"
                  value={selectedSurvey.special_connection_request}
                />

                <SurveyLongItem
                  label="Câu hỏi dành cho Ban tổ chức"
                  value={selectedSurvey.organizer_question}
                />
              </SurveySection>

              {/* 5 */}
              <SurveySection title="5. Kết quả triển lãm">
                <SurveyItem
                  label="Sản phẩm đã bán / đặt hàng"
                  value={selectedSurvey.sold_or_ordered_quantity}
                />

                <SurveyItem
                  label="Khách ghé gian hàng"
                  value={selectedSurvey.visitor_count}
                />

                <SurveyItem
                  label="B2B Matching"
                  value={selectedSurvey.b2b_matching_count}
                />

                <SurveyItem
                  label="Kết nối khu vực công"
                  value={selectedSurvey.public_sector_connection_count}
                />

                <SurveyItem label="Số MOU" value={selectedSurvey.mou_count} />

                <SurveyItem
                  label="Doanh thu triển lãm"
                  value={
                    selectedSurvey.exhibition_revenue
                      ? `${Number(
                          selectedSurvey.exhibition_revenue,
                        ).toLocaleString("vi-VN")} đ`
                      : "—"
                  }
                />
              </SurveySection>

              {/* 6 */}
              <SurveySection title="6. Đánh giá chương trình">
                <SurveyLongItem
                  label="Điểm đặc biệt ấn tượng"
                  value={selectedSurvey.highlight_impression}
                />

                <SurveyItem
                  label="Muốn tiếp tục tham gia sự kiện tương tự"
                  value={getJoinAgainLabel(selectedSurvey.want_to_join_again)}
                />

                <SurveyLongItem
                  label="Góp ý cho Ban tổ chức"
                  value={selectedSurvey.organizer_feedback}
                />

                <SurveyLongItem
                  label="Chia sẻ khác"
                  value={selectedSurvey.other_sharing}
                />

                <SurveyItem
                  label="Thời gian gửi khảo sát"
                  value={formatDateTime(selectedSurvey.created_at)}
                />
              </SurveySection>
            </div>
          </div>
        </div>
      )}
      {selectedParticipantDetail && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-slate-50 shadow-2xl">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Chi tiết người tham dự
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Thông tin đăng ký tham gia hội thảo.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedParticipantDetail(null)}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={22} />
              </button>
            </div>

            <div className="space-y-6 p-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-5 text-lg font-bold text-slate-900">
                  Thông tin cá nhân
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <DetailItem
                    label="Họ và tên"
                    value={selectedParticipantDetail.fullname}
                  />

                  <DetailItem
                    label="Email"
                    value={selectedParticipantDetail.email}
                  />

                  <DetailItem
                    label="Điện thoại"
                    value={selectedParticipantDetail.phone}
                  />

                  <DetailItem
                    label="Giới tính"
                    value={getGenderLabel(selectedParticipantDetail.gender)}
                  />

                  <DetailItem
                    label="Nhóm tuổi"
                    value={selectedParticipantDetail.age_group}
                  />

                  <DetailItem
                    label="Nhóm đối tượng"
                    value={getUserTypeLabel(
                      selectedParticipantDetail.user_type,
                    )}
                  />

                  <DetailItem
                    label="Đơn vị"
                    value={
                      selectedParticipantDetail.organization ||
                      selectedParticipantDetail.company
                    }
                  />

                  <DetailItem
                    label="Chức vụ"
                    value={
                      selectedParticipantDetail.position ||
                      selectedParticipantDetail.user_position
                    }
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-5 text-lg font-bold text-slate-900">
                  Thông tin dự án
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <DetailItem
                    label="Có dự án"
                    value={
                      selectedParticipantDetail.has_project === 1 ||
                      selectedParticipantDetail.has_project === true
                        ? "Có"
                        : selectedParticipantDetail.has_project === 0
                          ? "Không"
                          : "—"
                    }
                  />

                  <DetailItem
                    label="Lĩnh vực dự án"
                    value={selectedParticipantDetail.project_field}
                  />

                  <DetailItem
                    label="Giai đoạn Startup"
                    value={selectedParticipantDetail.startup_stage}
                  />

                  <DetailItem
                    label="NQ20"
                    value={getProgramSelectionLabel(
                      selectedParticipantDetail.program_selection_status,
                    )}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-5 text-lg font-bold text-slate-900">
                  Nhu cầu và câu hỏi
                </h3>

                <div className="space-y-4">
                  <LongDetailItem
                    label="Nhu cầu hỗ trợ"
                    value={selectedParticipantDetail.support_needs}
                  />

                  <LongDetailItem
                    label="Câu hỏi dành cho Ban tổ chức"
                    value={selectedParticipantDetail.organizer_question}
                  />

                  <LongDetailItem
                    label="Ghi chú"
                    value={selectedParticipantDetail.note}
                  />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-5 text-lg font-bold text-slate-900">
                  Thông tin đăng ký
                </h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <DetailItem
                    label="Vai trò"
                    value={selectedParticipantDetail.participant_role}
                  />

                  <DetailItem
                    label="Trạng thái"
                    value={
                      selectedParticipantDetail.registration_status ===
                      "CONFIRMED"
                        ? "Đã xác nhận"
                        : selectedParticipantDetail.registration_status
                    }
                  />

                  <DetailItem
                    label="Check-in"
                    value={
                      Number(selectedParticipantDetail.checked_in || 0) === 1
                        ? "Đã check-in"
                        : "Chưa check-in"
                    }
                  />

                  <DetailItem
                    label="Ngày đăng ký"
                    value={formatDateTime(selectedParticipantDetail.created_at)}
                  />
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
      {/* =========================================
    TOOL TẠM: CHUYỂN NETWORKING EVENT -> SEMINAR
    Chuyển dữ liệu xong có thể comment/xóa block này
========================================= */}

      {showParticipantModal && selectedEvent && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Thêm người tham dự
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedEvent.event_name}
                </p>
              </div>
              <button
                type="button"
                onClick={closeParticipantModal}
                disabled={participantSaving}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleAddParticipant} className="space-y-5 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Tìm người tham dự
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={participantForm.search_text}
                    onChange={(event) =>
                      handleParticipantSearch(event.target.value)
                    }
                    placeholder="Nhập họ tên, email hoặc số điện thoại..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
                  />
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  Nhập ít nhất 2 ký tự để tìm người đã có trong hệ thống.
                </p>

                {participantSearchLoading && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 size={16} className="animate-spin" />
                    Đang tìm...
                  </div>
                )}

                {!participantSearchLoading &&
                  participantForm.search_text.trim().length >= 2 &&
                  participantUsers.length === 0 &&
                  !selectedParticipantUser && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-sm font-semibold text-slate-700">
                        Không tìm thấy người phù hợp
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Thử tìm bằng họ tên, email hoặc số điện thoại khác.
                      </p>
                    </div>
                  )}

                {!participantSearchLoading &&
                  participantUsers.length > 0 &&
                  !selectedParticipantUser && (
                    <div className="mt-3 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                      {participantUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setSelectedParticipantUser(user);
                            updateParticipantField("user_id", String(user.id));
                            updateParticipantField(
                              "search_text",
                              user.fullname || "",
                            );
                            updateParticipantField(
                              "organization",
                              user.company || "",
                            );
                            updateParticipantField(
                              "position",
                              user.position || "",
                            );
                            setParticipantUsers([]);
                          }}
                          className="flex w-full items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-green-50"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900">
                              {user.fullname || "Chưa có họ tên"}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {user.email || "Chưa có email"}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {user.phone || "Chưa có SĐT"}
                            </p>
                            {user.company && (
                              <p className="mt-1 text-xs text-slate-400">
                                {user.company}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                            Chọn
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                {selectedParticipantUser && (
                  <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
                          Người tham dự đã chọn
                        </p>
                        <p className="mt-2 font-bold text-slate-900">
                          {selectedParticipantUser.fullname}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {selectedParticipantUser.email || "Chưa có email"}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {selectedParticipantUser.phone || "Chưa có SĐT"}
                        </p>
                        {selectedParticipantUser.company && (
                          <p className="mt-1 text-sm text-slate-500">
                            {selectedParticipantUser.company}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedParticipantUser(null);
                          updateParticipantField("user_id", "");
                          updateParticipantField("search_text", "");
                        }}
                        className="rounded-lg border border-green-200 bg-white px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-100"
                      >
                        Chọn lại
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <FormInput
                  label="Vai trò"
                  value={participantForm.participant_role}
                  onChange={(value) =>
                    updateParticipantField("participant_role", value)
                  }
                  placeholder="Khách tham dự"
                />
                <FormSelect
                  label="Trạng thái"
                  value={participantForm.registration_status}
                  onChange={(value) =>
                    updateParticipantField("registration_status", value)
                  }
                >
                  <option value="CONFIRMED">Đã xác nhận</option>
                  <option value="PENDING">Chờ xác nhận</option>
                  <option value="CANCELLED">Đã hủy</option>
                </FormSelect>
                <FormInput
                  label="Đơn vị"
                  value={participantForm.organization}
                  onChange={(value) =>
                    updateParticipantField("organization", value)
                  }
                />
                <FormInput
                  label="Chức vụ"
                  value={participantForm.position}
                  onChange={(value) =>
                    updateParticipantField("position", value)
                  }
                />
              </div>

              <FormTextarea
                label="Ghi chú"
                value={participantForm.note}
                onChange={(value) => updateParticipantField("note", value)}
              />

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={closeParticipantModal}
                  disabled={participantSaving}
                  className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={participantSaving}
                  className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                >
                  {participantSaving ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <UserPlus size={18} />
                  )}
                  {participantSaving ? "Đang thêm..." : "Thêm người tham dự"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <EventStatisticsCharts
        open={showCharts}
        onClose={() => setShowCharts(false)}
        loading={chartLoading}
        statistics={statistics}
      />
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

function EventTypeBadge({ type }) {
  if (type === "EXHIBITION") {
    return (
      <span className="inline-flex whitespace-nowrap rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
        Triển lãm
      </span>
    );
  }

  return (
    <span className="inline-flex whitespace-nowrap rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
      Hội thảo
    </span>
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
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
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
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
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
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100"
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
          required={required}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm outline-none transition focus:border-green-500 focus:ring-4 focus:ring-green-100 disabled:cursor-not-allowed disabled:bg-slate-100"
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
function LongDetailItem({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
        {value === null || value === undefined || value === "" ? "—" : value}
      </p>
    </div>
  );
}
function SurveySection({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-5 text-lg font-bold text-slate-900">{title}</h3>

      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function SurveyItem({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-line text-sm font-semibold text-slate-800">
        {value === null || value === undefined || value === "" ? "—" : value}
      </p>
    </div>
  );
}

function SurveyLongItem({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 md:col-span-2">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
        {value === null || value === undefined || value === "" ? "—" : value}
      </p>
    </div>
  );
}
