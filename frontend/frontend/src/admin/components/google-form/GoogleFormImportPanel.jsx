import { useRef, useState } from "react";
import axios from "axios";

import {
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function GoogleFormImportPanel() {
  const inputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);

  const [loading, setLoading] = useState(false);

  const [preview, setPreview] = useState(null);

  const [selectedSheetName, setSelectedSheetName] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  // =====================================================
  // CHỌN FILE
  // =====================================================

  const handleChooseFile = (event) => {
    const file = event.target.files?.[0] || null;

    setErrorMessage("");
    setPreview(null);
    setSelectedSheetName("");

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
    setErrorMessage("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
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

  const selectedSheet =
    preview?.sheets?.find((sheet) => sheet.sheetName === selectedSheetName) ||
    null;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* HEADER */}

      <div>
        <p className="text-sm font-bold text-blue-600">IMPORT GOOGLE FORM</p>

        <h2 className="mt-1 text-xl font-bold text-slate-900">
          Import dữ liệu từ Google Form
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Upload file Excel được xuất trực tiếp từ Google Form. Hệ thống sẽ đọc
          các sheet nhưng chưa import dữ liệu cho đến khi Admin xác nhận.
        </p>
      </div>

      {/* UPLOAD */}

      {!selectedFile && (
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

      {selectedFile && (
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
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
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
                    onClick={() => setSelectedSheetName(sheet.sheetName)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                        : "border-slate-200 bg-white hover:border-blue-300"
                    }`}
                  >
                    <p className="font-bold text-slate-900">
                      {sheet.sheetName}
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                      {sheet.totalRows || 0} dòng dữ liệu
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {sheet.headers?.length || 0} cột
                    </p>
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
                <p className="text-sm font-bold text-slate-700">
                  Các cột phát hiện được
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(selectedSheet.headers || []).map((header) => (
                    <span
                      key={header}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600"
                    >
                      {header}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default GoogleFormImportPanel;
