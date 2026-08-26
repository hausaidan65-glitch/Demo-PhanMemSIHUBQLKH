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
  BarChart3,
  Users,
  Download,
  ArrowRightLeft,
  X,
} from "lucide-react";

// =====================================================
// API
// =====================================================

const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const API_URL = RAW_API_URL.replace(/\/+$/, "").endsWith("/api")
  ? RAW_API_URL.replace(/\/+$/, "")
  : `${RAW_API_URL.replace(/\/+$/, "")}/api`;

const SERVER_URL = API_URL.replace(/\/api$/, "");

// =====================================================
// FORM
// =====================================================

const EMPTY_EVENT_FORM = {
  event_name: "",
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

// =====================================================
// HELPERS
// =====================================================

function toDateTimeLocal(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 16);
  }

  const offset = date.getTimezoneOffset();

  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}
function createEventCode(eventName, year) {
  const normalizedName = String(eventName || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const normalizedYear = Number(year) || new Date().getFullYear();

  if (!normalizedName) {
    return "";
  }

  return `NETWORK-${normalizedName}-${normalizedYear}`;
}
function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusLabel(status) {
  const labels = {
    DRAFT: "Bản nháp",
    OPEN: "Đang mở",
    CLOSED: "Đã đóng",
    FINISHED: "Đã kết thúc",
  };

  return labels[status] || status || "—";
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
function getGenderLabel(value) {
  const labels = {
    MALE: "Nam",
    FEMALE: "Nữ",
    OTHER: "Khác",
  };

  return labels[value] || value || "—";
}

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

function getUserTypeLabel(value) {
  const labels = {
    STARTUP: "Startup/Dự án",
    BUSINESS: "Doanh nghiệp",
    STUDENT: "Sinh viên",
    UNIVERSITY: "Trường đại học / Viện nghiên cứu",
    OTHER: "Khác",
  };

  return labels[value] || value || "—";
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
// =====================================================
// MAIN
// =====================================================

export default function NetworkingEventManagement() {
  const [events, setEvents] = useState([]);

  const [loading, setLoading] = useState(false);
  const [showCharts, setShowCharts] = useState(false);

  const [chartLoading, setChartLoading] = useState(false);

  const [statistics, setStatistics] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // FILTER
  const [keyword, setKeyword] = useState("");

  const [statusFilter, setStatusFilter] = useState("");

  const [yearFilter, setYearFilter] = useState("");

  const [monthFilter, setMonthFilter] = useState("");
  const [missionFilter, setMissionFilter] = useState("");
  const [filterOptions, setFilterOptions] = useState({
    years: [],
  });

  const [exporting, setExporting] = useState(false);
  // PAGINATION
  const [page, setPage] = useState(1);

  const [limit, setLimit] = useState(10);

  // EVENT MODAL
  const [showEventModal, setShowEventModal] = useState(false);

  const [editingEventId, setEditingEventId] = useState(null);

  const [eventForm, setEventForm] = useState({
    ...EMPTY_EVENT_FORM,
  });
  const [transferEvent, setTransferEvent] = useState(null);

  const [transferParentId, setTransferParentId] = useState("");

  const [transferExhibitions, setTransferExhibitions] = useState([]);

  const [transferLoading, setTransferLoading] = useState(false);
  // DETAIL
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedParticipantDetail, setSelectedParticipantDetail] =
    useState(null);
  const [participantListSearch, setParticipantListSearch] = useState("");

  // PARTICIPANT
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

  // AUTH
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
      const response = await axios.get(
        `${API_URL}/networking-events/filter-options`,
        authConfig,
      );

      setFilterOptions({
        years: Array.isArray(response.data?.data?.years)
          ? response.data.data.years
          : [],
      });
    } catch (error) {
      console.error(
        "Lỗi tải bộ lọc sự kiện kết nối:",
        error.response?.data || error,
      );

      setFilterOptions({
        years: [],
      });
    }
  }, [authConfig]);
  // ===================================================
  // FETCH EVENTS
  // ===================================================

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);

      const params = {};

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

      if (keyword.trim()) {
        params.keyword = keyword.trim();
      }

      const response = await axios.get(`${API_URL}/networking-events`, {
        params,
        ...authConfig,
      });

      setEvents(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      console.error("Lỗi tải sự kiện kết nối:", error.response?.data || error);

      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [
    authConfig,
    statusFilter,
    yearFilter,
    monthFilter,
    missionFilter,
    keyword,
  ]);
  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEvents();
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchEvents]);

  // ===================================================
  // FILTER OPTIONS
  // ===================================================

  const availableYears = filterOptions.years || [];
  // ===================================================
  // PAGINATION
  // ===================================================

  const totalPages = Math.max(1, Math.ceil(events.length / limit));

  const paginatedEvents = events.slice((page - 1) * limit, page * limit);

  const startItem = events.length === 0 ? 0 : (page - 1) * limit + 1;

  const endItem = Math.min(page * limit, events.length);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // ===================================================
  // SUMMARY
  // ===================================================

  const totalOpen = events.filter((item) => item.status === "OPEN").length;

  const totalFinished = events.filter(
    (item) => item.status === "FINISHED",
  ).length;

  const totalParticipants = events.reduce(
    (sum, item) => sum + Number(item.total_participants || 0),
    0,
  );

  // ===================================================
  // RESET FILTER
  // ===================================================
  const handleResetFilters = () => {
    setKeyword("");
    setStatusFilter("");
    setYearFilter("");
    setMonthFilter("");

    setMissionFilter("");

    setPage(1);
  };
  const fetchStatistics = async () => {
    try {
      setChartLoading(true);

      const params = {};

      if (keyword.trim()) {
        params.keyword = keyword.trim();
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

      const response = await axios.get(
        `${API_URL}/networking-events/statistics`,
        {
          ...authConfig,
          params,
        },
      );

      setStatistics(response.data?.data || null);

      setShowCharts(true);
    } catch (error) {
      console.error(
        "Lỗi tải biểu đồ sự kiện kết nối:",
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

      const params = {};

      if (keyword.trim()) {
        params.keyword = keyword.trim();
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
      const response = await axios.get(`${API_URL}/networking-events/export`, {
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

      link.download = `su-kien-ket-noi-${new Date().toISOString().slice(0, 10)}.xlsx`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Xuất Excel sự kiện kết nối lỗi:", error);

      let message = "Không thể xuất Excel sự kiện kết nối.";

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
        // Giữ message mặc định
      }

      alert(message);
    } finally {
      setExporting(false);
    }
  };

  // ===================================================
  // EVENT FORM
  // ===================================================

  const resetEventForm = () => {
    setEventForm({
      ...EMPTY_EVENT_FORM,
      year: new Date().getFullYear(),
    });
  };

  const openCreateEventModal = () => {
    setEditingEventId(null);
    resetEventForm();
    setShowEventModal(true);
  };

  const closeEventModal = () => {
    if (saving) return;

    setShowEventModal(false);
    setEditingEventId(null);
    resetEventForm();
  };

  const updateEventField = (name, value) => {
    setEventForm((previous) => {
      const next = {
        ...previous,
        [name]: value,
      };

      // ============================================
      // TỰ SINH MÃ KHI ĐANG TẠO MỚI
      //
      // Khi sửa sự kiện cũ thì không tự ghi đè mã.
      // ============================================
      if (!editingEventId) {
        if (name === "event_name") {
          next.event_code = createEventCode(value, next.year);
        }

        if (name === "year") {
          next.event_code = createEventCode(next.event_name, value);
        }
      }

      return next;
    });
  };

  // ===================================================
  // EDIT
  // ===================================================

  const openEditEventModal = async (item) => {
    try {
      setSaving(true);

      const response = await axios.get(
        `${API_URL}/networking-events/${item.id}`,
        authConfig,
      );

      const data = response.data?.data || item;

      setEditingEventId(item.id);

      setEventForm({
        event_name: data.event_name || "",

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
      alert(error.response?.data?.message || "Không thể tải dữ liệu sự kiện.");
    } finally {
      setSaving(false);
    }
  };

  // ===================================================
  // SAVE
  // ===================================================

  const handleSaveEvent = async (event) => {
    event.preventDefault();

    if (!eventForm.event_name.trim()) {
      alert("Vui lòng nhập tên sự kiện.");

      return;
    }

    if (
      eventForm.start_datetime &&
      eventForm.end_datetime &&
      new Date(eventForm.start_datetime) >= new Date(eventForm.end_datetime)
    ) {
      alert("Thời gian kết thúc phải sau thời gian bắt đầu.");

      return;
    }

    const payload = {
      event_name: eventForm.event_name.trim(),

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

      let response;

      if (editingEventId) {
        response = await axios.put(
          `${API_URL}/networking-events/${editingEventId}`,
          payload,
          authConfig,
        );
      } else {
        response = await axios.post(
          `${API_URL}/networking-events`,
          payload,
          authConfig,
        );
      }

      alert(response.data?.message || "Lưu sự kiện thành công.");

      closeEventModal();

      await fetchEvents();
    } catch (error) {
      alert(error.response?.data?.message || "Không thể lưu sự kiện.");
    } finally {
      setSaving(false);
    }
  };
  const handleUploadEventImage = async (file) => {
    if (!file) {
      return;
    }

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
      console.error("Upload ảnh sự kiện lỗi:", error.response?.data || error);

      alert(error.response?.data?.message || "Không thể tải ảnh lên.");
    } finally {
      setImageUploading(false);
    }
  };
  // ===================================================
  // DELETE EVENT
  // ===================================================

  const handleDeleteEvent = async (item) => {
    const accepted = window.confirm(
      `Xóa "${item.event_name}"?\n\n` +
        "Sự kiện đang có người tham dự sẽ không thể xóa.",
    );

    if (!accepted) return;

    try {
      const response = await axios.delete(
        `${API_URL}/networking-events/${item.id}`,
        authConfig,
      );

      alert(response.data?.message || "Xóa sự kiện thành công.");

      await fetchEvents();
    } catch (error) {
      alert(error.response?.data?.message || "Không thể xóa sự kiện.");
    }
  };

  // ===================================================
  // DETAIL
  // ===================================================

  const handleViewEvent = async (item) => {
    try {
      setDetailLoading(true);
      setParticipantListSearch("");
      setSelectedEvent(item);

      const response = await axios.get(
        `${API_URL}/networking-events/${item.id}`,
        authConfig,
      );

      setSelectedEvent(response.data?.data || item);
    } catch (error) {
      setSelectedEvent(null);

      alert(error.response?.data?.message || "Không thể tải chi tiết.");
    } finally {
      setDetailLoading(false);
    }
  };
  const handleOpenTransfer = async (item) => {
    try {
      setTransferEvent(item);

      setTransferParentId("");

      const response = await axios.get(`${API_URL}/startup-connection/events`, {
        params: {
          type: "EXHIBITION",
        },

        ...authConfig,
      });

      setTransferExhibitions(
        Array.isArray(response.data?.data) ? response.data.data : [],
      );
    } catch (error) {
      console.error(
        "Lỗi tải danh sách triển lãm:",
        error.response?.data || error,
      );

      setTransferEvent(null);

      alert("Không thể tải danh sách triển lãm.");
    }
  };
  const handleTransferToSeminar = async () => {
    if (!transferEvent?.id) {
      return;
    }

    const accepted = window.confirm(
      `Chuyển "${transferEvent.event_name}" sang Hội thảo?\n\n` +
        "Thông tin sự kiện và danh sách người tham dự sẽ được sao chép sang Hội thảo.",
    );

    if (!accepted) {
      return;
    }

    try {
      setTransferLoading(true);

      const response = await axios.post(
        `${API_URL}/startup-connection/events/migrate-networking/${transferEvent.id}`,
        {
          parent_event_id: transferParentId ? Number(transferParentId) : null,

          copy_participants: true,
        },

        authConfig,
      );

      alert(response.data?.message || "Chuyển sang Hội thảo thành công.");

      setTransferEvent(null);

      setTransferParentId("");

      await fetchEvents();
    } catch (error) {
      console.error(
        "Lỗi chuyển Sự kiện kết nối -> Hội thảo:",
        error.response?.data || error,
      );

      alert(error.response?.data?.message || "Không thể chuyển sang Hội thảo.");
    } finally {
      setTransferLoading(false);
    }
  };
  const refreshSelectedEvent = async (eventId) => {
    const response = await axios.get(
      `${API_URL}/networking-events/${eventId}`,
      authConfig,
    );

    setSelectedEvent(response.data?.data || null);
  };

  // ===================================================
  // SEARCH USERS
  // ===================================================

  const searchParticipantUsers = async (searchText) => {
    const search = String(searchText || "").trim();

    if (search.length < 2) {
      setParticipantUsers([]);
      return;
    }

    try {
      setParticipantSearchLoading(true);

      const response = await axios.get(`${API_URL}/users`, {
        params: {
          keyword: search,
          page: 1,
          limit: 10,
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
      setParticipantUsers([]);
    } finally {
      setParticipantSearchLoading(false);
    }
  };

  const handleParticipantSearch = (value) => {
    setParticipantForm((previous) => ({
      ...previous,

      search_text: value,

      user_id: "",
    }));

    setSelectedParticipantUser(null);

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

  // ===================================================
  // PARTICIPANT MODAL
  // ===================================================

  const openParticipantModal = () => {
    setParticipantForm({
      ...EMPTY_PARTICIPANT_FORM,
    });

    setParticipantUsers([]);

    setSelectedParticipantUser(null);

    setShowParticipantModal(true);
  };

  const closeParticipantModal = () => {
    if (participantSaving) {
      return;
    }

    setShowParticipantModal(false);

    setParticipantForm({
      ...EMPTY_PARTICIPANT_FORM,
    });

    setParticipantUsers([]);

    setSelectedParticipantUser(null);
  };

  const updateParticipantField = (name, value) => {
    setParticipantForm((previous) => ({
      ...previous,

      [name]: value,
    }));
  };

  // ===================================================
  // ADD PARTICIPANT
  // ===================================================

  const handleAddParticipant = async (event) => {
    event.preventDefault();

    if (!selectedEvent?.id) {
      return;
    }

    const userId = Number(participantForm.user_id);

    if (!Number.isInteger(userId) || userId <= 0) {
      alert("Vui lòng chọn người tham dự.");

      return;
    }

    try {
      setParticipantSaving(true);

      const response = await axios.post(
        `${API_URL}/networking-events/${selectedEvent.id}/participants`,
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

      await fetchEvents();
    } catch (error) {
      alert(error.response?.data?.message || "Không thể thêm người tham dự.");
    } finally {
      setParticipantSaving(false);
    }
  };

  // ===================================================
  // DELETE PARTICIPANT
  // ===================================================

  const handleDeleteParticipant = async (participant) => {
    if (!selectedEvent?.id) {
      return;
    }

    const accepted = window.confirm(
      `Xóa "${participant.fullname}" khỏi danh sách người tham dự?`,
    );

    if (!accepted) return;

    try {
      const response = await axios.delete(
        `${API_URL}/networking-events/${selectedEvent.id}/participants/${participant.id}`,
        authConfig,
      );

      alert(response.data?.message || "Xóa người tham dự thành công.");

      await refreshSelectedEvent(selectedEvent.id);

      await fetchEvents();
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
  // ===================================================
  // RENDER
  // ===================================================

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Quản lý sự kiện kết nối
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Quản lý các sự kiện kết nối độc lập và danh sách người tham dự.
          </p>
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
            onClick={fetchEvents}
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
            className="flex items-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60"
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
            onClick={openCreateEventModal}
            className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
          >
            <Plus size={18} />
            Thêm sự kiện
          </button>
        </div>
      </div>

      {/* SUMMARY */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Tổng sự kiện" value={events.length} />

        <SummaryCard
          label="Đang mở"
          value={totalOpen}
          valueClass="text-green-600"
        />

        <SummaryCard
          label="Đã kết thúc"
          value={totalFinished}
          valueClass="text-blue-600"
        />

        <SummaryCard
          label="Người tham dự"
          value={totalParticipants}
          valueClass="text-violet-600"
        />
      </div>

      {/* FILTER */}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[minmax(280px,1fr)_220px_200px_160px_160px]">
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4">
            <Search size={18} className="text-slate-400" />

            <input
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);

                setPage(1);
              }}
              placeholder="Tìm tên sự kiện, mã, địa điểm..."
              className="w-full bg-transparent px-3 py-3 text-sm outline-none"
            />
          </div>
          <input
            type="text"
            value={missionFilter}
            onChange={(event) => {
              setMissionFilter(event.target.value);
              setPage(1);
            }}
            placeholder="Lọc theo nhiệm vụ..."
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
          />
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);

              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
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

              // Đổi năm thì chọn lại tháng
              setMonthFilter("");

              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
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
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="">Tất cả tháng</option>

            {Array.from(
              {
                length: 12,
              },
              (_, index) => index + 1,
            ).map((month) => (
              <option key={month} value={month}>
                Tháng {month}
              </option>
            ))}
          </select>
        </div>

        {(keyword ||
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
      {/* TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1350px]">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-4">Sự kiện</th>

                <th className="px-5 py-4">Thời gian</th>

                <th className="px-5 py-4">Địa điểm</th>

                <th className="px-5 py-4">Người tham dự</th>

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
                      Đang tải dữ liệu...
                    </p>
                  </td>
                </tr>
              ) : paginatedEvents.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-16 text-center text-slate-500"
                  >
                    Chưa có sự kiện kết nối phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-100 text-sm hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4">
                      <div className="max-w-[380px]">
                        <p className="font-semibold text-slate-900">
                          {item.event_name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {item.event_code || "Chưa có mã sự kiện"}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-start gap-2">
                        <CalendarDays
                          size={17}
                          className="mt-0.5 text-slate-400"
                        />

                        <div>
                          <p>{formatDateTime(item.start_datetime)}</p>

                          {item.end_datetime && (
                            <p className="mt-1 text-xs text-slate-400">
                              đến {formatDateTime(item.end_datetime)}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="max-w-[280px] px-5 py-4">
                      <div className="flex items-start gap-2">
                        <MapPin size={17} className="mt-0.5 text-slate-400" />

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
                        className={`
                            inline-flex rounded-full border
                            px-3 py-1
                            text-xs font-semibold
                            ${getStatusClass(item.status)}
                          `}
                      >
                        {getStatusLabel(item.status)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleViewEvent(item)}
                          className="rounded-lg border border-blue-200 p-2 text-blue-600 hover:bg-blue-50"
                        >
                          <Eye size={17} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenTransfer(item)}
                          className="rounded-lg border border-violet-200 p-2 text-violet-600 transition hover:bg-violet-50"
                          title="Chuyển sang Hội thảo"
                        >
                          <ArrowRightLeft size={17} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditEventModal(item)}
                          className="rounded-lg border border-amber-200 p-2 text-amber-600 hover:bg-amber-50"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(item)}
                          className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
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

        {/* PAGINATION */}

        <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Hiển thị{" "}
            <b>
              {startItem}-{endItem}
            </b>{" "}
            trên <b>{events.length}</b> sự kiện
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
              className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
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
              className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* EVENT MODAL */}

      {showEventModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">
                  {editingEventId
                    ? "Cập nhật sự kiện kết nối"
                    : "Thêm sự kiện kết nối"}
                </h2>
              </div>

              <button type="button" onClick={closeEventModal}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-5 p-6">
              <div className="grid gap-5 md:grid-cols-2">
                <FormInput
                  label="Tên sự kiện"
                  required
                  value={eventForm.event_name}
                  onChange={(value) => updateEventField("event_name", value)}
                  placeholder="VD: Robot AI nhân tạo"
                />
                <div>
                  <FormInput
                    label="Mã sự kiện"
                    value={eventForm.event_code}
                    onChange={(value) => updateEventField("event_code", value)}
                    placeholder="Mã sự kiện sẽ được tự động tạo"
                  />

                  <p className="mt-1.5 text-xs text-slate-400">
                    Mã được hệ thống tạo tự động từ tên sự kiện và năm. Có thể
                    chỉnh sửa nếu cần.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <FormInput
                    label="Địa điểm"
                    value={eventForm.location}
                    onChange={(value) => updateEventField("location", value)}
                  />
                </div>

                <FormDateTime
                  label="Bắt đầu"
                  value={eventForm.start_datetime}
                  onChange={(value) =>
                    updateEventField("start_datetime", value)
                  }
                />

                <FormDateTime
                  label="Kết thúc"
                  value={eventForm.end_datetime}
                  onChange={(value) => updateEventField("end_datetime", value)}
                />

                <FormInput
                  label="Năm"
                  type="number"
                  value={eventForm.year}
                  onChange={(value) => updateEventField("year", value)}
                />

                <FormInput
                  label="Đơn vị tổ chức"
                  value={eventForm.organizer}
                  onChange={(value) => updateEventField("organizer", value)}
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
              />

              <FormTextarea
                label="Mô tả chi tiết"
                value={eventForm.description}
                onChange={(value) => updateEventField("description", value)}
              />
              <FormTextarea
                label="Nhiệm vụ"
                value={eventForm.mission}
                onChange={(value) => updateEventField("mission", value)}
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
              <div className="flex justify-end gap-3 border-t pt-5">
                <button
                  type="button"
                  onClick={closeEventModal}
                  className="rounded-xl border px-5 py-2.5"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 font-semibold text-white"
                >
                  {saving && <Loader2 size={18} className="animate-spin" />}

                  {editingEventId ? "Lưu thay đổi" : "Thêm sự kiện"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {transferEvent && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Chuyển sang Hội thảo
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Sao chép sự kiện kết nối và người tham dự sang Startup
                  Connection Day.
                </p>
              </div>

              <button
                type="button"
                disabled={transferLoading}
                onClick={() => {
                  setTransferEvent(null);
                  setTransferParentId("");
                }}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={21} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Sự kiện kết nối
                </p>

                <p className="mt-2 font-bold text-slate-900">
                  {transferEvent.event_name}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  {Number(transferEvent.total_participants || 0)} người tham dự
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Hội thảo thuộc Triển lãm nào?
                </label>

                <select
                  value={transferParentId}
                  onChange={(event) => setTransferParentId(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500"
                >
                  <option value="">
                    Hội thảo độc lập / Không thuộc Triển lãm
                  </option>

                  {transferExhibitions.map((exhibition) => (
                    <option key={exhibition.id} value={exhibition.id}>
                      {exhibition.event_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-700">
                Hệ thống sẽ sao chép dữ liệu sang Hội thảo. Sự kiện kết nối gốc
                chưa bị xóa để bạn có thể kiểm tra dữ liệu trước.
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
              <button
                type="button"
                disabled={transferLoading}
                onClick={() => {
                  setTransferEvent(null);
                  setTransferParentId("");
                }}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>

              <button
                type="button"
                disabled={transferLoading}
                onClick={handleTransferToSeminar}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {transferLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ArrowRightLeft size={18} />
                )}

                {transferLoading ? "Đang chuyển..." : "Chuyển sang Hội thảo"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* DETAIL MODAL */}

      {selectedEvent && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-slate-50 shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">Chi tiết sự kiện kết nối</h2>
              </div>

              <button type="button" onClick={() => setSelectedEvent(null)}>
                <X size={22} />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-20 text-center">
                <Loader2
                  size={30}
                  className="mx-auto animate-spin text-green-600"
                />
              </div>
            ) : (
              <div className="space-y-6 p-6">
                <section className="rounded-2xl border bg-white p-6">
                  <h3 className="text-2xl font-bold">
                    {selectedEvent.event_name}
                  </h3>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <DetailItem
                      label="Mã sự kiện"
                      value={selectedEvent.event_code}
                    />

                    <DetailItem
                      label="Đơn vị tổ chức"
                      value={selectedEvent.organizer}
                    />

                    <DetailItem
                      label="Bắt đầu"
                      value={formatDateTime(selectedEvent.start_datetime)}
                    />

                    <DetailItem
                      label="Kết thúc"
                      value={formatDateTime(selectedEvent.end_datetime)}
                    />

                    <DetailItem
                      label="Địa điểm"
                      value={selectedEvent.location}
                    />

                    <DetailItem
                      label="Người tham dự"
                      value={`${selectedEvent.total_participants || 0} người`}
                    />
                  </div>
                  {selectedEvent.mission && (
                    <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                        Nhiệm vụ
                      </p>

                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                        {selectedEvent.mission}
                      </p>
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border bg-white p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold">Người tham dự</h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {selectedEvent.participants?.length || 0} người
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={openParticipantModal}
                      className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white"
                    >
                      <UserPlus size={18} />
                      Thêm người tham dự
                    </button>
                  </div>
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
                        / {selectedEvent.participants?.length || 0} người tham
                        dự
                      </p>
                    )}
                  </div>
                  {!selectedEvent.participants?.length ? (
                    <div className="mt-5 rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
                      Chưa có người tham dự.
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
                    <div className="mt-5 overflow-x-auto">
                      <table className="w-full min-w-[850px]">
                        <thead>
                          <tr className="text-left text-xs uppercase text-slate-500">
                            <th className="px-4 py-3">Người tham dự</th>

                            <th className="px-4 py-3">Liên hệ</th>

                            <th className="px-4 py-3">Đơn vị</th>

                            <th className="px-4 py-3">Vai trò</th>

                            <th className="px-4 py-3 text-right">Thao tác</th>
                          </tr>
                        </thead>

                        <tbody>
                          {filteredParticipants.map((participant) => (
                            <tr key={participant.id} className="border-t">
                              <td className="px-4 py-4 font-semibold">
                                {participant.fullname}
                              </td>

                              <td className="px-4 py-4">
                                <p>{participant.email || "—"}</p>

                                <p className="text-xs text-slate-500">
                                  {participant.phone || "—"}
                                </p>
                              </td>

                              <td className="px-4 py-4">
                                {participant.organization ||
                                  participant.company ||
                                  "—"}
                              </td>

                              <td className="px-4 py-4">
                                {participant.participant_role || "—"}
                              </td>

                              <td className="px-4 py-4">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedParticipantDetail(participant)
                                    }
                                    className="rounded-lg border border-blue-200 p-2 text-blue-600 transition hover:bg-blue-50"
                                    title="Xem chi tiết người tham dự"
                                  >
                                    <Eye size={17} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteParticipant(participant)
                                    }
                                    className="rounded-lg border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
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
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      )}
      {selectedParticipantDetail && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-slate-50 shadow-2xl">
            {/* HEADER */}
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Chi tiết người tham dự
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Thông tin đăng ký tham gia sự kiện kết nối.
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
              {/* THÔNG TIN CÁ NHÂN */}
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
                    value={getAgeGroupLabel(
                      selectedParticipantDetail.age_group,
                    )}
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

              {/* DỰ ÁN */}
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
                        : selectedParticipantDetail.has_project === 0 ||
                            selectedParticipantDetail.has_project === false
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

              {/* NHU CẦU */}
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

              {/* ĐĂNG KÝ */}
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

      {/* PARTICIPANT MODAL */}

      {showParticipantModal && selectedEvent && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">Thêm người tham dự</h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedEvent.event_name}
                </p>
              </div>

              <button type="button" onClick={closeParticipantModal}>
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleAddParticipant} className="space-y-5 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Tìm người tham dự
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
                    className="w-full rounded-xl border py-3 pl-11 pr-4"
                  />
                </div>

                {participantSearchLoading && (
                  <p className="mt-2 text-sm text-slate-500">Đang tìm...</p>
                )}

                {!selectedParticipantUser && participantUsers.length > 0 && (
                  <div className="mt-3 max-h-60 overflow-y-auto rounded-xl border">
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
                        className="w-full border-b px-4 py-3 text-left hover:bg-green-50"
                      >
                        <p className="font-semibold">{user.fullname}</p>

                        <p className="text-sm text-slate-500">{user.email}</p>

                        <p className="text-xs text-slate-400">{user.phone}</p>
                      </button>
                    ))}
                  </div>
                )}

                {selectedParticipantUser && (
                  <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-4">
                    <p className="font-bold">
                      {selectedParticipantUser.fullname}
                    </p>

                    <p className="text-sm">{selectedParticipantUser.email}</p>

                    <p className="text-sm">{selectedParticipantUser.phone}</p>
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

              <div className="flex justify-end gap-3 border-t pt-5">
                <button
                  type="button"
                  onClick={closeParticipantModal}
                  className="rounded-xl border px-5 py-2.5"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={participantSaving}
                  className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 font-semibold text-white"
                >
                  <UserPlus size={18} />
                  Thêm người tham dự
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

// =====================================================
// SMALL COMPONENTS
// =====================================================

function SummaryCard({ label, value, valueClass = "text-slate-900" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>

      <p className={`mt-2 text-3xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  required = false,
  type = "text",
  min,
  placeholder = "",
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
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
        className="w-full rounded-xl border border-slate-200 px-4 py-3"
      />
    </div>
  );
}

function FormTextarea({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>

      <textarea
        rows={4}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 px-4 py-3"
      />
    </div>
  );
}

function FormDateTime({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>

      <input
        type="datetime-local"
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 px-4 py-3"
      />
    </div>
  );
}

function FormSelect({ label, value, onChange, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>

      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-xl border border-slate-200 px-4 py-3 pr-10"
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
      <p className="text-xs uppercase text-slate-400">{label}</p>

      <p className="mt-2 font-semibold text-slate-800">{value || "—"}</p>
    </div>
  );
}
function LongDetailItem({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs uppercase text-slate-400">{label}</p>

      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
        {value === null || value === undefined || value === "" ? "—" : value}
      </p>
    </div>
  );
}
