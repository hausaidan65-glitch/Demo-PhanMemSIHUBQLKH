import { Paperclip, X } from 'lucide-react';
import { useRef, useState } from 'react';

import {
  formatFileSize,
  MAX_PROGRESS_FILES,
  MAX_PROGRESS_FILE_SIZE,
} from './progressAttachmentConfig';

const allowedExtensions = new Set([
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'png',
  'jpg',
  'jpeg',
]);

export default function ProgressAttachmentPicker({ files, onChange, disabled }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');

  const handleSelect = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';

    if (files.length + selectedFiles.length > MAX_PROGRESS_FILES) {
      setError(`Chỉ được đính kèm tối đa ${MAX_PROGRESS_FILES} tệp.`);
      return;
    }

    if (
      selectedFiles.some((file) => {
        const extension = file.name.split('.').pop()?.toLowerCase();
        return !extension || !allowedExtensions.has(extension);
      })
    ) {
      setError('Định dạng tệp không được hỗ trợ.');
      return;
    }

    if (selectedFiles.some((file) => file.size > MAX_PROGRESS_FILE_SIZE)) {
      setError('Tệp vượt quá dung lượng cho phép.');
      return;
    }

    setError('');
    onChange([...files, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setError('');
    onChange(files.filter((file, fileIndex) => fileIndex !== index));
  };

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-700">
        Tệp đính kèm
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg"
        onChange={handleSelect}
        disabled={disabled}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50 disabled:opacity-50"
      >
        <Paperclip size={17} />
        Chọn tệp
      </button>
      <p className="mt-2 text-xs text-slate-500">
        Tối đa 5 tệp, 10 MB/tệp. Hỗ trợ PDF, Office, PNG và JPG.
      </p>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2"
            >
              <span className="min-w-0 truncate text-sm text-slate-700">
                {file.name}
              </span>
              <span className="ml-auto shrink-0 text-xs text-slate-500">
                {formatFileSize(file.size)}
              </span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                disabled={disabled}
                aria-label={`Bỏ chọn ${file.name}`}
                className="shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-200 hover:text-red-600 disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
