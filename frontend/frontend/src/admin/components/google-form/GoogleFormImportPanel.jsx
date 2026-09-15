import GoogleFormTargetSelector from "./GoogleFormTargetSelector";
import GoogleFormFieldMapping from "./GoogleFormFieldMapping";
import { cleanGoogleFormRows } from "./googleFormDataCleaner";
import GoogleFormReviewStep from "./GoogleFormReviewStep";
import GoogleFormDatabaseReview from "./GoogleFormDatabaseReview";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

import {
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
// =====================================================
// DEV ONLY
//
// true  = chỉ commit 1 NEW user để test
// false = commit toàn bộ batch
// =====================================================

const TEST_COMMIT_ONE_NEW = false;
function GoogleFormImportPanel({ initialFile = null, onRemove = null, onFileState = null, batchDuplicateKeys = [], compact = false }) {
  const inputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(initialFile);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fieldMapping, setFieldMapping] = useState(null);
  const [preview, setPreview] = useState(null);

  const [selectedSheetName, setSelectedSheetName] = useState("");
  const [dbValidation, setDbValidation] = useState(null);

  const [validatingDb, setValidatingDb] = useState(false);
  const [committing, setCommitting] = useState(false);

  const [commitResult, setCommitResult] = useState(null);
  const [allowOverCapacity, setAllowOverCapacity] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [metadataDraft, setMetadataDraft] = useState(null);
  const [sheetMetadataDrafts, setSheetMetadataDrafts] = useState({});

  // =====================================================
  // SHEET ĐANG CHỌN
  // =====================================================

  const selectedSheet =
    preview?.sheets?.find((sheet) => sheet.sheetName === selectedSheetName) ||
    null;
  const selectedSheetDataRows = selectedSheet?.dataRows;
  const activeFieldMapping = fieldMapping?.mapping;
  const mappingIdentity = JSON.stringify({
    file: selectedFile
      ? [selectedFile.name, selectedFile.size, selectedFile.lastModified]
      : null,
    sheet: selectedSheet?.sheetName || null,
    headers: selectedSheet?.headers || [],
    targetType: selectedTarget?.type || null,
  });
  const isExhibition = selectedTarget?.type === "EXHIBITION";
  const isNetworking = selectedTarget?.type === "NETWORKING";
  const metadataReady = isExhibition
    ? Boolean(selectedTarget?.isComplete && selectedTarget?.eventId)
    : isNetworking
      ? Boolean(
          metadataDraft?.networkingEventName
          && Number.isInteger(Number(metadataDraft?.year)),
        )
      : Boolean(metadataDraft?.year);

  // =====================================================
  // CLEAN PREVIEW
  // =====================================================

  const cleanedPreview = useMemo(() => {
    if (
      !Array.isArray(selectedSheetDataRows) ||
      !activeFieldMapping ||
      fieldMapping.mappingIdentity !== mappingIdentity ||
      (!fieldMapping.isComplete && selectedTarget?.type !== "EXHIBITION") ||
      !selectedTarget?.isComplete
    ) {
      return null;
    }

    return cleanGoogleFormRows({
      dataRows: selectedSheetDataRows,
      mapping: activeFieldMapping,
      target: selectedTarget,
      batchDuplicateKeys,
    });
  }, [
    selectedSheetDataRows,
    mappingIdentity,
    activeFieldMapping,
    fieldMapping?.mappingIdentity,
    fieldMapping?.isComplete,
    selectedTarget,
    batchDuplicateKeys,
  ]);
  // =====================================================
  // CAPACITY PREVIEW
  //
  // Chỉ tính sau khi Database Validate.
  // openingInfo được TargetSelector trả về.
  // =====================================================

  const capacityPreview = useMemo(() => {
    if (!dbValidation || !selectedTarget?.openingInfo) {
      return null;
    }

    const currentStudents =
      Number(selectedTarget.openingInfo.current_students) || 0;

    const maxStudents = Number(selectedTarget.openingInfo.max_students) || 0;

    const readyToCommit = Number(dbValidation.summary?.readyToCommit) || 0;

    const projectedStudents = currentStudents + readyToCommit;

    return {
      currentStudents,
      maxStudents,
      readyToCommit,
      projectedStudents,

      exceeds: maxStudents > 0 && projectedStudents > maxStudents,
    };
  }, [dbValidation, selectedTarget?.openingInfo]);
  // =====================================================
  // TARGET CHANGE
  //
  // Dùng useCallback để giữ reference ổn định.
  // Nếu truyền inline function xuống component con,
  // useEffect của con sẽ chạy lại mỗi render.
  // =====================================================

  const handleTargetChange = useCallback((target) => {
    setSelectedTarget(target);

    setDbValidation(null);
    setCommitResult(null);

    // Target đổi => xác nhận capacity cũ hết hiệu lực.
    setAllowOverCapacity(false);
  }, []);

  // =====================================================
  // MAPPING CHANGE
  // =====================================================

  const handleMappingChange = useCallback((mapping) => {
    setFieldMapping(mapping);

    setDbValidation(null);
    setCommitResult(null);

    // Mapping đổi => số người import có thể đổi.
    setAllowOverCapacity(false);
  }, []);
  // =====================================================
  // CHỌN FILE
  // =====================================================

  const handleChooseFile = (event) => {
    const file = event.target.files?.[0] || null;

    setErrorMessage("");
    setPreview(null);
    setSelectedSheetName("");
    setFieldMapping(null);
    setSelectedTarget(null);
    setDbValidation(null);
    setAllowOverCapacity(false);
    setCommitResult(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const filename = String(file.name || "").toLowerCase();

    if (!filename.endsWith(".xlsx") && !filename.endsWith(".xls")) {
      setSelectedFile(null);

      setErrorMessage("Vui lòng chọn file Excel .xlsx hoặc .xls.");

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      return;
    }

    setSelectedFile(file);
  };

  // =====================================================
  // XÓA FILE
  // =====================================================

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreview(null);
    setSelectedSheetName("");
    setFieldMapping(null);
    setDbValidation(null);
    setSelectedTarget(null);
    setAllowOverCapacity(false);
    setCommitResult(null);
    setErrorMessage("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onRemove?.();
  };

  // =====================================================
  // PREVIEW
  // =====================================================

  const handlePreview = async () => {
    if (!selectedFile) {
      setErrorMessage("Vui lòng chọn file Google Form trước.");

      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      setPreview(null);
      setSelectedSheetName("");
      setFieldMapping(null);
      setDbValidation(null);
      setAllowOverCapacity(false);
      setSelectedTarget(null);
      setCommitResult(null);

      const formData = new FormData();

      formData.append("file", selectedFile);

      const response = await axios.post(
        `${API_URL}/google-form-import/preview`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      const data = response.data?.data;

      if (!data) {
        throw new Error("Backend không trả về dữ liệu Preview.");
      }

      setPreview(data);
      setSheetMetadataDrafts(Object.fromEntries(
        (data.sheets || []).map((sheet) => [sheet.sheetName, sheet.metadata || null]),
      ));
      const firstSheet = data.sheets?.find((sheet) => sheet.hasDetectedHeader) || data.sheets?.[0];
      if (compact && firstSheet) {
        setSelectedSheetName(firstSheet.sheetName);
        setMetadataDraft(firstSheet.metadata || null);
      }
    } catch (error) {
      console.error("Preview Google Form lỗi:", error.response?.data || error);

      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Không thể đọc file Google Form.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (initialFile && selectedFile === initialFile && !preview && !loading) {
      handlePreview();
    }
    // Each card owns an immutable File object and previews it once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile]);

  useEffect(() => {
    const metadata = metadataDraft || selectedSheet?.metadata || preview?.sheets?.[0]?.metadata || null;
    onFileState?.({
      state: errorMessage
        ? "ERROR"
        : commitResult
          ? "IMPORTED"
          : metadata?.status || (loading ? "READING" : "PENDING"),
      metadata,
      ready: Boolean(cleanedPreview && selectedTarget?.isComplete && metadataReady),
      duplicateKeys: cleanedPreview?.rows?.filter((row) => row.status === "READY" || row.status === "WARNING").map((row) => row.duplicateKey).filter(Boolean) || [],
      updateMetadata: setMetadataDraft,
    });
  }, [cleanedPreview, commitResult, errorMessage, loading, metadataReady, onFileState, preview, selectedSheet, selectedTarget?.isComplete]);
  const handleValidateDatabase = async () => {
    if (selectedTarget?.type === "EXHIBITION"
      && (!selectedTarget?.isComplete || !selectedTarget?.eventId)) {
      setErrorMessage("Chưa chọn Triển lãm nhận dữ liệu.");

      return;
    }

    if (!cleanedPreview || !selectedTarget?.isComplete || !metadataReady) {
      setErrorMessage("Dữ liệu chưa sẵn sàng để kiểm tra Database.");

      return;
    }

    const rowsToValidate = cleanedPreview.rows.filter(
      (row) => row.status === "READY" || row.status === "WARNING",
    );

    if (rowsToValidate.length === 0) {
      setErrorMessage("Không có dòng hợp lệ để kiểm tra Database.");

      return;
    }

    try {
      setValidatingDb(true);

      setErrorMessage("");

      setDbValidation(null);

      setCommitResult(null);
      setAllowOverCapacity(false);
      const response = await axios.post(
        `${API_URL}/google-form-import/validate`,
        {
          target: { ...selectedTarget, metadata: metadataDraft },

          rows: rowsToValidate,
        },
      );

      const result = response.data?.data;

      if (!result) {
        throw new Error("Backend không trả dữ liệu Validate.");
      }

      setDbValidation(result);
    } catch (error) {
      console.error("Validate Database lỗi:", error.response?.data || error);

      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Không thể kiểm tra Database.",
      );
    } finally {
      setValidatingDb(false);
    }
  };
  const handleCommit = async () => {
    if (!cleanedPreview || !selectedTarget?.isComplete || !dbValidation) {
      setErrorMessage("Vui lòng kiểm tra Database trước khi import.");

      return;
    }

    if (Number(dbValidation.summary?.readyToCommit || 0) <= 0) {
      setErrorMessage("Không có dữ liệu nào sẵn sàng để import.");

      return;
    }
    if (capacityPreview?.exceeds && !allowOverCapacity) {
      setErrorMessage(
        "Batch import vượt sĩ số tối đa. Vui lòng xác nhận cho phép vượt sĩ số trước khi import.",
      );

      return;
    }
    // =====================================================
    // CONFIRM BATCH THẬT
    // =====================================================

    if (!TEST_COMMIT_ONE_NEW) {
      const readyCount = Number(dbValidation.summary?.readyToCommit) || 0;

      const projected = capacityPreview?.projectedStudents ?? readyCount;

      const confirmed = window.confirm(
        [
          `Xác nhận import ${readyCount} người vào SIHUB?`,
          "",
          `Sĩ số sau import dự kiến: ${projected}`,
          "",
          "Các dòng xung đột, đã đăng ký và trùng file sẽ không được import.",
        ].join("\n"),
      );

      if (!confirmed) {
        return;
      }
    }
    /*
     * Chỉ gửi những dòng local Cleaner cho phép.
     *
     * Backend sẽ tự Validate DB lại.
     * Không gửi / không tin dbStatus FE.
     */
    const localImportableRows = cleanedPreview.rows.filter(
      (row) => row.status === "READY" || row.status === "WARNING",
    );

    let rowsToCommit = localImportableRows;

    // =====================================================
    // DEV TEST:
    // Lấy đúng 1 row mà Database Validate xác định NEW.
    //
    // Không lấy row đầu tiên bừa,
    // vì row đầu có thể là CONFLICT / EXISTING.
    // =====================================================

    if (TEST_COMMIT_ONE_NEW) {
      const firstNewDbRow = dbValidation.rows?.find(
        (row) => row.dbStatus === "NEW",
      );

      if (!firstNewDbRow) {
        setErrorMessage("Không tìm thấy người mới (NEW) để test Commit.");

        return;
      }

      const sourceRow = localImportableRows.find(
        (row) => Number(row.rowNumber) === Number(firstNewDbRow.rowNumber),
      );

      if (!sourceRow) {
        setErrorMessage(
          `Không tìm thấy dữ liệu gốc của dòng ${firstNewDbRow.rowNumber}.`,
        );

        return;
      }

      rowsToCommit = [sourceRow];
    }
    try {
      setCommitting(true);
      setErrorMessage("");

      // =====================================================
      // 1. COMMIT DATABASE TRƯỚC
      // =====================================================

      const response = await axios.post(
        `${API_URL}/google-form-import/commit`,
        {
          target: { ...selectedTarget, metadata: metadataDraft },

          rows: rowsToCommit,

          source: {
            fileName: selectedFile?.name || null,
            sheetName: selectedSheet?.sheetName || null,

            // Admin xác nhận cho phép
            // import quản trị vượt sĩ số.
            allowOverCapacity: allowOverCapacity === true,
          },
        },
      );

      // =====================================================
      // 2. LẤY RESULT SAU KHI BACKEND TRẢ VỀ
      // =====================================================

      const result = response.data?.data;

      if (!result) {
        throw new Error("Backend không trả kết quả Import.");
      }

      // =====================================================
      // 3. HIỂN THỊ KẾT QUẢ COMMIT
      // =====================================================

      setCommitResult(result);

      // =====================================================
      // 4. REFRESH OPENING INFO SAU COMMIT
      //
      // Backend trả currentStudents + classStatus.
      // Cập nhật lại target local để capacity lần sau
      // dùng sĩ số mới nhất.
      // =====================================================

      setSelectedTarget((current) => {
        if (!current || current.type !== "TRAINING") {
          return current;
        }

        return {
          ...current,

          openingInfo: {
            ...(current.openingInfo || {}),

            current_students: Number(result.currentStudents) || 0,

            status: result.classStatus || current.openingInfo?.status || null,
          },
        };
      });

      // =====================================================
      // 5. DB VỪA THAY ĐỔI
      //
      // Validation cũ không còn đáng tin.
      // Muốn import tiếp phải kiểm tra Database lại.
      // =====================================================

      setDbValidation(null);

      // Capacity confirmation cũ cũng hết hiệu lực.
      setAllowOverCapacity(false);
    } catch (error) {
      console.error("Commit Google Form lỗi:", error.response?.data || error);

      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          "Không thể import dữ liệu Google Form.",
      );
    } finally {
      setCommitting(false);
    }
  };
  return (
    <section className={compact ? "bg-white" : "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"}>
      {/* HEADER */}

      {!compact && <div>
        <p className="text-sm font-bold text-blue-600">IMPORT GOOGLE FORM</p>

        <h2 className="mt-1 text-xl font-bold text-slate-900">
          Import dữ liệu từ Google Form
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Upload file Excel được xuất trực tiếp từ Google Form. Hệ thống sẽ đọc
          các sheet nhưng chưa import dữ liệu cho đến khi Admin xác nhận.
        </p>
      </div>}

      {/* UPLOAD */}

      {!initialFile && !selectedFile && (
        <label className="mt-6 flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition hover:border-blue-400 hover:bg-blue-50/40">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
            <Upload size={30} />
          </div>

          <p className="mt-4 text-lg font-bold text-slate-900">
            Chọn file Google Form
          </p>

          <p className="mt-2 text-sm text-slate-500">Hỗ trợ .xlsx và .xls</p>

          <span className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">
            Chọn file từ máy
          </span>

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleChooseFile}
            className="hidden"
          />
        </label>
      )}

      {/* FILE ĐÃ CHỌN */}

      {!compact && selectedFile && (
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600">
                <FileSpreadsheet size={22} />
              </div>

              <div className="min-w-0">
                <p className="break-words font-bold text-slate-900">
                  {selectedFile.name}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRemoveFile}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <X size={17} />
                Bỏ file
              </button>

              <button
                type="button"
                onClick={handlePreview}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <FileSpreadsheet size={17} />
                )}

                {loading ? "Đang đọc..." : "Đọc Google Form"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ERROR */}

      {errorMessage && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      {/* DANH SÁCH SHEET */}

      {preview && (
        <div className="mt-6 space-y-5">
          <div className={compact ? "rounded-xl border border-emerald-200 bg-emerald-50 p-3" : "rounded-2xl border border-emerald-200 bg-emerald-50 p-4"}>
            <div className="flex items-center gap-2 font-bold text-emerald-700">
              <CheckCircle2 size={18} />
              Đã đọc file thành công
            </div>

            <p className="mt-2 text-sm text-slate-600">
              Tìm thấy <strong>{preview.totalSheets || 0}</strong> sheet. Vui
              lòng chọn sheet cần import.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-slate-900">Chọn sheet dữ liệu</h3>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {(preview.sheets || []).map((sheet) => {
                const active = selectedSheetName === sheet.sheetName;

                return (
                  <button
                    key={sheet.sheetName}
                    type="button"
                    onClick={() => {
                      if (selectedSheetName) {
                        setSheetMetadataDrafts((current) => ({
                          ...current,
                          [selectedSheetName]: metadataDraft,
                        }));
                      }
                      setSelectedSheetName(sheet.sheetName);
                      setMetadataDraft(sheetMetadataDrafts[sheet.sheetName] ?? sheet.metadata ?? null);

                      setSelectedTarget(null);
                      setFieldMapping(null);

                      setDbValidation(null);
                      setCommitResult(null);
                      setAllowOverCapacity(false);

                      setErrorMessage("");
                    }}
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? sheet.hasDetectedHeader
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                          : "border-amber-500 bg-amber-50 ring-2 ring-amber-100"
                        : sheet.hasDetectedHeader
                          ? "border-slate-200 bg-white hover:border-blue-300"
                          : "border-amber-200 bg-amber-50/30 hover:border-amber-400"
                    }`}
                  >
                    <p className="font-bold text-slate-900">
                      {sheet.sheetName}
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      {sheet.totalRows || 0} dòng dữ liệu
                    </p>

                    <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${sheet.status === "EMPTY" ? "bg-slate-100 text-slate-600" : sheet.status === "ERROR" ? "bg-red-100 text-red-700" : sheet.status === "READY" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {sheet.status || (sheet.hasDetectedHeader ? "READY" : "NEEDS_ADMIN_CONFIRMATION")}
                    </span>

                    {sheet.hasDetectedHeader ? (
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs text-slate-400">
                          {sheet.headers?.length || 0} cột
                        </span>

                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                          Header dòng {sheet.headerRowNumber}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                          Chưa xác định được dòng tiêu đề
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SHEET ĐÃ CHỌN */}

          {selectedSheet && (
            <div className="rounded-2xl border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-400">
                  Sheet đã chọn
                </p>

                <p className="mt-1 font-bold text-slate-900">
                  {selectedSheet.sheetName}
                </p>
              </div>
              <div className="p-4">
                {/* =====================================================
      CÓ HEADER
  ===================================================== */}

                {selectedSheet.hasDetectedHeader ? (
                  <>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-emerald-800">
                            Đã xác định được dòng tiêu đề
                          </p>

                          <p className="mt-1 text-sm text-emerald-700">
                            Header nằm tại dòng{" "}
                            <strong>{selectedSheet.headerRowNumber}</strong> của
                            sheet.
                          </p>
                        </div>

                        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm">
                          {selectedSheet.headers?.length || 0} cột
                        </span>
                      </div>
                    </div>

                    {/* CÁC CỘT */}

                    <div className="mt-5">
                      <p className="text-sm font-bold text-slate-700">
                        Các cột phát hiện được
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {(selectedSheet.headers || []).map((header, index) => {
                          const isEmptyColumn =
                            String(header).startsWith("[Cột trống");

                          return (
                            <span
                              key={`${header}-${index}`}
                              className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                                isEmptyColumn
                                  ? "border-amber-200 bg-amber-50 text-amber-700"
                                  : "border-slate-200 bg-slate-50 text-slate-600"
                              }`}
                            >
                              {header}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* SAMPLE DATA */}

                    {selectedSheet.sampleRows?.length > 0 && (
                      <div className="mt-6">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-bold text-slate-700">
                            Xem nhanh dữ liệu
                          </p>

                          <span className="text-xs text-slate-400">
                            Tối đa 5 dòng đầu
                          </span>
                        </div>

                        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                          <table className="min-w-max w-full text-sm">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="border-b border-slate-200 px-3 py-3 text-left text-xs font-bold text-slate-500">
                                  Dòng
                                </th>

                                {(selectedSheet.headers || []).map(
                                  (header, index) => (
                                    <th
                                      key={`${header}-preview-${index}`}
                                      className="max-w-[260px] border-b border-slate-200 px-3 py-3 text-left text-xs font-bold text-slate-500"
                                    >
                                      {header}
                                    </th>
                                  ),
                                )}
                              </tr>
                            </thead>

                            <tbody>
                              {(selectedSheet.sampleRows || []).map((row) => (
                                <tr
                                  key={row.rowNumber}
                                  className="border-b border-slate-100 last:border-b-0"
                                >
                                  <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-400">
                                    {row.rowNumber}
                                  </td>

                                  {(selectedSheet.headers || []).map(
                                    (header, index) => (
                                      <td
                                        key={`${row.rowNumber}-${index}`}
                                        className="max-w-[260px] px-3 py-3 align-top text-slate-700"
                                      >
                                        <div className="max-h-[80px] overflow-hidden break-words">
                                          {row.values?.[header] || "—"}
                                        </div>
                                      </td>
                                    ),
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* =====================================================
          KHÔNG CÓ HEADER TIN CẬY
      ===================================================== */}

                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                      <p className="font-bold text-amber-800">
                        Chưa xác định được dòng tiêu đề
                      </p>

                      <p className="mt-2 text-sm leading-6 text-amber-700">
                        Hệ thống phát hiện sheet này có dữ liệu nhưng không tìm
                        thấy một dòng header đủ tin cậy. Các giá trị bên dưới
                        chỉ được hiển thị để Admin kiểm tra và chưa được dùng để
                        map dữ liệu.
                      </p>
                    </div>

                    {/* RAW PREVIEW */}

                    {selectedSheet.rawPreviewRows?.length > 0 && (
                      <div className="mt-5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-bold text-slate-700">
                            Dữ liệu thô phát hiện được
                          </p>

                          <span className="text-xs text-slate-400">
                            Tối đa 5 dòng đầu
                          </span>
                        </div>

                        <div className="mt-3 space-y-3">
                          {selectedSheet.rawPreviewRows.map((row) => (
                            <div
                              key={row.rowNumber}
                              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                            >
                              <p className="text-xs font-bold uppercase text-slate-400">
                                Dòng {row.rowNumber}
                              </p>

                              <div className="mt-3 flex flex-wrap gap-2">
                                {(row.values || []).map((value, index) => {
                                  if (!value) {
                                    return null;
                                  }

                                  return (
                                    <span
                                      key={`${row.rowNumber}-${index}`}
                                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600"
                                    >
                                      {value}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                      <p className="text-sm leading-6 text-slate-600">
                        Sheet này chưa thể chuyển sang bước mapping. Ở bước sau
                        chúng ta sẽ cho Admin chọn hoặc xác nhận dòng nào là
                        header nếu thật sự cần import sheet này.
                      </p>
                    </div>
                  </>
                )}
                {selectedSheet?.hasDetectedHeader && (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold text-slate-900">Metadata trong nội dung Excel</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${metadataReady ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{metadataReady ? "Sẵn sàng" : "Cần Admin xác nhận"}</span>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {isExhibition ? (
                        <label className="text-xs font-semibold text-slate-600">Tên triển lãm *<input value={metadataDraft?.exhibitionName || ""} onChange={(e) => setMetadataDraft((v) => ({ ...(v || {}), exhibitionName: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                      ) : isNetworking ? (
                        <label className="text-xs font-semibold text-slate-600">Tên sự kiện *<input value={metadataDraft?.networkingEventName || ""} onChange={(e) => setMetadataDraft((v) => ({ ...(v || {}), networkingEventName: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                      ) : (
                        <>
                          <label className="text-xs font-semibold text-slate-600">Nhiệm vụ đào tạo<input value={metadataDraft?.trainingProgramName || ""} onChange={(e) => setMetadataDraft((v) => ({ ...(v || {}), trainingProgramName: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                          <label className="text-xs font-semibold text-slate-600">Nhiệm vụ khóa đào tạo<input value={metadataDraft?.courseName || ""} onChange={(e) => setMetadataDraft((v) => ({ ...(v || {}), courseName: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                          <label className="text-xs font-semibold text-slate-600">Khóa đào tạo<input value={metadataDraft?.openingName || ""} onChange={(e) => setMetadataDraft((v) => ({ ...(v || {}), openingName: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                        </>
                      )}
                      <label className="text-xs font-semibold text-slate-600">Năm *<input type="number" min="2000" max="2100" value={metadataDraft?.year || ""} onChange={(e) => setMetadataDraft((v) => ({ ...(v || {}), year: e.target.value ? Number(e.target.value) : null }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
                      {(isExhibition || isNetworking) && <label className="text-xs font-semibold text-slate-600">Địa điểm{isExhibition ? " *" : " (nếu có)"}<input value={metadataDraft?.location || ""} onChange={(e) => setMetadataDraft((v) => ({ ...(v || {}), location: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" /></label>}
                    </div>
                    <div className="mt-3 space-y-2">
                      {(metadataDraft?.sessions?.length ? metadataDraft.sessions : [{ sessionDate: "", startTime: "", endTime: "" }]).map((session, index) => (
                        <div key={index} className="grid gap-2 sm:grid-cols-3">
                          <input aria-label={`Ngày buổi ${index + 1}`} type="date" value={session.sessionDate || ""} onChange={(e) => setMetadataDraft((v) => { const sessions = [...(v?.sessions?.length ? v.sessions : [{ sessionDate: "", startTime: "", endTime: "" }])]; sessions[index] = { ...sessions[index], sessionDate: e.target.value }; return { ...(v || {}), sessions }; })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
                          <input aria-label={`Giờ bắt đầu buổi ${index + 1}`} type="time" value={session.startTime || ""} onChange={(e) => setMetadataDraft((v) => { const sessions = [...v.sessions]; sessions[index] = { ...sessions[index], startTime: e.target.value }; return { ...v, sessions }; })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
                          <input aria-label={`Giờ kết thúc buổi ${index + 1}`} type="time" value={session.endTime || ""} onChange={(e) => setMetadataDraft((v) => { const sessions = [...v.sessions]; sessions[index] = { ...sessions[index], endTime: e.target.value }; return { ...v, sessions }; })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-slate-500">{isExhibition || isNetworking ? "Số người tham gia" : "Số học viên"}: <strong>{metadataDraft?.studentCount || selectedSheet.totalRows || 0}</strong>. Metadata chỉ được lấy từ nội dung Excel; ngày, giờ và địa điểm để trống khi file không cung cấp.</p>
                  </div>
                )}
                {selectedSheet?.hasDetectedHeader && (
                    <GoogleFormTargetSelector
                      selectedSheet={selectedSheet}
                      metadata={metadataDraft}
                      onMetadataChange={setMetadataDraft}
                    onTargetChange={handleTargetChange}
                  />
                )}
                {selectedTarget?.type === "EXHIBITION" && !selectedTarget?.isComplete && (
                  <p className="mt-3 text-sm font-semibold text-amber-700">
                    Chưa chọn Triển lãm nhận dữ liệu.
                  </p>
                )}
                {/* =====================================================
    MAPPING
===================================================== */}

                {selectedSheet?.hasDetectedHeader &&
                  selectedTarget?.isComplete && (
                    <details className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                      <summary className="cursor-pointer font-bold text-slate-700">Chi tiết mapping cột</summary>
                      <GoogleFormFieldMapping
                        key={mappingIdentity}
                        selectedSheet={selectedSheet}
                        target={selectedTarget}
                        mappingIdentity={mappingIdentity}
                        onMappingChange={handleMappingChange}
                      />
                    </details>
                  )}
                {/* =====================================================
    CLEANED PREVIEW SUMMARY
===================================================== */}

                {cleanedPreview && (
                  <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Kiểm tra nhanh
                        </p>

                        <h3 className="mt-1 text-lg font-bold text-slate-900">
                          Kết quả làm sạch dữ liệu
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          Hệ thống đã tự chuẩn hóa dữ liệu và phân loại các dòng
                          trước khi kiểm tra với Database.
                        </p>
                      </div>

                      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
                        Có thể import {cleanedPreview.summary.importable} người
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                      {/* TỔNG */}

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-semibold text-slate-500">
                          Tổng
                        </p>

                        <p className="mt-1 text-2xl font-bold text-slate-900">
                          {cleanedPreview.summary.total}
                        </p>
                      </div>

                      {/* READY */}

                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-xs font-semibold text-emerald-600">
                          Sẵn sàng
                        </p>

                        <p className="mt-1 text-2xl font-bold text-emerald-700">
                          {cleanedPreview.summary.ready}
                        </p>
                      </div>

                      {/* WARNING */}

                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-xs font-semibold text-amber-600">
                          Cảnh báo
                        </p>

                        <p className="mt-1 text-2xl font-bold text-amber-700">
                          {cleanedPreview.summary.warning}
                        </p>
                      </div>

                      {/* ERROR */}

                      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                        <p className="text-xs font-semibold text-red-600">
                          Lỗi
                        </p>

                        <p className="mt-1 text-2xl font-bold text-red-700">
                          {cleanedPreview.summary.error}
                        </p>
                      </div>

                      {/* JUNK */}

                      <div className="rounded-xl border border-slate-200 bg-slate-100 p-4">
                        <p className="text-xs font-semibold text-slate-500">
                          Rác
                        </p>

                        <p className="mt-1 text-2xl font-bold text-slate-700">
                          {cleanedPreview.summary.junk}
                        </p>
                      </div>

                      {/* DUPLICATE */}

                      <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                        <p className="text-xs font-semibold text-purple-600">
                          Trùng file
                        </p>

                        <p className="mt-1 text-2xl font-bold text-purple-700">
                          {cleanedPreview.summary.duplicate}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {/* =====================================================
    REVIEW DATA
===================================================== */}

                {cleanedPreview && (
                  <GoogleFormReviewStep
                    cleanedPreview={cleanedPreview}
                  />
                )}
                {cleanedPreview && (
                  <div className="mt-5 flex justify-end">
                    <button
                      type="button"
                      onClick={handleValidateDatabase}
                      disabled={
                        validatingDb || cleanedPreview.summary.importable === 0
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {validatingDb ? (
                        <>
                          <Loader2 size={17} className="animate-spin" />
                          Đang kiểm tra Database...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={17} />

                          {dbValidation
                            ? "Kiểm tra lại Database"
                            : `Kiểm tra ${cleanedPreview.summary.importable} người với Database`}
                        </>
                      )}
                    </button>
                  </div>
                )}

                {dbValidation && (
                  <GoogleFormDatabaseReview validation={dbValidation} />
                )}
                {/* =====================================================
    CAPACITY WARNING
===================================================== */}

                {capacityPreview?.exceeds && (
                  <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-5">
                    <div>
                      <p className="font-bold text-amber-900">
                        Batch import sẽ vượt sĩ số khai báo
                      </p>

                      <p className="mt-1 text-sm leading-6 text-amber-700">
                        Đây là luồng import quản trị. Hệ thống vẫn cho phép tiếp
                        tục, nhưng Admin cần xác nhận trước khi ghi dữ liệu.
                      </p>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl border border-amber-200 bg-white p-4">
                        <p className="text-xs font-semibold text-slate-500">
                          Sĩ số hiện tại
                        </p>

                        <p className="mt-1 text-2xl font-bold text-slate-900">
                          {capacityPreview.currentStudents}
                        </p>
                      </div>

                      <div className="rounded-xl border border-amber-200 bg-white p-4">
                        <p className="text-xs font-semibold text-slate-500">
                          Giới hạn khai báo
                        </p>

                        <p className="mt-1 text-2xl font-bold text-slate-900">
                          {capacityPreview.maxStudents}
                        </p>
                      </div>

                      <div className="rounded-xl border border-amber-200 bg-white p-4">
                        <p className="text-xs font-semibold text-slate-500">
                          Sắp import
                        </p>

                        <p className="mt-1 text-2xl font-bold text-indigo-700">
                          {capacityPreview.readyToCommit}
                        </p>
                      </div>

                      <div className="rounded-xl border border-amber-300 bg-amber-100 p-4">
                        <p className="text-xs font-semibold text-amber-700">
                          Sĩ số sau import
                        </p>

                        <p className="mt-1 text-2xl font-bold text-amber-900">
                          {capacityPreview.projectedStudents}
                        </p>
                      </div>
                    </div>

                    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-white p-4">
                      <input
                        type="checkbox"
                        checked={allowOverCapacity}
                        onChange={(event) =>
                          setAllowOverCapacity(event.target.checked)
                        }
                        className="mt-1 h-4 w-4"
                      />

                      <div>
                        <p className="font-bold text-slate-800">
                          Cho phép vượt sĩ số
                        </p>

                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          Tôi xác nhận đây là dữ liệu import quản trị/lịch sử và
                          vẫn muốn đưa toàn bộ học viên hợp lệ vào lớp này.
                        </p>
                      </div>
                    </label>
                  </div>
                )}
                {dbValidation &&
                  Number(dbValidation.summary?.readyToCommit || 0) > 0 && (
                    <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="font-bold text-indigo-900">
                            Sẵn sàng ghi dữ liệu vào SIHUB
                          </p>

                          <p className="mt-1 text-sm leading-6 text-indigo-700">
                            Hệ thống sẽ import{" "}
                            <strong>
                              {dbValidation.summary.readyToCommit}
                            </strong>{" "}
                            người. Các dòng xung đột và đã đăng ký sẽ tự động
                            được bỏ qua.
                            {capacityPreview?.exceeds && (
                              <>
                                {" "}
                                Sĩ số dự kiến sau import là{" "}
                                <strong>
                                  {capacityPreview.projectedStudents}
                                </strong>
                                /{capacityPreview.maxStudents}.
                              </>
                            )}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleCommit}
                          disabled={
                            committing ||
                            (capacityPreview?.exceeds && !allowOverCapacity)
                          }
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {committing ? (
                            <>
                              <Loader2 size={17} className="animate-spin" />
                              Đang import...
                            </>
                          ) : (
                            <>
                              <Upload size={17} />

                              {TEST_COMMIT_ONE_NEW
                                ? "TEST import 1 người mới"
                                : `Import nhanh ${dbValidation.summary.readyToCommit} người`}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                {commitResult && (
                  <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                        <CheckCircle2 size={22} />
                      </div>

                      <div>
                        <p className="text-lg font-bold text-emerald-900">
                          Import Google Form thành công
                        </p>

                        <p className="mt-1 text-sm text-emerald-700">
                          Database SIHUB đã được cập nhật.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl border border-emerald-200 bg-white p-4">
                        <p className="text-xs font-bold text-slate-500">
                          User mới
                        </p>

                        <p className="mt-1 text-2xl font-bold text-slate-900">
                          {commitResult.createdUsers || 0}
                        </p>
                      </div>

                      <div className="rounded-xl border border-emerald-200 bg-white p-4">
                        <p className="text-xs font-bold text-slate-500">
                          Hồ sơ đã có
                        </p>

                        <p className="mt-1 text-2xl font-bold text-slate-900">
                          {commitResult.existingUsersUsed || 0}
                        </p>
                      </div>

                      <div className="rounded-xl border border-emerald-200 bg-white p-4">
                        <p className="text-xs font-bold text-slate-500">
                          Registration tạo mới
                        </p>

                        <p className="mt-1 text-2xl font-bold text-emerald-700">
                          {commitResult.createdRegistrations || 0}
                        </p>
                      </div>

                      <div className="rounded-xl border border-emerald-200 bg-white p-4">
                        <p className="text-xs font-bold text-slate-500">
                          Sĩ số hiện tại
                        </p>

                        <p className="mt-1 text-2xl font-bold text-indigo-700">
                          {commitResult.currentStudents ?? "—"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600">
                        Đã đăng ký, bỏ qua:{" "}
                        {commitResult.skippedAlreadyRegistered || 0}
                      </span>

                      <span className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
                        Xung đột, bỏ qua: {commitResult.skippedConflicts || 0}
                      </span>

                      <span className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-purple-700">
                        Lưu dữ liệu mở rộng: {commitResult.savedExtraRows || 0}
                      </span>

                      <span className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-700">
                        Trạng thái lớp: {commitResult.classStatus || "—"}
                      </span>
                    </div>
                  </section>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default GoogleFormImportPanel;
