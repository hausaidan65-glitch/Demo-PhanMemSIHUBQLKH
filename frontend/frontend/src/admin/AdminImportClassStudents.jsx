import { useMemo, useRef, useState } from "react";
import axios from "axios";
import GoogleFormImportPanel from "./components/google-form/GoogleFormImportPanel";
import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Loader2,
  MapPin,
  PlusCircle,
  RotateCcw,
  Upload,
  Users,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const FILE_STATUS = {
  READY: "READY",
  IMPORTING: "IMPORTING",
  SUCCESS: "SUCCESS",
  NEED_CONFIRM: "NEED_CONFIRM",
  SKIPPED: "SKIPPED",
  ERROR: "ERROR",
};

function getStatusLabel(status) {
  switch (status) {
    case FILE_STATUS.IMPORTING:
      return "Đang import";

    case FILE_STATUS.SUCCESS:
      return "Đã import";

    case FILE_STATUS.NEED_CONFIRM:
      return "Cần xác nhận";

    case FILE_STATUS.SKIPPED:
      return "Đã bỏ qua";

    case FILE_STATUS.ERROR:
      return "Import lỗi";

    default:
      return "Sẵn sàng";
  }
}

function getStatusClass(status) {
  switch (status) {
    case FILE_STATUS.IMPORTING:
      return "border-blue-200 bg-blue-50 text-blue-700";

    case FILE_STATUS.SUCCESS:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case FILE_STATUS.NEED_CONFIRM:
      return "border-amber-200 bg-amber-50 text-amber-700";

    case FILE_STATUS.SKIPPED:
      return "border-slate-200 bg-slate-100 text-slate-600";

    case FILE_STATUS.ERROR:
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-slate-200 bg-white text-slate-600";
  }
}

function cleanDisplayText(value, prefixes = []) {
  if (!value) {
    return "Chưa có thông tin";
  }

  let result = String(value).trim();

  prefixes.forEach((prefix) => {
    result = result.replace(prefix, "").trim();
  });

  return result || "Chưa có thông tin";
}
function getStudentErrors(student, item = null) {
  const errors = [];

  const fullname = String(student?.fullname || "").trim();

  const phone = String(student?.phone || "").trim();

  const email = String(student?.email || "").trim();

  // ======================================
  // HỌ TÊN
  // ======================================
  if (!fullname) {
    errors.push("Thiếu họ và tên");
  }

  // ======================================
  // TRAINING
  //
  // Giữ nguyên nghiệp vụ cũ:
  // users.phone đang NOT NULL.
  // ======================================
  if (isTrainingItem(item)) {
    if (!phone) {
      errors.push("Thiếu số điện thoại");
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("Email không đúng định dạng");
    }

    return errors;
  }

  // ======================================
  // EVENT
  //
  // Ưu tiên dùng validation backend.
  // Nếu người tham dự không có SĐT:
  // KHÔNG tự chặn ở FE.
  // ======================================
  if (isEventItem(item)) {
    // Event cho phép thiếu SĐT HOẶC thiếu Email,
    // nhưng không được thiếu cả hai vì không thể định danh người tham dự.
    if (!phone && !email) {
      errors.push("Thiếu cả số điện thoại và email");
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("Email không đúng định dạng");
    }

    if (phone) {
      const digits = phone.replace(/\D/g, "");

      if (!/^0\d{9}$/.test(digits)) {
        errors.push("Số điện thoại chưa đúng định dạng");
      }
    }

    return errors;
  }

  return errors;
}
// =====================================================
// PHÂN BIỆT NGHIỆP VỤ TRAINING / EVENT
// =====================================================
function isTrainingItem(item) {
  return item?.importType === "TRAINING";
}

function isEventItem(item) {
  return ["STARTUP_EXHIBITION", "STARTUP_SEMINAR", "NETWORKING_EVENT"].includes(
    item?.importType,
  );
}

function getImportTypeLabel(item) {
  switch (item?.importType) {
    case "TRAINING":
      return "Khóa đào tạo";

    case "STARTUP_EXHIBITION":
      return "Triển lãm";

    case "STARTUP_SEMINAR":
      return "Hội thảo";

    case "NETWORKING_EVENT":
      return "Sự kiện kết nối";

    case "UNKNOWN":
      return "Chưa xác định";

    default:
      return item?.importTypeLabel || "Chưa xác định";
  }
}

function getPeopleLabel(item) {
  return isTrainingItem(item) ? "Học viên" : "Người tham dự";
}

