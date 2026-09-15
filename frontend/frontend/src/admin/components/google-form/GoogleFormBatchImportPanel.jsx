import { useMemo, useState } from "react";
import { FileSpreadsheet, Plus, Upload } from "lucide-react";
import GoogleFormImportPanel from "./GoogleFormImportPanel";

const fileKey = (file) => `${file.name}:${file.size}:${file.lastModified}`;

export default function GoogleFormBatchImportPanel() {
  const [files, setFiles] = useState([]);
  const [states, setStates] = useState({});
  const summary = useMemo(() => {
    const values = Object.values(states);
    return {
      total: files.length,
      ready: values.filter((item) => item.ready || item.state === "READY").length,
      confirmation: values.filter((item) => item.state === "NEEDS_ADMIN_CONFIRMATION").length,
      error: values.filter((item) => item.state === "ERROR").length,
    };
  }, [files.length, states]);

  const selectFiles = (event) => {
    const incoming = [...(event.target.files || [])].filter((file) => /\.xlsx?$/i.test(file.name));
    setFiles((current) => {
      const known = new Set(current.map(fileKey));
      return [...current, ...incoming.filter((file) => !known.has(fileKey(file)))];
    });
    event.target.value = "";
  };

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-blue-600">GOOGLE FORM IMPORT</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">Import nhiều file độc lập</h2>
            <p className="mt-1 text-sm text-slate-500">Một file lỗi không ảnh hưởng các file còn lại.</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700">
            <Upload size={18} /> Chọn nhiều file
            <input type="file" multiple accept=".xlsx,.xls" onChange={selectFiles} className="hidden" />
          </label>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {[["Tổng file", summary.total], ["Sẵn sàng", summary.ready], ["Cần Admin xác nhận", summary.confirmation], ["Lỗi", summary.error]].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
        {!files.length && <label className="mt-5 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 p-8 text-slate-500"><FileSpreadsheet size={28} /><span className="mt-2 font-semibold">Chọn các file .xlsx hoặc .xls</span><input type="file" multiple accept=".xlsx,.xls" onChange={selectFiles} className="hidden" /></label>}
      </section>
      {files.map((file, index) => {
        const key = fileKey(file);
        const fileState = states[key] || {};
        const metadata = fileState.metadata || {};
        const updateMetadata = (updater) => fileState.updateMetadata?.(updater);
        const sessions = metadata.sessions?.length ? metadata.sessions : [{ sessionDate: "", startTime: "", endTime: "" }];
        const missingYear = !metadata.year;
        const missingDate = !metadata.sessions?.length || sessions.some((session) => !session.sessionDate);
        const missingTime = !metadata.sessions?.length || sessions.some((session) => !session.startTime);
        const updateSession = (sessionIndex, patch) => updateMetadata((current) => {
          const currentSessions = current?.sessions?.length ? [...current.sessions] : [{ sessionDate: "", startTime: "", endTime: "" }];
          currentSessions[sessionIndex] = { ...currentSessions[sessionIndex], ...patch };
          return { ...(current || {}), sessions: currentSessions };
        });
        const batchDuplicateKeys = files.slice(0, index).flatMap((previous) => states[fileKey(previous)]?.duplicateKeys || []);
        return <details key={key} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="cursor-pointer list-none p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-slate-900">{file.name}</p><p className="mt-1 text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB · {metadata.studentCount || 0} học viên</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${fileState.state === "ERROR" ? "bg-red-100 text-red-700" : fileState.ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{fileState.ready ? "Sẵn sàng" : fileState.state === "ERROR" ? "Lỗi" : "Cần Admin xác nhận"}</span></div>
            <div className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-4"><span>Nhiệm vụ đào tạo: <strong>{metadata.trainingProgramName || "—"}</strong></span><span>Nhiệm vụ khóa đào tạo: <strong>{metadata.courseName || "—"}</strong></span><span>Khóa đào tạo: <strong>{metadata.openingName || "—"}</strong></span><span>Năm: <strong>{metadata.year || "—"}</strong></span><span>Ngày tổ chức: <strong>{metadata.sessions?.map((item) => item.sessionDate).filter(Boolean).join(", ") || "—"}</strong></span><span>Thời gian: <strong>{metadata.sessions?.map((item) => [item.startTime, item.endTime].filter(Boolean).join("–")).filter(Boolean).join(", ") || "—"}</strong></span></div>
            {(missingYear || missingDate || missingTime) && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3" onClick={(event) => event.stopPropagation()}>
              {missingYear && <label className="block text-xs font-semibold text-slate-700">Năm<input type="number" min="2000" max="2100" value={metadata.year || ""} onChange={(event) => updateMetadata((current) => ({ ...(current || {}), year: event.target.value ? Number(event.target.value) : null }))} className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm sm:max-w-48" /></label>}
              {(missingDate || missingTime) && <div className="mt-2 space-y-2">{sessions.map((session, sessionIndex) => <div key={sessionIndex} className="grid gap-2 sm:grid-cols-3">{!session.sessionDate ? <input aria-label={`Ngày tổ chức buổi ${sessionIndex + 1}`} type="date" value="" onChange={(event) => updateSession(sessionIndex, { sessionDate: event.target.value })} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm" /> : <span className="rounded-lg bg-white px-3 py-2 text-sm">{session.sessionDate}</span>}{!session.startTime ? <input aria-label={`Giờ bắt đầu buổi ${sessionIndex + 1}`} type="time" value="" onChange={(event) => updateSession(sessionIndex, { startTime: event.target.value })} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm" /> : <span className="rounded-lg bg-white px-3 py-2 text-sm">{session.startTime}</span>}<input aria-label={`Giờ kết thúc buổi ${sessionIndex + 1}`} type="time" value={session.endTime || ""} onChange={(event) => updateSession(sessionIndex, { endTime: event.target.value })} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm" /></div>)}<button type="button" onClick={() => updateMetadata((current) => ({ ...(current || {}), sessions: [...(current?.sessions || []), { sessionDate: "", startTime: "", endTime: "" }] }))} className="inline-flex items-center gap-1 text-xs font-bold text-blue-600"><Plus size={14} /> Thêm buổi</button></div>}
            </div>}
          </summary>
          <div className="border-t border-slate-200 p-5"><GoogleFormImportPanel compact initialFile={file} batchDuplicateKeys={batchDuplicateKeys} onRemove={() => { setFiles((list) => list.filter((item) => fileKey(item) !== key)); setStates((current) => { const next = { ...current }; delete next[key]; return next; }); }} onFileState={(value) => setStates((current) => JSON.stringify(current[key]) === JSON.stringify(value) ? current : { ...current, [key]: value })} /></div>
        </details>;
      })}
    </div>
  );
}
