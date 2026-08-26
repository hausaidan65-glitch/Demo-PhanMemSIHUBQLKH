import { useState } from "react";
import axios from "axios";

function ImportStudentModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [editingRow, setEditingRow] = useState(null);

  const [preview, setPreview] = useState(null);

  const [loading, setLoading] = useState(false);

  const [importing, setImporting] = useState(false);

  // ==========================
  // PREVIEW EXCEL
  // ==========================

  const handlePreview = async () => {
    if (!file) {
      alert("Vui lòng chọn file");
      return;
    }

    const formData = new FormData();

    formData.append("file", file);

    try {
      setLoading(true);

      const res = await axios.post(
        "http://localhost:5000/api/admin/import/preview",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      setPreview(res.data.data);
    } catch (error) {
      console.error("Lỗi preview:", error.response?.data || error);

      alert(
        error.response?.data?.message ||
          "Không thể kiểm tra file Excel. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  };
  // ==========================
  // VALIDATE DÒNG ĐÃ CHỈNH SỬA
  // ==========================

  const validateEditedData = (data, currentRow) => {
    const errors = [];

    const fullname = data.fullname?.trim() || "";
    const email = data.email?.trim().toLowerCase() || "";
    const phone = data.phone?.toString().replace(/[^\d]/g, "") || "";

    if (!fullname) {
      errors.push("Thiếu họ tên");
    }

    if (!email) {
      errors.push("Thiếu email");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("Email không hợp lệ");
    }

    if (!phone) {
      errors.push("Thiếu số điện thoại");
    } else if (!/^0[0-9]{9}$/.test(phone)) {
      errors.push("Số điện thoại không hợp lệ");
    }

    // Lấy tất cả dòng khác để kiểm tra trùng
    const otherRows = [
      ...(preview?.validRows || []),
      ...(preview?.errors || [])
        .filter((item) => item.row !== currentRow)
        .map((item) => item.data),
    ];

    const duplicatedEmail = otherRows.some(
      (item) => item?.email?.trim().toLowerCase() === email && email !== "",
    );

    if (duplicatedEmail) {
      errors.push("Email bị trùng trong file");
    }

    const duplicatedPhone = otherRows.some(
      (item) =>
        item?.phone?.toString().replace(/[^\d]/g, "") === phone && phone !== "",
    );

    if (duplicatedPhone) {
      errors.push("Số điện thoại bị trùng trong file");
    }

    return {
      errors,

      normalizedData: {
        ...data,
        fullname,
        email,
        phone,
      },
    };
  };

  // ==========================
  // LƯU DÒNG ĐÃ CHỈNH SỬA
  // ==========================

  const handleSaveEditedRow = () => {
    if (!editingRow?.data) {
      return;
    }

    const { errors, normalizedData } = validateEditedData(
      editingRow.data,
      editingRow.row,
    );

    setPreview((previous) => {
      if (!previous) {
        return previous;
      }

      // Nếu vẫn còn lỗi thì cập nhật lại dòng lỗi
      if (errors.length > 0) {
        const updatedErrors = previous.errors.map((item) =>
          item.row === editingRow.row
            ? {
                ...item,
                name: normalizedData.fullname,
                data: normalizedData,
                errors,
                status: "ERROR",
              }
            : item,
        );

        return {
          ...previous,
          errors: updatedErrors,
          errorRows: updatedErrors.length,
          successRows: previous.validRows.length,
        };
      }

      // Nếu hết lỗi thì chuyển sang validRows
      const updatedErrors = previous.errors.filter(
        (item) => item.row !== editingRow.row,
      );

      const updatedValidRows = [...previous.validRows, normalizedData];

      return {
        ...previous,
        errors: updatedErrors,
        validRows: updatedValidRows,
        errorRows: updatedErrors.length,
        successRows: updatedValidRows.length,
      };
    });

    setEditingRow(null);
  };
  // ==========================
  // XÓA DÒNG LỖI
  const handleDeleteErrorRow = (rowNumber) => {
    setPreview((previous) => {
      if (!previous) return previous;

      const newErrors = previous.errors.filter(
        (item) => item.row !== rowNumber,
      );

      return {
        ...previous,

        errors: newErrors,

        errorRows: newErrors.length,
      };
    });
  };
  // ==========================
  // IMPORT
  // ==========================

  const handleImport = async () => {
    if (!preview?.validRows || preview.validRows.length === 0) {
      alert("Không có dữ liệu hợp lệ");

      return;
    }

    const confirmImport = window.confirm(
      `Bạn có chắc muốn import ${preview.successRows} học viên?`,
    );

    if (!confirmImport) return;

    try {
      setImporting(true);
      console.log("VALID ROW SAMPLE:", preview.validRows[0]);
      const res = await axios.post(
        "http://localhost:5000/api/admin/import/confirm",
        {
          rows: preview.validRows,

          filename: file.name,

          totalRows: preview.totalRows,

          successRows: preview.successRows,

          errorRows: preview.errorRows,
        },
      );

      alert(
        `
Import hoàn tất

Tạo mới:
${res.data.data.createdUsers} học viên

Thêm đăng ký:
${res.data.data.createdRegistrations} lớp
`,
      );

      if (onSuccess) {
        onSuccess();
      }

      handleClose();
    } catch (error) {
      console.error("Lỗi import:", error.response?.data || error);

      alert(
        error.response?.data?.message || "Import thất bại. Vui lòng thử lại.",
      );
    } finally {
      setImporting(false);
    }
  };

  // ==========================
  // CLOSE RESET
  // ==========================

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setEditingRow(null);

    onClose();
  };
  if (!isOpen) return null;

  return (
    <>
      <div
        className="
            fixed
            inset-0
            bg-black/40
            flex
            items-center
            justify-center
            z-50
            "
      >
        <div
          className="
                bg-white
                w-[900px]
                max-h-[90vh]
                overflow-y-auto
                rounded-xl
                shadow-xl
                p-6
                "
        >
          {/* HEADER */}

          <div
            className="
                    flex
                    justify-between
                    items-center
                    mb-5
                    "
          >
            <h2
              className="
                        text-xl
                        font-bold
                        "
            >
              Import học viên từ Excel
            </h2>

            <button
              onClick={handleClose}
              className="
                        text-gray-500
                        hover:text-black
                        text-xl
                        "
            >
              ✕
            </button>
          </div>

          {/* CHỌN FILE */}

          <div
            className="
                    border
                    rounded-lg
                    p-5
                    "
          >
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                setFile(e.target.files[0]);

                setPreview(null);
              }}
            />

            <button
              onClick={handlePreview}
              disabled={!file || loading}
              className="
                        mt-4
                        bg-blue-600
                        text-white
                        px-5
                        py-2
                        rounded-lg
                        disabled:opacity-50
                        "
            >
              {loading ? "Đang kiểm tra..." : "Kiểm tra dữ liệu"}
            </button>
          </div>

          {preview && (
            <div
              className="
                            mt-6
                            "
            >
              <h3
                className="
                                font-bold
                                text-lg
                                mb-4
                                "
              >
                Kết quả kiểm tra
              </h3>

              {/* THỐNG KÊ */}

              <div
                className="
                                grid
                                grid-cols-3
                                gap-4
                                "
              >
                <div
                  className="
                                    bg-gray-100
                                    p-4
                                    rounded-lg
                                    "
                >
                  Tổng dòng
                  <p className="text-xl font-bold">{preview.totalRows}</p>
                </div>

                <div
                  className="
                                    bg-green-100
                                    p-4
                                    rounded-lg
                                    "
                >
                  Có thể nhập
                  <p className="text-xl font-bold">{preview.successRows}</p>
                </div>

                <div
                  className="
                                    bg-red-100
                                    p-4
                                    rounded-lg
                                    "
                >
                  Lỗi
                  <p className="text-xl font-bold">{preview.errorRows}</p>
                </div>
              </div>

              {preview.errorRows > 0 && (
                <div className="mt-6">
                  <h4
                    className="
                                            font-bold
                                            text-red-600
                                            mb-3
                                            "
                  >
                    Danh sách lỗi
                  </h4>

                  <div
                    className="
                                            border
                                            rounded-lg
                                            max-h-72
                                            overflow-y-auto
                                            "
                  >
                    <table
                      className="
                                                w-full
                                                "
                    >
                      <thead
                        className="
                                                    bg-gray-100
                                                    "
                      >
                        <tr>
                          <th>Dòng</th>
                          <th>Họ tên</th>
                          <th>Lỗi</th>
                          <th className="p-3 text-center">Thao tác</th>
                        </tr>
                      </thead>

                      <tbody>
                        {preview.errors.map((item, index) => (
                          <tr key={item.row || index} className="border-t">
                            <td className="p-3 text-center">{item.row}</td>

                            <td className="px-3 py-3">{item.name}</td>

                            <td className="px-3 py-3 text-red-600">
                              {item.errors.join(", ")}
                            </td>

                            <td className="px-3 py-3 text-center">
                              <div className="flex gap-2 justify-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingRow({
                                      ...item,
                                      data: {
                                        ...item.data,
                                      },
                                    })
                                  }
                                  className="
bg-blue-600
text-white
px-3
py-1.5
rounded-lg
"
                                >
                                  Sửa
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const confirmDelete = window.confirm(
                                      "Bạn có chắc muốn xóa dòng này khỏi danh sách import?",
                                    );

                                    if (confirmDelete) {
                                      handleDeleteErrorRow(item.row);
                                    }
                                  }}
                                  className="
bg-red-600
text-white
px-3
py-1.5
rounded-lg
"
                                >
                                  Xóa
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

              <div
                className="
                                flex
                                justify-end
                                gap-3
                                mt-6
                                "
              >
                <button
                  onClick={handleClose}
                  className="
                                    px-5
                                    py-2
                                    rounded-lg
                                    border
                                    "
                >
                  Hủy
                </button>

                <button
                  onClick={handleImport}
                  disabled={importing || preview.successRows === 0}
                  className="
                                    bg-green-600
                                    text-white
                                    px-5
                                    py-2
                                    rounded-lg
                                    disabled:opacity-50
                                    "
                >
                  {importing
                    ? "Đang nhập..."
                    : `Import ${preview.successRows} học viên`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {editingRow && (
        <div
          className="
          fixed
          inset-0
          z-[100]
          flex
          items-center
          justify-center
          bg-black/50
          p-4
        "
        >
          <div
            className="
            w-full
            max-w-lg
            rounded-2xl
            bg-white
            shadow-2xl
          "
          >
            <div
              className="
              flex
              items-center
              justify-between
              border-b
              border-slate-200
              px-6
              py-5
            "
            >
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Chỉnh sửa học viên
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Dòng {editingRow.row} trong file Excel
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingRow(null)}
                className="
                rounded-lg
                p-2
                text-slate-500
                hover:bg-slate-100
              "
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Họ và tên
                </label>

                <input
                  type="text"
                  value={editingRow.data?.fullname || ""}
                  onChange={(event) =>
                    setEditingRow((previous) => ({
                      ...previous,
                      data: {
                        ...previous.data,
                        fullname: event.target.value,
                      },
                    }))
                  }
                  className="
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  px-4
                  py-3
                  text-sm
                  outline-none
                  focus:border-green-500
                  focus:ring-4
                  focus:ring-green-100
                "
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email
                </label>

                <input
                  type="email"
                  value={editingRow.data?.email || ""}
                  onChange={(event) =>
                    setEditingRow((previous) => ({
                      ...previous,
                      data: {
                        ...previous.data,
                        email: event.target.value,
                      },
                    }))
                  }
                  className="
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  px-4
                  py-3
                  text-sm
                  outline-none
                  focus:border-green-500
                  focus:ring-4
                  focus:ring-green-100
                "
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Số điện thoại
                </label>

                <input
                  type="text"
                  value={editingRow.data?.phone || ""}
                  onChange={(event) =>
                    setEditingRow((previous) => ({
                      ...previous,
                      data: {
                        ...previous.data,
                        phone: event.target.value,
                      },
                    }))
                  }
                  className="
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  px-4
                  py-3
                  text-sm
                  outline-none
                  focus:border-green-500
                  focus:ring-4
                  focus:ring-green-100
                "
                />
              </div>

              {editingRow.errors?.length > 0 && (
                <div
                  className="
                  rounded-xl
                  border
                  border-red-200
                  bg-red-50
                  p-4
                "
                >
                  <p className="text-sm font-semibold text-red-700">
                    Lỗi hiện tại
                  </p>

                  <ul className="mt-2 space-y-1 text-sm text-red-600">
                    {editingRow.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div
              className="
              flex
              justify-end
              gap-3
              border-t
              border-slate-200
              px-6
              py-4
            "
            >
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                className="
                rounded-xl
                border
                border-slate-300
                px-5
                py-2.5
                text-sm
                font-medium
                text-slate-700
                hover:bg-slate-50
              "
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleSaveEditedRow}
                className="
                rounded-xl
                bg-green-600
                px-5
                py-2.5
                text-sm
                font-medium
                text-white
                hover:bg-green-700
              "
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ImportStudentModal;
