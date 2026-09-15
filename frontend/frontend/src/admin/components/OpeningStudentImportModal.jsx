import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Upload, X } from 'lucide-react';

import openingStudentImportApi from '../../services/openingStudentImportApi';

const STATUS_LABELS = {
  READY_NEW: 'Sẵn sàng · học viên mới',
  READY_EXISTING: 'Sẵn sàng · học viên đã có',
  IMPORTED: 'Đã import',
  SKIPPED_DUPLICATE: 'Bỏ qua · đã đăng ký',
  SKIPPED_DUPLICATE_BATCH: 'Bỏ qua · trùng trong file',
  CONFLICT: 'Cần review',
  NEEDS_REVIEW: 'Cần review · email trùng',
  ERROR: 'Lỗi dữ liệu',
};

function OpeningStudentImportModal({ opening, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePreview = async () => {
    if (!file) return;
    try {
      setLoading(true);
      setError('');
      setResult(null);
      const response = await openingStudentImportApi.preview(opening.id, file);
      setPreview(response.data?.data || null);
    } catch (requestError) {
      setPreview(null);
      setError(requestError.response?.data?.message || 'Không thể kiểm tra file Excel.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview?.rows?.length || preview.summary?.ready < 1) return;
    try {
      setLoading(true);
      setError('');
      const response = await openingStudentImportApi.confirm(opening.id, preview.rows);
      const importResult = response.data?.data || null;
      setResult(importResult);
      setPreview(null);
      onImported?.(importResult);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Không thể import học viên.');
    } finally {
      setLoading(false);
    }
  };

  const data = result || preview;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Import học viên theo Đợt tổ chức</h3>
            <p className="mt-1 text-sm text-slate-500">
              {opening.class_name || opening.intake_name || `Đợt #${opening.id}`} · ID {opening.id}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          {!result && (
            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-slate-300 p-4 sm:flex-row sm:items-center">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(event) => {
                  setFile(event.target.files?.[0] || null);
                  setPreview(null);
                  setError('');
                }}
                className="min-w-0 flex-1 text-sm"
              />
              <button
                type="button"
                disabled={!file || loading}
                onClick={handlePreview}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                Preview
              </button>
            </div>
          )}

          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

          {data?.warnings?.map((warning) => (
            <div key={warning} className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <AlertTriangle size={18} className="shrink-0" /> {warning}
            </div>
          ))}

          {data && (
            <>
              <div className="grid gap-3 sm:grid-cols-5">
                {Object.entries(data.summary || {}).map(([key, value]) => (
                  <div key={key} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs uppercase text-slate-500">{key}</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Dòng</th>
                      <th className="px-3 py-2">Học viên</th>
                      <th className="px-3 py-2">Điện thoại</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Kết quả</th>
                      <th className="px-3 py-2">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows?.map((row) => (
                      <tr key={`${row.rowNumber}-${row.phone}-${row.email}`} className="border-t border-slate-100 align-top">
                        <td className="px-3 py-2">{row.rowNumber}</td>
                        <td className="px-3 py-2 font-medium">{row.fullname}</td>
                        <td className="px-3 py-2">{row.phone}</td>
                        <td className="px-3 py-2">{row.email}</td>
                        <td className="px-3 py-2">{STATUS_LABELS[row.status] || row.status}</td>
                        <td className="max-w-sm px-3 py-2 text-xs text-slate-600">
                          {[...(row.errors || []), ...(row.warnings || [])].join(' ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
              {result ? 'Đóng' : 'Hủy'}
            </button>
            {preview && (
              <button
                type="button"
                disabled={loading || preview.summary?.ready < 1}
                onClick={handleConfirm}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Confirm {preview.summary?.ready || 0} học viên
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OpeningStudentImportModal;