function getItemTitle(item) {
  if (isEventItem(item)) {
    return (
      item?.event?.eventName || item?.sheetName || "Chưa đọc được tên sự kiện"
    );
  }

  return item?.class?.className || "Không đọc được tên lớp";
}
// =====================================================
// TẠO KEY ỔN ĐỊNH CHO VALIDATION PARTICIPANT
//
// Không dùng rowIndex vì khi Admin xóa một dòng,
// index của các dòng phía sau sẽ thay đổi.
//
// Key dựa trên:
// họ tên + số điện thoại + email
// =====================================================
function getParticipantValidationKey(participant = {}) {
  const fullname = String(participant?.fullname || "")
    .trim()
    .toLowerCase();

  const phone = String(participant?.phone || "")
    .replace(/\D/g, "")
    .trim();

  const email = String(participant?.email || "")
    .trim()
    .toLowerCase();

  return `${fullname}|||${phone}|||${email}`;
}
function AdminImportClassStudent() {
  const inputRef = useRef(null);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewItems, setPreviewItems] = useState([]);

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [importConflict, setImportConflict] = useState(null);
  const [editingConflictRow, setEditingConflictRow] = useState(null);

  const [pendingConfirm, setPendingConfirm] = useState(null);
  const [eventParentConfirm, setEventParentConfirm] = useState(null);
  const [eventParentMode, setEventParentMode] = useState("EXHIBITION");
  // EXHIBITION | NETWORKING
  const [existingExhibitions, setExistingExhibitions] = useState([]);
  const [exhibitionLoading, setExhibitionLoading] = useState(false);
  const [importSource, setImportSource] = useState("SIHUB_EXCEL");
  const [exhibitionChoice, setExhibitionChoice] = useState({
    mode: "EXISTING", // EXISTING | NEW
    existingId: "",
    newName: "",
    newLocation: "",
  });
  // =====================================================
  // XÁC NHẬN KHÓA ĐÀO TẠO CHO LỚP HỌC
  // =====================================================
  const [trainingCourses, setTrainingCourses] = useState([]);

  const [trainingCourseLoading, setTrainingCourseLoading] = useState(false);

  const [trainingCourseChoice, setTrainingCourseChoice] = useState({
    mode: "EXISTING", // EXISTING | NEW
    existingId: "",
    newName: "",
    newDescription: "",
  });
  const [notice, setNotice] = useState({
    type: "",
    message: "",
  });

  const totalStudents = useMemo(() => {
    return previewItems.reduce(
      (sum, item) => sum + Number(item.totalStudents || 0),
      0,
    );
  }, [previewItems]);
  const totalTrainingStudents = useMemo(() => {
    return previewItems.reduce(
      (sum, item) =>
        isTrainingItem(item) ? sum + Number(item.totalStudents || 0) : sum,
      0,
    );
  }, [previewItems]);
  const token = localStorage.getItem("admin_token");

  const authConfig = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    [token],
  );
  const totalEventParticipants = useMemo(() => {
    return previewItems.reduce(
      (sum, item) =>
        isEventItem(item)
          ? sum + Number(item.totalParticipants ?? item.totalStudents ?? 0)
          : sum,
      0,
    );
  }, [previewItems]);

  const totalIssues = useMemo(() => {
    return previewItems.reduce(
      (sum, item) =>
        sum +
        Number(item.participantValidation?.totalIssues || 0) +
        Number(item.participantAnalysis?.totalConflicts || 0),
      0,
    );
  }, [previewItems]);
  const importedFiles = useMemo(() => {
    return previewItems.filter(
      (item) => item.importStatus === FILE_STATUS.SUCCESS,
    ).length;
  }, [previewItems]);

  const filesNeedConfirm = useMemo(() => {
    return previewItems.filter(
      (item) => item.importStatus === FILE_STATUS.NEED_CONFIRM,
    ).length;
  }, [previewItems]);

  const hasPreview = previewItems.length > 0;
  const exhibitionOptions = useMemo(() => {
    return previewItems.filter(
      (item) => item.importType === "STARTUP_EXHIBITION",
    );
  }, [previewItems]);
  const updatePreviewItem = (index, patch) => {
    setPreviewItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  };
  const updateStudentField = (itemIndex, studentIndex, field, value) => {
    setPreviewItems((currentItems) =>
      currentItems.map((item, currentItemIndex) => {
        if (currentItemIndex !== itemIndex) {
          return item;
        }

        const nextStudents = (item.students || []).map(
          (student, currentStudentIndex) =>
            currentStudentIndex === studentIndex
              ? {
                  ...student,
                  [field]: value,
                }
              : student,
        );

        return {
          ...item,
          students: nextStudents,
          totalStudents: nextStudents.length,

          /*
           * Sau khi sửa, cho phép kiểm tra/import lại.
           */
          importStatus:
            item.importStatus === FILE_STATUS.ERROR
              ? FILE_STATUS.READY
              : item.importStatus,

          importError: null,
        };
      }),
    );
  };
  const removeStudent = (itemIndex, studentIndex) => {
    const accepted = window.confirm(
      "Bỏ học viên này khỏi lần import hiện tại?",
    );

    if (!accepted) {
      return;
    }

    setPreviewItems((currentItems) =>
      currentItems.map((item, currentItemIndex) => {
        if (currentItemIndex !== itemIndex) {
          return item;
        }

        const nextStudents = (item.students || []).filter(
          (_, currentStudentIndex) => currentStudentIndex !== studentIndex,
        );

        return {
          ...item,
          students: nextStudents,
          totalStudents: nextStudents.length,
          importStatus: FILE_STATUS.READY,
          importError: null,
          importResult: null,
        };
      }),
    );
  };

  const getConflictStudent = () => {
    if (!importConflict?.details) {
      return null;
    }

    const { sheetName, studentIndex } = importConflict.details;

    /*
     * Ưu tiên itemIndex được lưu lúc catch.
     */
    let itemIndex = Number(importConflict.itemIndex);

    let sheet = previewItems[itemIndex];

    /*
     * Nếu vì lý do nào đó itemIndex không còn hợp lệ,
     * fallback tìm theo sheetName.
     */
    if (!sheet || sheet.sheetName !== sheetName) {
      itemIndex = previewItems.findIndex(
        (item) => item.sheetName === sheetName,
      );

      sheet = previewItems[itemIndex];
    }

    if (!sheet || itemIndex < 0) {
      return null;
    }

    /*
     * Backend hiện trả studentIndex theo 1-based.
     *
     * Ví dụ:
     * studentIndex = 29
     * => array index = 28
     */
    const arrayIndex = Number(studentIndex) - 1;

    const student = sheet.students?.[arrayIndex];

    if (!student) {
      return null;
    }

    return {
      itemIndex,
      sheetName,
      arrayIndex,
      student,
    };
  };
  // =====================================================
  // TẢI DANH SÁCH KHÓA ĐÀO TẠO
  //
  // Dùng khi lớp học trong Excel chưa xác định được
  // thuộc Khóa đào tạo nào.
  // =====================================================
  const fetchTrainingCoursesForImport = async () => {
    try {
      setTrainingCourseLoading(true);

      const response = await axios.get(`${API_URL}/training-courses`);

      setTrainingCourses(response.data?.data || []);
    } catch (error) {
      console.error(
        "Lỗi tải danh sách khóa đào tạo:",
        error.response?.data || error,
      );

      showNotice(
        "error",
        error.response?.data?.message ||
          "Không thể tải danh sách Khóa đào tạo.",
      );

      setTrainingCourses([]);
    } finally {
      setTrainingCourseLoading(false);
    }
  };
  const showNotice = (type, message) => {
    setNotice({
      type,
      message,
    });
  };

  const clearNotice = () => {
    setNotice({
      type: "",
      message: "",
    });
  };

  const handleChooseFiles = (event) => {
    const files = Array.from(event.target.files || []);

    clearNotice();
    setPreviewItems([]);
    setPendingConfirm(null);
    setImportConflict(null);
    setEditingConflictRow(null);
    setEventParentConfirm(null);

    setTrainingCourseChoice({
      mode: "EXISTING",
      existingId: "",
      newName: "",
      newDescription: "",
    });
    const validFiles = files.filter((file) => {
      const fileName = String(file.name || "").trim();

      // Bỏ file tạm/lock file do Microsoft Excel tạo
      if (fileName.startsWith("~$")) {
        return false;
      }

      const extension = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();

      return [".xlsx", ".xls"].includes(extension);
    });

    if (validFiles.length !== files.length) {
      showNotice("warning", "Một số file không phải Excel nên đã bị loại bỏ.");
    }

    setSelectedFiles(validFiles);
  };

  const removeSelectedFile = (fileIndex) => {
    setSelectedFiles((currentFiles) =>
      currentFiles.filter((_, index) => index !== fileIndex),
    );

    setPreviewItems([]);
    setPendingConfirm(null);
    clearNotice();

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const resetImport = () => {
    setSelectedFiles([]);
    setPreviewItems([]);
    setPendingConfirm(null);
    setLoadingPreview(false);
    setLoadingImport(false);
    setCreatingCourse(false);
    setImportConflict(null);
    setEditingConflictRow(null);
    setEventParentConfirm(null);
    setEventParentMode("EXHIBITION");
    setTrainingCourses([]);

    setTrainingCourseChoice({
      mode: "EXISTING",
      existingId: "",
      newName: "",
      newDescription: "",
    });
    clearNotice();

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  // =====================================================
  // PREVIEW NHIỀU FILE EXCEL
  // =====================================================
  const handlePreview = async () => {
    if (selectedFiles.length === 0) {
      showNotice(
        "error",
        "Bạn cần chọn ít nhất một file Excel trước khi kiểm tra.",
      );

      return;
    }

    try {
      setLoadingPreview(true);
      clearNotice();
      setPendingConfirm(null);

      const formData = new FormData();

      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const response = await axios.post(
        `${API_URL}/sihub-import/preview`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      const previewData = response.data?.data || [];
      const previewTimestamp = Date.now();

      const mappedItems = previewData.map((item, itemIndex) => {
        const students = (item.students || []).map((student, studentIndex) => ({
          ...student,

          localStudentId: `${previewTimestamp}-${itemIndex}-${studentIndex}`,
        }));

        return {
          ...item,

          localId: `${previewTimestamp}-${itemIndex}-${item.sheetName}`,

          students,

          // Giữ field cũ cho Training
          totalStudents: students.length,

          // Event dùng tên đúng nghiệp vụ
          totalParticipants: isEventItem(item)
            ? students.length
            : Number(item.totalParticipants || 0),

          importStatus: FILE_STATUS.READY,

          importResult: null,

          importError: null,
        };
      });

      setPreviewItems(mappedItems);

      const trainingCount = mappedItems.filter(
        (item) => item.importType === "TRAINING",
      ).length;

      const eventCount = mappedItems.filter((item) => isEventItem(item)).length;

      const unknownCount = mappedItems.filter(
        (item) => item.importType === "UNKNOWN",
      ).length;

      showNotice(
        "success",
        `Đã đọc ${mappedItems.length} sheet dữ liệu: ` +
          `${trainingCount} khóa/lớp đào tạo, ` +
          `${eventCount} sự kiện và ` +
          `${unknownCount} sheet chưa xác định.`,
      );
    } catch (error) {
      console.error("Preview Excel SIHUB lỗi:", error);

      showNotice(
        "error",
        error.response?.data?.message ||
          "Không thể đọc dữ liệu Excel. Bạn kiểm tra lại định dạng file.",
      );
    } finally {
      setLoadingPreview(false);
    }
  };
  const fetchExhibitionsForImport = async () => {
    try {
      setExhibitionLoading(true);

      const response = await axios.get(`${API_URL}/startup-connection/events`, {
        ...authConfig,

        params: {
          type: "EXHIBITION",
        },
      });

      setExistingExhibitions(response.data?.data || []);
    } catch (error) {
      console.error(
        "Lỗi tải danh sách Triển lãm:",
        error.response?.data || error,
      );

      setExistingExhibitions([]);
    } finally {
      setExhibitionLoading(false);
    }
  };
  // =====================================================
  // IMPORT TUẦN TỰ TỪNG FILE
  // Mỗi lần chỉ gửi 1 file để dễ kiểm soát lỗi/xác nhận
  // =====================================================
  const importFilesFromIndex = async (startIndex = 0) => {
    setLoadingImport(true);
    clearNotice();

    try {
      for (let index = startIndex; index < previewItems.length; index += 1) {
        const currentItem = previewItems[index];
        // ==============================================
        // SHEET UNKNOWN
        // Không tự import
        // ==============================================

        if (currentItem.importType === "UNKNOWN") {
          updatePreviewItem(index, {
            importStatus: FILE_STATUS.SKIPPED,
            importError: null,
            importResult: null,
          });

          continue;
        }

        // ==============================================
        // HỘI THẢO CHƯA XÁC NHẬN TRIỂN LÃM CHA
        // ==============================================

        if (
          currentItem.importType === "STARTUP_SEMINAR" &&
          currentItem.requiresExhibitionParent === true &&
          currentItem.needParentConfirm
        ) {
          updatePreviewItem(index, {
            importStatus: FILE_STATUS.NEED_CONFIRM,

            importError:
              "Vui lòng xác nhận Triển lãm của Hội thảo trước khi tiếp tục.",
          });

          setExhibitionChoice({
            mode: "EXISTING",
            existingId: "",
            newName: "",
            newLocation: currentItem.event?.location || "",
          });
          setEventParentMode("EXHIBITION");
          setEventParentConfirm({
            itemIndex: index,

            seminarName:
              currentItem.event?.eventName ||
              currentItem.sheetName ||
              "Hội thảo",

            parentLocalId: "",
          });

          await fetchExhibitionsForImport();

          return;
        }
        // EVENT: KIỂM TRA TRÊN DỮ LIỆU HIỆN TẠI
        //
        // Không dùng totalIssues của Preview cũ,
        // vì Admin có thể đã sửa dữ liệu trực tiếp.
        // =====================================================
        if (isEventItem(currentItem)) {
          const currentValidationIssues = (currentItem.students || []).filter(
            (student) => getStudentErrors(student, currentItem).length > 0,
          ).length;

          if (currentValidationIssues > 0) {
            updatePreviewItem(index, {
              importStatus: FILE_STATUS.NEED_CONFIRM,

              importError: `Còn ${currentValidationIssues} người tham dự cần kiểm tra.`,
            });

            continue;
          }
        }
        const invalidStudents = (currentItem.students || [])
          .map((student, studentIndex) => ({
            student,
            studentIndex,
            errors: getStudentErrors(student, currentItem),
          }))
          .filter((item) => item.errors.length > 0);

        if (invalidStudents.length > 0) {
          updatePreviewItem(index, {
            importStatus: FILE_STATUS.ERROR,

            importError:
              `Sheet còn ${invalidStudents.length} học viên chưa hợp lệ. ` +
              "Vui lòng sửa hoặc bỏ các dòng lỗi trước khi import.",
          });

          /*
           * Quan trọng:
           * Không dừng toàn bộ quá trình.
           * Tiếp tục sheet tiếp theo.
           */
          continue;
        }

        if (
          currentItem.importStatus === FILE_STATUS.SUCCESS ||
          currentItem.importStatus === FILE_STATUS.SKIPPED
        ) {
          continue;
        }

        updatePreviewItem(index, {
          importStatus: FILE_STATUS.IMPORTING,
          importError: null,
        });

        try {
          const response = await axios.post(`${API_URL}/sihub-import/confirm`, {
            // Controller hiện tại đang lấy req.body.data
            data: [currentItem],
          });

          const result = response.data?.data?.[0];

          if (!result) {
            throw new Error("Backend không trả về kết quả import của file.");
          }
          if (result.needConfirm) {
            updatePreviewItem(index, {
              importStatus: FILE_STATUS.NEED_CONFIRM,

              importResult: result,
            });

            setTrainingCourseChoice({
              mode: "EXISTING",
              existingId: "",
              newName: "",
              newDescription: "",
            });

            setPendingConfirm({
              index,
              fileData: currentItem,
              result,
            });

            // Tải danh sách khóa để Admin chọn
            await fetchTrainingCoursesForImport();

            showNotice(
              "warning",
              `Lớp học "${result.courseName}" chưa xác định được Khóa đào tạo. Vui lòng kiểm tra trước khi tiếp tục.`,
            );

            return;
          }

          updatePreviewItem(index, {
            importStatus: FILE_STATUS.SUCCESS,
            importResult: result,
            importError: null,
          });
        } catch (error) {
          console.error("Tạo lớp và tiếp tục import lỗi:", error);

          const errorData = error.response?.data;

          const isStudentConflict =
            errorData?.code === "STUDENT_PHONE_CONFLICT" ||
            errorData?.code === "STUDENT_IDENTITY_CONFLICT" ||
            errorData?.code === "STUDENT_NAME_CONFLICT" ||
            errorData?.code === "EVENT_PARTICIPANT_NAME_REQUIRED" ||
            errorData?.code === "EVENT_PARTICIPANT_CONTACT_REQUIRED";

          if (isStudentConflict) {
            // Giữ nguyên toàn bộ Preview 42 học viên
            // và lưu chính xác sheet đang xảy ra lỗi.
            setImportConflict({
              ...errorData,
              itemIndex: index,
            });

            updatePreviewItem(index, {
              importStatus: FILE_STATUS.ERROR,
              importError: null,
              importResult: null,
            });

            // Đóng modal "Tạo lớp và tiếp tục"
            setPendingConfirm(null);

            showNotice(
              "warning",
              "Có 1 học viên bị trùng dữ liệu. Vui lòng kiểm tra và sửa học viên bên dưới.",
            );

            return;
          }

          // Các lỗi khác vẫn xử lý như bình thường
          updatePreviewItem(index, {
            importStatus: FILE_STATUS.ERROR,
            importError:
              errorData?.message || "Không thể tạo lớp học và tiếp tục import.",
          });

          showNotice(
            "error",
            errorData?.message || "Không thể tạo lớp học và tiếp tục import.",
          );
        } finally {
          setCreatingCourse(false);
        }
      }

      showNotice("success", "Đã hoàn tất quá trình import các file hợp lệ.");
    } finally {
      setLoadingImport(false);
    }
  };
  const handleSaveConflictRow = () => {
    if (!editingConflictRow) {
      return;
    }

    const { itemIndex, arrayIndex, form } = editingConflictRow;

    setPreviewItems((currentItems) =>
      currentItems.map((item, currentItemIndex) => {
        if (currentItemIndex !== itemIndex) {
          return item;
        }

        const nextStudents = (item.students || []).map(
          (student, studentIndex) =>
            studentIndex === arrayIndex
              ? {
                  ...student,
                  ...form,
                }
              : student,
        );

        return {
          ...item,

          students: nextStudents,

          totalStudents: nextStudents.length,

          /*
           * Cho phép import lại sheet này.
           */
          importStatus: FILE_STATUS.READY,

          importError: null,

          importResult: null,
        };
      }),
    );

    setEditingConflictRow(null);
    setImportConflict(null);

    showNotice(
      "success",
      "Đã cập nhật học viên. Dữ liệu Excel vẫn được giữ nguyên và bạn có thể import lại.",
    );
  };
  const handleUseConflictProfile = (mode) => {
    if (!importConflict?.details) {
      return;
    }

    const conflict = getConflictStudent();

    if (!conflict) {
      showNotice("error", "Không tìm thấy dòng dữ liệu đang cần xử lý.");
      return;
    }

    const { itemIndex, arrayIndex } = conflict;
    const details = importConflict.details;

    let selectedProfile = null;

    // =============================================
    // DÙNG HỒ SƠ ĐƯỢC TÌM THẤY THEO EMAIL
    // =============================================
    if (mode === "EMAIL") {
      selectedProfile = {
        fullname: details.emailUserName || conflict.student.fullname,

        email:
          details.emailUserEmail ||
          details.email ||
          conflict.student.email ||
          "",

        phone: details.emailUserPhone || "",
      };
    }

    // =============================================
    // DÙNG HỒ SƠ ĐƯỢC TÌM THẤY THEO SĐT
    // =============================================
    if (mode === "PHONE") {
      selectedProfile = {
        fullname: details.phoneUserName || conflict.student.fullname,

        email: details.phoneUserEmail || "",

        phone:
          details.phoneUserPhone ||
          details.phone ||
          conflict.student.phone ||
          "",
      };
    }
    if (mode === "EXISTING") {
      selectedProfile = {
        fullname: details.existingFullname || conflict.student.fullname,

        email: details.existingEmail || conflict.student.email || "",

        phone: details.existingPhone || conflict.student.phone || "",
      };
    }
    if (!selectedProfile) {
      return;
    }

    setPreviewItems((currentItems) =>
      currentItems.map((item, currentItemIndex) => {
        if (currentItemIndex !== itemIndex) {
          return item;
        }

        const nextStudents = (item.students || []).map(
          (student, studentIndex) => {
            if (studentIndex !== arrayIndex) {
              return student;
            }

            return {
              ...student,

              fullname: selectedProfile.fullname,
              email: selectedProfile.email,
              phone: selectedProfile.phone,
            };
          },
        );

        return {
          ...item,

          students: nextStudents,

          totalStudents: nextStudents.length,

          totalParticipants: isEventItem(item)
            ? nextStudents.length
            : item.totalParticipants,

          importStatus: FILE_STATUS.READY,

          importError: null,
          importResult: null,
        };
      }),
    );

    setImportConflict(null);
    setEditingConflictRow(null);
    let successMessage =
      "Đã sử dụng hồ sơ hiện có. Bạn không cần nhập lại thông tin.";

    if (mode === "EMAIL") {
      successMessage =
        "Đã sử dụng hồ sơ khớp theo Email. Bạn không cần nhập lại thông tin.";
    }

    if (mode === "PHONE") {
      successMessage =
        "Đã sử dụng hồ sơ khớp theo SĐT. Bạn không cần nhập lại thông tin.";
    }

    showNotice("success", successMessage);
  };
  const handleConfirmEventParent = async () => {
    if (!eventParentConfirm) {
      return;
    }

    const { itemIndex } = eventParentConfirm;

    try {
      // =====================================================
      // TRƯỜNG HỢP ADMIN XÁC NHẬN:
      // ĐÂY LÀ SỰ KIỆN KẾT NỐI
      //
      // Không cần Exhibition parent.
      // Chỉ đổi loại nghiệp vụ ở Preview,
      // không đụng parser/backend detect cũ.
      // =====================================================
      if (eventParentMode === "NETWORKING") {
        setPreviewItems((currentItems) =>
          currentItems.map((item, index) => {
            if (index !== itemIndex) {
              return item;
            }

            const currentStudents = Array.isArray(item.students)
              ? item.students
              : [];

            return {
              ...item,

              importType: "NETWORKING_EVENT",

              importTypeLabel: "Sự kiện kết nối",
              requiresExhibitionParent: false,
              event: {
                ...(item.event || {}),

                parentEventName: null,
              },

              parentMatch: null,

              needParentConfirm: false,

              students: currentStudents,

              totalStudents: currentStudents.length,

              totalParticipants: currentStudents.length,

              importStatus: FILE_STATUS.READY,

              importError: null,

              importResult: null,
            };
          }),
        );

        setEventParentConfirm(null);

        setEventParentMode("EXHIBITION");

        setExhibitionChoice({
          mode: "EXISTING",
          existingId: "",
          newName: "",
          newLocation: "",
        });

        showNotice(
          "success",
          "Đã xác nhận đây là Sự kiện kết nối. Sự kiện sẽ được import theo nghiệp vụ Sự kiện kết nối.",
        );

        return;
      }

      // =====================================================
      // TRƯỜNG HỢP HỘI THẢO THUỘC TRIỂN LÃM
      // =====================================================
      let parentEventName = null;

      // =====================================================
      // CÁCH 1: CHỌN TRIỂN LÃM ĐÃ CÓ
      // =====================================================
      if (exhibitionChoice.mode === "EXISTING") {
        if (!exhibitionChoice.existingId) {
          showNotice("warning", "Vui lòng chọn một Triển lãm.");

          return;
        }

        const selectedParent = existingExhibitions.find(
          (item) => Number(item.id) === Number(exhibitionChoice.existingId),
        );

        if (!selectedParent) {
          showNotice("error", "Không tìm thấy Triển lãm đã chọn.");

          return;
        }

        parentEventName = selectedParent.event_name;
      }

      // =====================================================
      // CÁCH 2: TẠO TRIỂN LÃM MỚI
      // =====================================================
      if (exhibitionChoice.mode === "NEW") {
        const newName = exhibitionChoice.newName.trim();

        if (!newName) {
          showNotice("warning", "Vui lòng nhập tên Triển lãm mới.");

          return;
        }

        const currentItem = previewItems[itemIndex];

        const schedule = String(currentItem?.event?.schedule || "");

        const year =
          Number(schedule.match(/\b20\d{2}\b/)?.[0]) ||
          new Date().getFullYear();

        const response = await axios.post(
          `${API_URL}/startup-connection/events`,
          {
            event_name: newName,

            event_type: "EXHIBITION",

            parent_event_id: null,

            location:
              exhibitionChoice.newLocation.trim() ||
              currentItem?.event?.location ||
              null,

            year,

            organizer: "SIHUB",

            max_participants: 0,

            status: "OPEN",
          },
          authConfig,
        );

        const created = response.data?.data;

        if (!created?.event_name) {
          throw new Error(
            "Đã tạo Triển lãm nhưng Backend không trả về dữ liệu.",
          );
        }

        parentEventName = created.event_name;
      }

      // =====================================================
      // GẮN TRIỂN LÃM CHA VÀO HỘI THẢO
      // =====================================================
      setPreviewItems((currentItems) =>
        currentItems.map((item, index) => {
          if (index !== itemIndex) {
            return item;
          }

          const currentStudents = Array.isArray(item.students)
            ? item.students
            : [];

          return {
            ...item,

            event: {
              ...(item.event || {}),

              parentEventName,
            },

            parentMatch: {
              parentEventName,

              confidence: "ADMIN_CONFIRMED",

              needParentConfirm: false,

              reason: "Admin đã xác nhận Triển lãm của Hội thảo.",
            },
            requiresExhibitionParent: true,
            needParentConfirm: false,

            students: currentStudents,

            totalStudents: currentStudents.length,

            totalParticipants: currentStudents.length,

            importStatus: FILE_STATUS.READY,

            importError: null,

            importResult: null,
          };
        }),
      );

      setEventParentConfirm(null);

      setEventParentMode("EXHIBITION");

      setExhibitionChoice({
        mode: "EXISTING",
        existingId: "",
        newName: "",
        newLocation: "",
      });

      showNotice(
        "success",
        `Đã xác nhận Triển lãm "${parentEventName}" cho Hội thảo.`,
      );
    } catch (error) {
      console.error(
        "Lỗi xác nhận loại sự kiện:",
        error.response?.data || error,
      );

      showNotice(
        "error",
        error.response?.data?.message ||
          error.message ||
          "Không thể xác nhận loại sự kiện.",
      );
    }
  };
  const handleStartImport = async () => {
    if (previewItems.length === 0) {
      showNotice("error", "Bạn cần kiểm tra dữ liệu Excel trước khi import.");

      return;
    }

    await importFilesFromIndex(0);
  };

  // XÁC NHẬN KHÓA ĐÀO TẠO
  //
  // 1. Chọn khóa đã có
  // HOẶC
  // 2. Tạo khóa mới
  //
  // Sau đó mới tạo lớp và tiếp tục import.
  // =====================================================
  const handleCreateCourseAndContinue = async () => {
    if (!pendingConfirm) {
      return;
    }

    const { index, fileData, result } = pendingConfirm;

    try {
      setCreatingCourse(true);
      clearNotice();

      let trainingCourseId = null;

      // =====================================
      // CÁCH 1:
      // CHỌN KHÓA ĐÀO TẠO ĐÃ CÓ
      // =====================================
      if (trainingCourseChoice.mode === "EXISTING") {
        if (!trainingCourseChoice.existingId) {
          showNotice(
            "warning",
            "Vui lòng chọn một Khóa đào tạo trước khi tiếp tục.",
          );

          return;
        }

        trainingCourseId = Number(trainingCourseChoice.existingId);
      }

      // =====================================
      // CÁCH 2:
      // TẠO KHÓA ĐÀO TẠO MỚI
      // =====================================
      if (trainingCourseChoice.mode === "NEW") {
        const newName = trainingCourseChoice.newName.trim();

        if (!newName) {
          showNotice("warning", "Vui lòng nhập tên Khóa đào tạo mới.");

          return;
        }

        const createResponse = await axios.post(
          `${API_URL}/training-courses`,
          {
            training_course_name: newName,

            description: trainingCourseChoice.newDescription.trim() || null,

            status: "ACTIVE",
          },
          authConfig,
        );

        const createdData = createResponse.data?.data;

        trainingCourseId =
          createdData?.id ?? createdData?.training_course_id ?? null;

        if (!trainingCourseId) {
          throw new Error(
            "Đã tạo Khóa đào tạo nhưng không nhận được mã Khóa đào tạo.",
          );
        }
      }

      // =====================================
      // SAU KHI ĐÃ CÓ KHÓA ĐÀO TẠO
      // MỚI TẠO LỚP + IMPORT
      //
      // programId là tên field CŨ backend
      // vẫn dùng tạm để không phá luồng import.
      // =====================================
      const detectedProgramId =
        result?.programId ?? fileData?.programId ?? null;

      const response = await axios.post(
        `${API_URL}/sihub-import/create-course-and-continue`,
        {
          // ID legacy mà backend hiện tại vẫn dùng
          // phải lấy đúng ID backend đã nhận diện từ Excel
          programId: detectedProgramId,

          fileData: {
            ...fileData,

            // Đây mới là Khóa đào tạo mà Admin vừa chọn
            trainingCourseId: trainingCourseId,
            training_course_id: trainingCourseId,
          },
        },
      );

      const importResult = response.data?.data;

      updatePreviewItem(index, {
        importStatus: FILE_STATUS.SUCCESS,

        importResult,

        importError: null,
      });

      setPendingConfirm(null);

      setTrainingCourseChoice({
        mode: "EXISTING",
        existingId: "",
        newName: "",
        newDescription: "",
      });

      showNotice(
        "success",
        response.data?.message ||
          `Đã xử lý lớp "${result.courseName}" và tiếp tục import thành công.`,
      );

      // Tiếp tục các sheet phía sau
      await importFilesFromIndex(index + 1);
    } catch (error) {
      console.error("Tạo khóa/lớp và tiếp tục import lỗi:", error);

      const errorData = error.response?.data;
      const isStudentConflict =
        errorData?.code === "STUDENT_PHONE_CONFLICT" ||
        errorData?.code === "STUDENT_IDENTITY_CONFLICT" ||
        errorData?.code === "STUDENT_NAME_CONFLICT" ||
        errorData?.code === "EVENT_PARTICIPANT_NAME_REQUIRED" ||
        errorData?.code === "EVENT_PARTICIPANT_CONTACT_REQUIRED";
      if (isStudentConflict) {
        setImportConflict({
          ...errorData,
          itemIndex: index,
        });

        updatePreviewItem(index, {
          importStatus: FILE_STATUS.ERROR,

          importError: null,

          importResult: null,
        });

        setPendingConfirm(null);

        showNotice(
          "warning",
          errorData?.message ||
            "Có dữ liệu học viên bị xung đột. Vui lòng kiểm tra và sửa.",
        );

        return;
      }

      updatePreviewItem(index, {
        importStatus: FILE_STATUS.ERROR,

        importError:
          errorData?.message || error.message || "Không thể tiếp tục import.",
      });

      showNotice(
        "error",
        errorData?.message || error.message || "Không thể tiếp tục import.",
      );
    } finally {
      setCreatingCourse(false);
    }
  };

  // Bỏ qua file thiếu khóa nhưng vẫn tiếp tục file sau
  const handleSkipPendingFile = async () => {
    if (!pendingConfirm) {
      return;
    }

    const { index } = pendingConfirm;

    updatePreviewItem(index, {
      importStatus: FILE_STATUS.SKIPPED,
    });

    setPendingConfirm(null);

    showNotice(
      "warning",
      "Đã bỏ qua file này và tiếp tục xử lý các file còn lại.",
    );

    await importFilesFromIndex(index + 1);
  };

  const retrySingleFile = async (index) => {
    updatePreviewItem(index, {
      importStatus: FILE_STATUS.READY,
      importError: null,
      importResult: null,
    });

    await importFilesFromIndex(index);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-[1500px] space-y-6">
        {/* HEADER */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-600">
                <Database size={18} />
                IMPORT DỮ LIỆU SIHUB
              </div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Import dữ liệu đào tạo và sự kiện từ Excel
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Hệ thống tự động đọc Khóa đào tạo, Lớp học, Triển lãm, Hội thảo,
                Sự kiện kết nối và danh sách người tham gia. Những dữ liệu chưa
                rõ hoặc có lỗi sẽ được hiển thị để Admin kiểm tra và chỉnh sửa
                trước khi import.
              </p>
            </div>

            <button
              type="button"
              onClick={resetImport}
              disabled={loadingPreview || loadingImport || creatingCourse}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw size={18} />
              Làm mới
            </button>
          </div>
        </section>
        {/* =====================================================
    CHỌN NGUỒN IMPORT
===================================================== */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Chọn nguồn dữ liệu
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Chọn loại file mà Admin muốn xử lý.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {/* EXCEL SIHUB */}
            <button
              type="button"
              onClick={() => setImportSource("SIHUB_EXCEL")}
              className={`rounded-2xl border p-5 text-left transition ${
                importSource === "SIHUB_EXCEL"
                  ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100"
                  : "border-slate-200 bg-white hover:border-emerald-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <FileSpreadsheet size={22} />
                </div>

                <div>
                  <p className="font-bold text-slate-900">Excel SIHUB</p>

                  <p className="mt-1 text-sm text-slate-500">
                    Dùng cấu trúc Excel SIHUB hiện tại.
                  </p>
                </div>
              </div>
            </button>

            {/* GOOGLE FORM */}
            <button
              type="button"
              onClick={() => {
                setImportSource("GOOGLE_FORM");

                clearNotice();

                setPendingConfirm(null);
                setImportConflict(null);
                setEditingConflictRow(null);
                setEventParentConfirm(null);
              }}
              className={`rounded-2xl border p-5 text-left transition ${
                importSource === "GOOGLE_FORM"
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                  : "border-slate-200 bg-white hover:border-blue-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <Upload size={22} />
                </div>

                <div>
                  <p className="font-bold text-slate-900">Google Form</p>

                  <p className="mt-1 text-sm text-slate-500">
                    Dùng file Excel xuất trực tiếp từ Google Form.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </section>
        {/* THÔNG BÁO */}
        {notice.message && (
          <section
            className={`flex items-start justify-between gap-4 rounded-2xl border p-4 ${
              notice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : notice.type === "warning"
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            <div className="flex items-start gap-3">
              {notice.type === "success" ? (
                <CheckCircle2 className="mt-0.5 shrink-0" size={20} />
              ) : notice.type === "warning" ? (
                <AlertTriangle className="mt-0.5 shrink-0" size={20} />
              ) : (
                <AlertCircle className="mt-0.5 shrink-0" size={20} />
              )}

              <p className="text-sm font-medium leading-6">{notice.message}</p>
            </div>

            <button
              type="button"
              onClick={clearNotice}
              className="shrink-0 rounded-lg p-1 hover:bg-black/5"
            >
              <X size={18} />
            </button>
          </section>
        )}

        {/* KHU VỰC UPLOAD */}
        {importSource === "SIHUB_EXCEL" && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <div>
                <label
                  htmlFor="sihub-excel-files"
                  className="group flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center transition hover:border-emerald-400 hover:bg-emerald-50/40"
                >
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 transition group-hover:scale-105">
                    <Upload size={30} />
                  </div>

                  <p className="text-lg font-bold text-slate-900">
                    Chọn nhiều file Excel
                  </p>

                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Hỗ trợ định dạng .xlsx và .xls. Mỗi file tối đa 10 MB, tối
                    đa 50 file trong một lần.
                  </p>

                  <span className="mt-5 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm">
                    Chọn file từ máy
                  </span>
                </label>

                <input
                  ref={inputRef}
                  id="sihub-excel-files"
                  type="file"
                  accept=".xlsx,.xls"
                  multiple
                  onChange={handleChooseFiles}
                  className="hidden"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="font-bold text-slate-900">Quy trình xử lý</h2>

                <div className="mt-5 space-y-4 text-sm text-slate-600">
                  {[
                    "Chọn một hoặc nhiều file Excel dữ liệu SIHUB.",
                    "Hệ thống tự nhận diện Khóa đào tạo, Triển lãm, Hội thảo và Sự kiện kết nối.",
                    "Kiểm tra người tham gia, dữ liệu lỗi, trùng hoặc xung đột.",
                    "Admin chỉnh sửa hoặc xác nhận những dữ liệu chưa chắc chắn trước khi import.",
                  ].map((text, index) => (
                    <div key={text} className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white font-bold text-emerald-600 shadow-sm">
                        {index + 1}
                      </span>

                      <p className="pt-1 leading-5">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* FILE ĐÃ CHỌN */}
            {selectedFiles.length > 0 && (
              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <h2 className="font-bold text-slate-900">
                    File đã chọn ({selectedFiles.length})
                  </h2>

                  <button
                    type="button"
                    onClick={handlePreview}
                    disabled={loadingPreview || loadingImport}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingPreview ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <FileSpreadsheet size={18} />
                    )}

                    {loadingPreview ? "Đang đọc Excel..." : "Kiểm tra dữ liệu"}
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${file.lastModified}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                          <FileSpreadsheet size={20} />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {file.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeSelectedFile(index)}
                        disabled={loadingPreview || loadingImport}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
        {importSource === "GOOGLE_FORM" && <GoogleFormImportPanel />}
        {/* THỐNG KÊ PREVIEW */}
        {importSource === "SIHUB_EXCEL" && hasPreview && (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              {
                label: "Tổng sheet",
                value: previewItems.length,
                icon: FileSpreadsheet,
              },
              {
                label: "Học viên đào tạo",
                value: totalTrainingStudents,
                icon: Users,
              },
              {
                label: "Người tham dự sự kiện",
                value: totalEventParticipants,
                icon: Users,
              },
              {
                label: "Dữ liệu cần kiểm tra",
                value: totalIssues,
                icon: AlertTriangle,
              },
              {
                label: "Đã import",
                value: importedFiles,
                icon: CheckCircle2,
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{item.label}</p>

                      <p className="mt-2 text-3xl font-bold text-slate-900">
                        {item.value}
                      </p>
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                      <Icon size={23} />
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        )}
        {importSource === "SIHUB_EXCEL" && importConflict && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-bold text-amber-800">
                  Cần kiểm tra dữ liệu học viên
                </p>

                <p className="mt-2 text-sm leading-6 text-amber-700">
                  {importConflict.message}
                </p>

                {importConflict.details && (
                  <div className="mt-3 space-y-1 text-sm text-slate-700">
                    <p>
                      <b>Sheet:</b> {importConflict.details.sheetName}
                    </p>

                    <p>
                      <b>Dòng học viên:</b>{" "}
                      {importConflict.details.studentIndex}
                    </p>

                    <p>
                      <b>Học viên:</b> {importConflict.details.fullname}
                    </p>

                    <p>
                      <b>Email:</b> {importConflict.details.email || "—"}
                    </p>

                    <p>
                      <b>SĐT:</b> {importConflict.details.phone || "—"}
                    </p>
                  </div>
                )}

                {importConflict.code === "STUDENT_PHONE_CONFLICT" &&
                  importConflict.details && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-sm font-bold text-emerald-800">
                        Hệ thống tìm thấy hồ sơ theo số điện thoại
                      </p>

                      <div className="mt-3 space-y-1 text-sm text-slate-700">
                        <p>
                          <b>Họ tên:</b>{" "}
                          {importConflict.details.phoneUserName || "—"}
                        </p>

                        <p>
                          <b>Email đang lưu:</b>{" "}
                          {importConflict.details.phoneUserEmail || "—"}
                        </p>

                        <p>
                          <b>SĐT:</b> {importConflict.details.phone || "—"}
                        </p>
                      </div>
                    </div>
                  )}
                {importConflict.code === "STUDENT_PHONE_CONFLICT" && (
                  <button
                    type="button"
                    onClick={() => handleUseConflictProfile("PHONE")}
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Dùng hồ sơ hiện có
                  </button>
                )}
                {importConflict.code === "STUDENT_NAME_CONFLICT" && (
                  <button
                    type="button"
                    onClick={() => handleUseConflictProfile("EXISTING")}
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Dùng hồ sơ đang có
                  </button>
                )}
                <div className="flex shrink-0 flex-col gap-2">
                  {importConflict.code === "STUDENT_IDENTITY_CONFLICT" && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleUseConflictProfile("EMAIL")}
                        className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        Dùng hồ sơ theo Email
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUseConflictProfile("PHONE")}
                        className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                      >
                        Dùng hồ sơ theo SĐT
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      const conflict = getConflictStudent();

                      if (!conflict) {
                        showNotice(
                          "error",
                          "Không tìm thấy dòng dữ liệu cần sửa.",
                        );

                        return;
                      }

                      setEditingConflictRow({
                        ...conflict,

                        form: {
                          ...conflict.student,
                        },
                      });
                    }}
                    className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
                  >
                    Tự chỉnh sửa
                  </button>
                </div>
              </div>

              {importConflict.code === "STUDENT_NAME_CONFLICT" && (
                <button
                  type="button"
                  onClick={() => handleUseConflictProfile("EXISTING")}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Dùng hồ sơ đang có
                </button>
              )}
            </div>
          </div>
        )}
        {/* DANH SÁCH PREVIEW */}
        {importSource === "SIHUB_EXCEL" && hasPreview && (
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Kết quả kiểm tra Excel
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Kiểm tra kỹ khóa đào tạo, lớp học, đợt tổ chức và số lượng học
                  viên trước khi import.
                </p>
              </div>

              <button
                type="button"
                onClick={handleStartImport}
                disabled={
                  loadingImport ||
                  loadingPreview ||
                  creatingCourse ||
                  previewItems.every(
                    (item) =>
                      item.importStatus === FILE_STATUS.SUCCESS ||
                      item.importStatus === FILE_STATUS.SKIPPED,
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingImport ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Database size={18} />
                )}

                {loadingImport ? "Đang import..." : "Tiến hành import"}
              </button>
            </div>

            <div className="space-y-4 p-5">
              {previewItems.map((item, index) => {
                const result = item.importResult;

                return (
                  <article
                    key={item.localId}
                    className="rounded-2xl border border-slate-200 bg-white p-5"
                  >
                    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <FileSpreadsheet size={22} />
                          </div>

                          <div className="min-w-0">
                            {/* TÊN FILE */}
                            <h3 className="break-words font-bold text-slate-900">
                              {item.fileName}
                            </h3>

                            {/* TÊN SHEET */}
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              Sheet: {item.sheetName || "Không xác định"}
                            </p>

                            {/* LOẠI DỮ LIỆU + TÊN LỚP / TÊN SỰ KIỆN */}
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {/* BADGE LOẠI DỮ LIỆU */}
                              <span
                                className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                                  item.importType === "STARTUP_EXHIBITION"
                                    ? "border-violet-200 bg-violet-50 text-violet-700"
                                    : item.importType === "STARTUP_SEMINAR"
                                      ? "border-blue-200 bg-blue-50 text-blue-700"
                                      : item.importType === "NETWORKING_EVENT"
                                        ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                                        : item.importType === "TRAINING"
                                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                          : "border-amber-200 bg-amber-50 text-amber-700"
                                }`}
                              >
                                {getImportTypeLabel(item)}
                              </span>

                              {/* TÊN THỰC TẾ */}
                              <p className="break-words text-sm font-semibold text-emerald-700">
                                {getItemTitle(item)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                          {isTrainingItem(item) ? (
                            <>
                              <InfoBox
                                label="Khóa đào tạo"
                                value={cleanDisplayText(
                                  item.class?.programName,
                                  [/^Thuộc\s+/i],
                                )}
                              />

                              <InfoBox
                                label="Lớp học"
                                value={
                                  item.class?.className ||
                                  "Chưa xác định lớp học"
                                }
                              />

                              <InfoBox
                                label="Thời gian"
                                value={cleanDisplayText(item.class?.schedule, [
                                  /^Thời gian\s*:?\s*/i,
                                ])}
                              />

                              <InfoBox
                                label="Địa điểm"
                                value={cleanDisplayText(item.class?.location, [
                                  /^Địa điểm\s*:?\s*/i,
                                ])}
                              />

                              <CountInfoBox
                                label="Học viên"
                                value={item.totalStudents || 0}
                              />
                            </>
                          ) : (
                            <>
                              <InfoBox
                                label="Loại"
                                value={getImportTypeLabel(item)}
                              />

                              <InfoBox
                                label="Tên sự kiện"
                                value={item.event?.eventName || "Chưa xác định"}
                              />

                              {item.importType === "STARTUP_SEMINAR" ? (
                                <InfoBox
                                  label="Thuộc Triển lãm"
                                  value={
                                    item.event?.parentEventName ||
                                    item.parentMatch?.parentEventName ||
                                    "Chưa xác định"
                                  }
                                />
                              ) : item.importType === "NETWORKING_EVENT" ? (
                                <InfoBox
                                  label="Nhóm sự kiện"
                                  value="Sự kiện kết nối"
                                />
                              ) : (
                                <InfoBox
                                  label="Nhóm sự kiện"
                                  value="Triển lãm"
                                />
                              )}
                              <InfoBox
                                label="Thời gian"
                                value={
                                  item.event?.schedule || "Chưa có thông tin"
                                }
                              />

                              <CountInfoBox
                                label="Người tham dự"
                                value={
                                  item.totalParticipants ??
                                  item.totalStudents ??
                                  0
                                }
                              />
                            </>
                          )}
                        </div>

                        <StudentEditor
                          item={item}
                          itemIndex={index}
                          updateStudentField={updateStudentField}
                          removeStudent={removeStudent}
                          importConflict={importConflict}
                          disabled={
                            loadingImport ||
                            loadingPreview ||
                            creatingCourse ||
                            item.importStatus === FILE_STATUS.IMPORTING ||
                            item.importStatus === FILE_STATUS.SUCCESS
                          }
                        />
                        {result && !result.needConfirm && (
                          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <ResultBox
                              label="Học viên mới"
                              value={result.createdUsers}
                            />

                            <ResultBox
                              label="Học viên đã có"
                              value={result.existedUsers}
                            />

                            <ResultBox
                              label="Đăng ký mới"
                              value={result.createdRegistrations}
                            />

                            <ResultBox
                              label="Đăng ký đã có"
                              value={result.existedRegistrations}
                            />
                          </div>
                        )}

                        {item.importError && (
                          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                            {item.importError}
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-3">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold ${getStatusClass(
                            item.importStatus,
                          )}`}
                        >
                          {item.importStatus === FILE_STATUS.IMPORTING && (
                            <Loader2 className="animate-spin" size={14} />
                          )}

                          {item.importStatus === FILE_STATUS.SUCCESS && (
                            <CheckCircle2 size={14} />
                          )}

                          {item.importStatus === FILE_STATUS.NEED_CONFIRM && (
                            <AlertTriangle size={14} />
                          )}

                          {item.importStatus === FILE_STATUS.ERROR && (
                            <AlertCircle size={14} />
                          )}

                          {getStatusLabel(item.importStatus)}
                        </span>

                        {item.importStatus === FILE_STATUS.ERROR && (
                          <button
                            type="button"
                            onClick={() => retrySingleFile(index)}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <RotateCcw size={15} />
                            Thử lại
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
      {/* MODAL CHỌN TRIỂN LÃM CHA CHO HỘI THẢO */}
      {importSource === "SIHUB_EXCEL" && eventParentConfirm && (
        <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Xác nhận loại sự kiện
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Dữ liệu Excel chưa đủ rõ. Vui lòng xác nhận sự kiện này thuộc
                  nhóm nào.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEventParentConfirm(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-400">
                  Sự kiện trong Excel
                </p>

                <p className="mt-2 font-bold leading-6 text-slate-800">
                  {eventParentConfirm.seminarName}
                </p>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-bold text-slate-800">
                  Sự kiện này thuộc nhóm nào?
                </p>

                {/* =====================================================
      HỘI THẢO THUỘC TRIỂN LÃM
  ===================================================== */}
                <label
                  className={`block cursor-pointer rounded-2xl border p-4 transition ${
                    eventParentMode === "EXHIBITION"
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="event-parent-mode"
                      checked={eventParentMode === "EXHIBITION"}
                      onChange={() => setEventParentMode("EXHIBITION")}
                      className="mt-1 accent-emerald-600"
                    />

                    <div>
                      <p className="font-bold text-slate-900">
                        Hội thảo thuộc Triển lãm
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Chọn khi đây là Hội thảo nằm trong một Triển lãm của
                        Startup Connection Day.
                      </p>
                    </div>
                  </div>
                </label>

                {/* =====================================================
      SỰ KIỆN KẾT NỐI
  ===================================================== */}
                <label
                  className={`block cursor-pointer rounded-2xl border p-4 transition ${
                    eventParentMode === "NETWORKING"
                      ? "border-cyan-400 bg-cyan-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="event-parent-mode"
                      checked={eventParentMode === "NETWORKING"}
                      onChange={() => setEventParentMode("NETWORKING")}
                      className="mt-1 accent-cyan-600"
                    />

                    <div>
                      <p className="font-bold text-slate-900">
                        Sự kiện kết nối
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Chọn khi sự kiện này là Founder Meetup, CEO Talk, phiên
                        kết nối doanh nghiệp hoặc hoạt động kết nối độc lập.
                      </p>
                    </div>
                  </div>
                </label>

                {eventParentMode === "EXHIBITION" && (
                  <>
                    {/* CHỌN TRIỂN LÃM ĐÃ CÓ */}
                    <label
                      className={`block cursor-pointer rounded-2xl border p-4 transition ${
                        exhibitionChoice.mode === "EXISTING"
                          ? "border-emerald-400 bg-emerald-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="exhibition-choice"
                          checked={exhibitionChoice.mode === "EXISTING"}
                          onChange={() =>
                            setExhibitionChoice((previous) => ({
                              ...previous,
                              mode: "EXISTING",
                            }))
                          }
                          className="mt-1 accent-emerald-600"
                        />

                        <div className="flex-1">
                          <p className="font-bold text-slate-900">
                            Chọn Triển lãm đã có
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            Dùng khi Triển lãm đã tồn tại trong hệ thống.
                          </p>

                          {exhibitionChoice.mode === "EXISTING" && (
                            <div className="mt-4">
                              {exhibitionLoading ? (
                                <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm text-slate-500">
                                  <Loader2 size={17} className="animate-spin" />
                                  Đang tải Triển lãm...
                                </div>
                              ) : (
                                <select
                                  value={exhibitionChoice.existingId}
                                  onChange={(event) =>
                                    setExhibitionChoice((previous) => ({
                                      ...previous,
                                      existingId: event.target.value,
                                    }))
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                                >
                                  <option value="">-- Chọn Triển lãm --</option>

                                  {existingExhibitions.map((exhibition) => (
                                    <option
                                      key={exhibition.id}
                                      value={exhibition.id}
                                    >
                                      {exhibition.event_name}
                                    </option>
                                  ))}
                                </select>
                              )}

                              {!exhibitionLoading &&
                                existingExhibitions.length === 0 && (
                                  <p className="mt-2 text-sm font-medium text-amber-700">
                                    Hiện chưa có Triển lãm nào trong hệ thống.
                                    Bạn có thể chọn “Tạo Triển lãm mới”.
                                  </p>
                                )}
                            </div>
                          )}
                        </div>
                      </div>
                    </label>

                    {/* TẠO TRIỂN LÃM MỚI */}
                    <label
                      className={`block cursor-pointer rounded-2xl border p-4 transition ${
                        exhibitionChoice.mode === "NEW"
                          ? "border-blue-400 bg-blue-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="exhibition-choice"
                          checked={exhibitionChoice.mode === "NEW"}
                          onChange={() =>
                            setExhibitionChoice((previous) => ({
                              ...previous,
                              mode: "NEW",
                            }))
                          }
                          className="mt-1 accent-blue-600"
                        />

                        <div className="flex-1">
                          <p className="font-bold text-slate-900">
                            Tạo Triển lãm mới
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            Dùng khi Hội thảo thuộc một Triển lãm chưa có trong
                            hệ thống.
                          </p>

                          {exhibitionChoice.mode === "NEW" && (
                            <div className="mt-4 space-y-3">
                              <input
                                value={exhibitionChoice.newName}
                                onChange={(event) =>
                                  setExhibitionChoice((previous) => ({
                                    ...previous,
                                    newName: event.target.value,
                                  }))
                                }
                                placeholder="Nhập tên Triển lãm..."
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                              />

                              <input
                                value={exhibitionChoice.newLocation}
                                onChange={(event) =>
                                  setExhibitionChoice((previous) => ({
                                    ...previous,
                                    newLocation: event.target.value,
                                  }))
                                }
                                placeholder="Địa điểm (không bắt buộc)"
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </label>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
              <button
                type="button"
                onClick={() => setEventParentConfirm(null)}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleConfirmEventParent}
                disabled={
                  eventParentMode === "NETWORKING"
                    ? false
                    : exhibitionChoice.mode === "EXISTING"
                      ? !exhibitionChoice.existingId
                      : !exhibitionChoice.newName.trim()
                }
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ==================================================
    MODAL XÁC ĐỊNH KHÓA ĐÀO TẠO
    Thiết kế đơn giản cho người dùng không chuyên
================================================== */}
      {importSource === "SIHUB_EXCEL" && pendingConfirm && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            {/* HEADER */}
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <AlertTriangle size={24} />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Chưa xác định Khóa đào tạo
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Hệ thống đã đọc được lớp học nhưng chưa biết lớp này thuộc
                    Khóa đào tạo nào.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={creatingCourse}
                onClick={() => setPendingConfirm(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {/* LỚP HỌC ĐÃ ĐỌC ĐƯỢC */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                  Lớp học trong file Excel
                </p>

                <p className="mt-2 text-lg font-bold leading-7 text-slate-900">
                  {pendingConfirm.result?.courseName ||
                    pendingConfirm.fileData?.class?.className ||
                    "Chưa đọc được tên lớp"}
                </p>
              </div>

              {/* HƯỚNG DẪN */}
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="font-bold text-slate-800">Bạn muốn làm gì?</p>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Nếu Khóa đào tạo đã có trong hệ thống, hãy chọn Khóa đào tạo
                  đó. Nếu chưa có, bạn có thể tạo mới ngay tại đây.
                </p>
              </div>

              {/* ==================================
            LỰA CHỌN 1
            KHÓA ĐÃ CÓ
        ================================== */}
              <label
                className={`block cursor-pointer rounded-2xl border p-5 transition ${
                  trainingCourseChoice.mode === "EXISTING"
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-slate-200 bg-white hover:border-emerald-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="training-course-choice"
                    checked={trainingCourseChoice.mode === "EXISTING"}
                    onChange={() =>
                      setTrainingCourseChoice((previous) => ({
                        ...previous,
                        mode: "EXISTING",
                      }))
                    }
                    className="mt-1 h-4 w-4 accent-emerald-600"
                  />

                  <div className="flex-1">
                    <p className="font-bold text-slate-900">
                      Chọn Khóa đào tạo đã có
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Dùng khi Khóa đào tạo đã được tạo trong hệ thống.
                    </p>
                  </div>
                </div>

                {trainingCourseChoice.mode === "EXISTING" && (
                  <div className="mt-4">
                    {trainingCourseLoading ? (
                      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                        <Loader2 className="animate-spin" size={17} />
                        Đang tải danh sách...
                      </div>
                    ) : (
                      <select
                        value={trainingCourseChoice.existingId}
                        onChange={(event) =>
                          setTrainingCourseChoice((previous) => ({
                            ...previous,

                            existingId: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      >
                        <option value="">-- Chọn Khóa đào tạo --</option>

                        {trainingCourses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.training_course_name ||
                              course.course_name ||
                              `Khóa đào tạo #${course.id}`}
                          </option>
                        ))}
                      </select>
                    )}

                    {!trainingCourseLoading && trainingCourses.length === 0 && (
                      <p className="mt-2 text-sm font-medium text-amber-700">
                        Hiện chưa có Khóa đào tạo nào trong hệ thống. Bạn có thể
                        chọn “Tạo Khóa đào tạo mới”.
                      </p>
                    )}
                  </div>
                )}
              </label>

              {/* ==================================
            LỰA CHỌN 2
            TẠO KHÓA MỚI
        ================================== */}
              <label
                className={`block cursor-pointer rounded-2xl border p-5 transition ${
                  trainingCourseChoice.mode === "NEW"
                    ? "border-blue-400 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-blue-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="training-course-choice"
                    checked={trainingCourseChoice.mode === "NEW"}
                    onChange={() =>
                      setTrainingCourseChoice((previous) => ({
                        ...previous,
                        mode: "NEW",
                      }))
                    }
                    className="mt-1 h-4 w-4 accent-blue-600"
                  />

                  <div className="flex-1">
                    <p className="font-bold text-slate-900">
                      Tạo Khóa đào tạo mới
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Dùng khi Khóa đào tạo này chưa có trong hệ thống.
                    </p>
                  </div>
                </div>

                {trainingCourseChoice.mode === "NEW" && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Tên Khóa đào tạo
                        <span className="text-red-500"> *</span>
                      </label>

                      <input
                        value={trainingCourseChoice.newName}
                        onChange={(event) =>
                          setTrainingCourseChoice((previous) => ({
                            ...previous,

                            newName: event.target.value,
                          }))
                        }
                        placeholder="Nhập tên Khóa đào tạo..."
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Mô tả
                        <span className="ml-1 font-normal text-slate-400">
                          (không bắt buộc)
                        </span>
                      </label>

                      <textarea
                        rows={3}
                        value={trainingCourseChoice.newDescription}
                        onChange={(event) =>
                          setTrainingCourseChoice((previous) => ({
                            ...previous,

                            newDescription: event.target.value,
                          }))
                        }
                        placeholder="Có thể để trống nếu chưa có thông tin."
                        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                  </div>
                )}
              </label>

              {/* GIẢI THÍCH CUỐI */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm leading-6 text-slate-600">
                  Sau khi xác nhận, hệ thống sẽ tạo lớp học và tiếp tục xử lý
                  <strong>
                    {" "}
                    {pendingConfirm.fileData?.totalStudents || 0} học viên
                  </strong>
                  . Bạn không cần tải lại file Excel.
                </p>
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={creatingCourse}
                onClick={handleSkipPendingFile}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Bỏ qua lớp này
              </button>

              <button
                type="button"
                disabled={
                  creatingCourse ||
                  (trainingCourseChoice.mode === "EXISTING" &&
                    !trainingCourseChoice.existingId) ||
                  (trainingCourseChoice.mode === "NEW" &&
                    !trainingCourseChoice.newName.trim())
                }
                onClick={handleCreateCourseAndContinue}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingCourse ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Xác nhận và tiếp tục
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL SỬA HỌC VIÊN BỊ XUNG ĐỘT */}

      {importSource === "SIHUB_EXCEL" && editingConflictRow && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            {/* HEADER */}

            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Sửa dữ liệu học viên
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Dữ liệu được sửa trực tiếp trên bản Preview. File Excel đã
                  chọn vẫn được giữ nguyên.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingConflictRow(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* NỘI DUNG */}

            <div className="space-y-5 p-6">
              {importConflict?.message && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800">
                    {importConflict.message}
                  </p>

                  {importConflict.code === "STUDENT_PHONE_CONFLICT" &&
                    importConflict.details && (
                      <p className="mt-2 text-sm leading-6 text-amber-700">
                        SĐT hiện đang thuộc học viên{" "}
                        <b>{importConflict.details.phoneUserName}</b>
                        {importConflict.details.phoneUserEmail
                          ? ` (${importConflict.details.phoneUserEmail})`
                          : ""}
                        .
                      </p>
                    )}
                </div>
              )}

              {/* HỌ TÊN */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Họ và tên
                </label>

                <input
                  value={editingConflictRow.form.fullname || ""}
                  onChange={(event) =>
                    setEditingConflictRow((previous) => ({
                      ...previous,

                      form: {
                        ...previous.form,

                        fullname: event.target.value,
                      },
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              {/* EMAIL */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email
                </label>

                <input
                  value={editingConflictRow.form.email || ""}
                  onChange={(event) =>
                    setEditingConflictRow((previous) => ({
                      ...previous,

                      form: {
                        ...previous.form,

                        email: event.target.value,
                      },
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              {/* SĐT */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Số điện thoại
                </label>

                <input
                  value={editingConflictRow.form.phone || ""}
                  onChange={(event) =>
                    setEditingConflictRow((previous) => ({
                      ...previous,

                      form: {
                        ...previous.form,

                        phone: event.target.value,
                      },
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              {/* ĐƠN VỊ */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Đơn vị
                </label>

                <input
                  value={editingConflictRow.form.organization || ""}
                  onChange={(event) =>
                    setEditingConflictRow((previous) => ({
                      ...previous,

                      form: {
                        ...previous.form,

                        organization: event.target.value,
                      },
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>
            </div>

            {/* FOOTER */}

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
              <button
                type="button"
                onClick={() => setEditingConflictRow(null)}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleSaveConflictRow}
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function StudentEditor({
  item,
  itemIndex,
  updateStudentField,
  removeStudent,
  importConflict,
  disabled,
}) {
  const [expanded, setExpanded] = useState(false);
  const [studentFilter, setStudentFilter] = useState("ALL");
  const [studentKeyword, setStudentKeyword] = useState("");

  const students = Array.isArray(item.students) ? item.students : [];
  const validationMap = useMemo(() => {
    const map = new Map();

    const rows = item.participantValidation?.rows || [];

    rows.forEach((row) => {
      const messages = [
        ...(row.errors || []).map((error) => error.message || error.code),

        ...(row.warnings || []).map(
          (warning) => warning.message || warning.code,
        ),
      ];

      const key = getParticipantValidationKey(row.participant);

      map.set(key, messages);
    });

    return map;
  }, [item.participantValidation]);
  const validCount = useMemo(
    () =>
      students.filter((student) => getStudentErrors(student, item).length === 0)
        .length,
    [students],
  );

  const invalidCount = students.length - validCount;

  const filteredStudents = useMemo(() => {
    const normalizedKeyword = studentKeyword.trim().toLowerCase();

    return students
      .map((student, originalIndex) => ({
        student,
        originalIndex,
        errors: getStudentErrors(student, item),
      }))
      .filter(({ student, errors }) => {
        const matchesStatus =
          studentFilter === "ALL" ||
          (studentFilter === "VALID" && errors.length === 0) ||
          (studentFilter === "INVALID" && errors.length > 0);

        if (!matchesStatus) {
          return false;
        }

        if (!normalizedKeyword) {
          return true;
        }

        const searchableText = [
          student.fullname,
          student.phone,
          student.email,
          student.organization,
        ]
          .map((value) => String(value || "").toLowerCase())
          .join(" ");

        return searchableText.includes(normalizedKeyword);
      });
  }, [students, studentFilter, studentKeyword]);

  const progress =
    students.length > 0 ? Math.round((validCount / students.length) * 100) : 0;

  const filterButtons = [
    {
      key: "ALL",
      label: "Tất cả",
      count: students.length,
    },
    {
      key: "VALID",
      label: "Hợp lệ",
      count: validCount,
    },
    {
      key: "INVALID",
      label: "Có lỗi",
      count: invalidCount,
    },
  ];

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-4 bg-slate-50 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-bold text-slate-900">
              {isTrainingItem(item)
                ? "Kiểm tra và chỉnh sửa học viên"
                : "Kiểm tra và chỉnh sửa người tham dự"}
            </h4>

            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-600">
              {students.length} dòng
            </span>

            {invalidCount > 0 ? (
              <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                {invalidCount} dòng lỗi
              </span>
            ) : (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                Tất cả hợp lệ
              </span>
            )}
          </div>

          <div className="mt-3 flex max-w-xl items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <span className="shrink-0 text-xs font-bold text-slate-600">
              {validCount}/{students.length} hợp lệ
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
        >
          {expanded ? (
            <>
              <ChevronUp size={17} />
              Thu gọn
            </>
          ) : (
            <>
              <ChevronDown size={17} />
              Xem chi tiết
            </>
          )}
        </button>
      </div>

      {expanded && (
        <>
          <div className="grid gap-3 border-t border-slate-200 bg-white p-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <label className="relative block">
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={studentKeyword}
                onChange={(event) => setStudentKeyword(event.target.value)}
                placeholder="Tìm theo họ tên, số điện thoại, email hoặc đơn vị..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {filterButtons.map((filter) => {
                const active = studentFilter === filter.key;

                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setStudentFilter(filter.key)}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                      active
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                    }`}
                  >
                    {filter.label} ({filter.count})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="max-h-[600px] overflow-auto border-t border-slate-200">
            <table className="w-full min-w-[1050px]">
              <thead className="sticky top-0 z-20 bg-white shadow-sm">
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase text-slate-500">
                  <th className="sticky left-0 z-30 bg-white px-4 py-3">STT</th>
                  <th className="px-4 py-3">Họ và tên</th>
                  <th className="px-4 py-3">Số điện thoại</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Đơn vị</th>
                  <th className="px-4 py-3">Kiểm tra</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map(({ student, originalIndex, errors }) => {
                  const isBackendConflict =
                    importConflict?.itemIndex === itemIndex &&
                    importConflict?.details?.sheetName === item.sheetName &&
                    Number(importConflict?.details?.studentIndex) - 1 ===
                      originalIndex;

                  const displayErrors = [...errors];
                  const participantValidationKey =
                    getParticipantValidationKey(student);

                  const backendValidationErrors =
                    validationMap.get(participantValidationKey) || [];

                  backendValidationErrors.forEach((message) => {
                    if (!displayErrors.includes(message)) {
                      displayErrors.push(message);
                    }
                  });
                  if (
                    isBackendConflict &&
                    importConflict?.message &&
                    !displayErrors.includes(importConflict.message)
                  ) {
                    displayErrors.push(importConflict.message);
                  }

                  const hasError = displayErrors.length > 0;
                  return (
                    <tr
                      key={
                        student.localStudentId ||
                        `${item.localId}-${originalIndex}`
                      }
                      className={`border-b border-slate-100 text-sm ${
                        hasError ? "bg-red-50/60" : "bg-white"
                      }`}
                    >
                      <td
                        className={`sticky left-0 z-10 px-4 py-3 text-slate-500 ${
                          hasError ? "bg-red-50" : "bg-white"
                        }`}
                      >
                        {originalIndex + 1}
                      </td>

                      <td className="px-4 py-3">
                        <input
                          value={student.fullname || ""}
                          disabled={disabled}
                          onChange={(event) =>
                            updateStudentField(
                              itemIndex,
                              originalIndex,
                              "fullname",
                              event.target.value,
                            )
                          }
                          className={`w-full rounded-lg border px-3 py-2 outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100 ${
                            !String(student.fullname || "").trim()
                              ? "border-red-300 bg-red-50 focus:ring-red-100"
                              : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
                          }`}
                        />
                      </td>

                      <td className="px-4 py-3">
                        <input
                          value={student.phone || ""}
                          disabled={disabled}
                          onChange={(event) =>
                            updateStudentField(
                              itemIndex,
                              originalIndex,
                              "phone",
                              event.target.value,
                            )
                          }
                          placeholder={
                            isTrainingItem(item) ? "Bắt buộc" : "Không bắt buộc"
                          }
                          className={`w-full rounded-lg border px-3 py-2 outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100 ${
                            isTrainingItem(item) &&
                            !String(student.phone || "").trim()
                              ? "border-red-300 bg-red-50 focus:ring-red-100"
                              : errors.includes(
                                    "Số điện thoại chưa đúng định dạng",
                                  )
                                ? "border-red-300 bg-red-50 focus:ring-red-100"
                                : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
                          }`}
                        />
                      </td>

                      <td className="px-4 py-3">
                        <input
                          value={student.email || ""}
                          disabled={disabled}
                          onChange={(event) =>
                            updateStudentField(
                              itemIndex,
                              originalIndex,
                              "email",
                              event.target.value,
                            )
                          }
                          className={`w-full rounded-lg border px-3 py-2 outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100 ${
                            errors.includes("Email không đúng định dạng")
                              ? "border-red-300 bg-red-50 focus:ring-red-100"
                              : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-100"
                          }`}
                        />
                      </td>

                      <td className="px-4 py-3">
                        <input
                          value={student.organization || ""}
                          disabled={disabled}
                          onChange={(event) =>
                            updateStudentField(
                              itemIndex,
                              originalIndex,
                              "organization",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                        />
                      </td>

                      <td className="px-4 py-3">
                        {hasError ? (
                          <div className="space-y-1">
                            {displayErrors.map((error) => (
                              <p
                                key={error}
                                className="text-xs font-semibold text-red-600"
                              >
                                {error}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                            <CheckCircle2 size={15} />
                            Hợp lệ
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() =>
                              removeStudent(itemIndex, originalIndex)
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 size={15} />
                            Bỏ dòng này
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-sm text-slate-500"
                    >
                      {isTrainingItem(item)
                        ? "Không tìm thấy học viên phù hợp."
                        : "Không tìm thấy người tham dự phù hợp."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
function InfoBox({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>

      <p className="mt-2 text-sm font-medium leading-6 text-slate-700">
        {value || "Chưa có thông tin"}
      </p>
    </div>
  );
}

function CountInfoBox({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
        <Users size={15} />
        {label}
      </div>

      <p className="mt-2 text-2xl font-bold text-slate-900">
        {Number(value || 0)}
      </p>
    </div>
  );
}
function ResultBox({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>

      <p className="mt-2 text-xl font-bold text-slate-900">
        {Number(value || 0)}
      </p>
    </div>
  );
}

export default AdminImportClassStudent;
