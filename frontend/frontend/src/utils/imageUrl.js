const SERVER_URL = import.meta.env.VITE_SERVER_URL || "";

export function getImageUrl(path) {
  if (!path) {
    return "";
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${SERVER_URL}${normalizedPath}`;
}
