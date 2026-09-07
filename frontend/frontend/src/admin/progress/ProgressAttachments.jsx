import { FileText } from 'lucide-react';
import { useState } from 'react';

import progressAttachmentApi from '../../services/progressAttachmentApi';
import { formatFileSize } from './progressAttachmentConfig';

export default function ProgressAttachments({ attachments }) {
  const [openingId, setOpeningId] = useState(null);
  const [error, setError] = useState('');

  if (!Array.isArray(attachments) || !attachments.length) return null;

  const handleOpen = async (attachment) => {
    if (openingId !== null) return;

    setOpeningId(attachment.id);
    setError('');

    try {
      const response = await progressAttachmentApi.download(attachment.id);
      const objectUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = attachment.original_name || 'attachment';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (requestError) {
      if (requestError?.response?.status === 403) {
        setError('Bạn không có quyền truy cập tệp này.');
      } else if (requestError?.response?.status === 404) {
        setError('Không tìm thấy tệp đính kèm.');
      } else {
        setError('Không thể mở tệp đính kèm. Vui lòng thử lại.');
      }
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Tệp đính kèm
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {attachments.map((attachment) => (
          <button
            type="button"
            key={attachment.id}
            onClick={() => handleOpen(attachment)}
            disabled={openingId !== null}
            className="inline-flex max-w-full items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100"
          >
            <FileText size={16} className="shrink-0" />
            <span className="truncate">{attachment.original_name}</span>
            <span className="shrink-0 text-xs text-violet-500">
              {formatFileSize(attachment.file_size)}
            </span>
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
