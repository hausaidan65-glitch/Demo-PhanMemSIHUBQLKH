import { useState } from "react";
import axios from "axios";

function AdminImportStudents() {
  const [file, setFile] = useState(null);

  const [preview, setPreview] = useState(null);

  const [loading, setLoading] = useState(false);

  const [importing, setImporting] = useState(false);

  const [result, setResult] = useState(null);

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

      setResult(null);
    } catch (error) {
      console.log(error);

      alert("Upload thất bại");
    } finally {
      setLoading(false);
    }
  };

  // ==========================
  // IMPORT DỮ LIỆU HỢP LỆ
  // ==========================

  const handleImport = async () => {
    if (!preview?.validRows || preview.validRows.length === 0) {
      alert("Không có dữ liệu hợp lệ");

      return;
    }

    try {
      setImporting(true);

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

      setResult(res.data.data);
    } catch (error) {
      console.log(error);

      alert("Import thất bại");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-5">Import học viên từ Excel</h1>

      <div
        className="
bg-white
rounded-xl
shadow
p-5
"
      >
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <button
          onClick={handlePreview}
          className="
mt-4
bg-blue-600
text-white
px-5
py-2
rounded-lg
"
        >
          {loading ? "Đang kiểm tra..." : "Kiểm tra dữ liệu"}
        </button>
      </div>

      {preview && (
        <div
          className="
mt-6
bg-white
rounded-xl
shadow
p-5
"
        >
          <h2
            className="
font-bold
text-lg
"
          >
            Kết quả kiểm tra
          </h2>

          <div
            className="
grid
grid-cols-3
gap-4
mt-4
"
          >
            <div
              className="
p-4
bg-gray-100
rounded
"
            >
              Tổng dòng
              <h3 className="text-xl font-bold">{preview.totalRows}</h3>
            </div>

            <div
              className="
p-4
bg-green-100
rounded
"
            >
              Có thể nhập
              <h3 className="text-xl font-bold">{preview.successRows}</h3>
            </div>

            <div
              className="
p-4
bg-red-100
rounded
"
            >
              Lỗi
              <h3 className="text-xl font-bold">{preview.errorRows}</h3>
            </div>
          </div>

          {preview.errorRows > 0 && (
            <div className="mt-6">
              <h3
                className="
font-bold
mb-3
text-red-600
"
              >
                Danh sách lỗi cần kiểm tra
              </h3>

              <div
                className="
max-h-80
overflow-y-auto
border
rounded
"
              >
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3">Dòng</th>

                      <th>Họ tên</th>

                      <th>Lỗi</th>
                    </tr>
                  </thead>

                  <tbody>
                    {preview.errors.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-3">{item.row}</td>

                        <td>{item.name}</td>

                        <td
                          className="
text-red-600
"
                        >
                          {item.errors.join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {preview.successRows > 0 && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="
mt-6
bg-green-600
text-white
px-6
py-3
rounded-lg
"
            >
              {importing
                ? "Đang nhập..."
                : `Nhập ${preview.successRows} dữ liệu hợp lệ`}
            </button>
          )}
        </div>
      )}

      {result && (
        <div
          className="
mt-6
bg-green-100
rounded-xl
p-5
"
        >
          <h2
            className="
font-bold
text-lg
"
          >
            Import hoàn tất
          </h2>

          <p>
            Đã tạo:
            {result.createdUsers}
            học viên
          </p>

          <p>
            Đã thêm:
            {result.createdRegistrations}
            đăng ký
          </p>
        </div>
      )}
    </div>
  );
}

export default AdminImportStudents;
