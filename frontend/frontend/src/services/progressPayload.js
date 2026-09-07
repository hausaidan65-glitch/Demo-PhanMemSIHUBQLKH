export function createProgressPayload({ content, note, files = [] }) {
  if (!files.length) return { content, note };

  const formData = new FormData();
  formData.append('content', content);
  if (note) formData.append('note', note);
  files.forEach((file) => formData.append('files', file));

  return formData;
}
