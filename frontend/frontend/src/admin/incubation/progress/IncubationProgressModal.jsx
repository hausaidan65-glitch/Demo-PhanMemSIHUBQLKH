import { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';

import incubationProgressApi from '../../../services/incubationProgressApi';
import IncubationProgressHistory from './IncubationProgressHistory';

export default function IncubationProgressModal({ program, onClose }) {
  const [content, setContent] = useState('');
  const [note, setNote] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const savingRef = useRef(false);

  useEffect(() => {
    let active = true;

    incubationProgressApi
      .getIncubationProgress(program.id)
      .then((response) => {
        if (active) {
          const data = response.data?.data || {};
          setHistory(Array.isArray(data.history) ? data.history : []);
        }
      })
      .catch(() => {
        if (active) {
          setLoadError('Không thể tải lịch sử tiến độ.');
        }
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [program.id]);

  const trimmedContent = content.trim();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!trimmedContent || savingRef.current) return;

    savingRef.current = true;
    setSaving(true);
    setSaveError('');
    setSuccessMessage('');

    try {
      const response = await incubationProgressApi.createIncubationProgress(
        program.id,
        { content: trimmedContent, note: note.trim() || null },
      );
      const createdProgress = response.data?.data?.progress;

      if (createdProgress) {
        setHistory((previous) => [createdProgress, ...previous]);
      }

      setContent('');
      setNote('');
      setSuccessMessage(
        response.data?.message || 'Cập nhật tiến độ thành công.',
      );
    } catch {
      setSaveError('Không thể cập nhật tiến độ.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="incubation-progress-title"
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h2
              id="incubation-progress-title"
              className="text-xl font-bold text-slate-900"
            >
              Cập nhật tiến độ Chương trình ươm tạo
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {program.program_name || `Chương trình #${program.id}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Đóng"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="incubation-progress-content"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Nội dung tiến độ <span className="text-red-500">*</span>
              </label>
              <textarea
                id="incubation-progress-content"
                rows={4}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                disabled={saving}
                placeholder="Nhập nội dung tiến độ hiện tại"
                className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="incubation-progress-note"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Ghi chú quan trọng
              </label>
              <textarea
                id="incubation-progress-note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                disabled={saving}
                placeholder="Nhập ghi chú nếu có"
                className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-100"
              />
            </div>

            {saveError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {saveError}
              </div>
            )}
            {successMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving || !trimmedContent}
                className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving && <Loader2 size={17} className="animate-spin" />}
                {saving ? 'Đang lưu...' : 'Lưu cập nhật'}
              </button>
            </div>
          </form>

          <section className="mt-8 border-t border-slate-200 pt-6">
            <h3 className="mb-4 text-lg font-bold text-slate-900">
              Lịch sử cập nhật
            </h3>

            {historyLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                <Loader2 size={18} className="animate-spin text-emerald-600" />
                Đang tải lịch sử tiến độ...
              </div>
            ) : loadError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {loadError}
              </div>
            ) : (
              <IncubationProgressHistory history={history} />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
