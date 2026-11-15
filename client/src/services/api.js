// The ONLY place in the app that calls fetch.
// Service files (authService.js, diaryService.js...) use api() and downloadFile().

const BASE_URL = import.meta.env.VITE_BACK_END_SERVER_URL;
const TOKEN_KEY = "token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const saveToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const removeToken = () => localStorage.removeItem(TOKEN_KEY);

// Sent when the server says the token is no longer valid.
// UserProvider listens for it and signs the user out.
export const SESSION_ENDED_EVENT = "ebeba:session-ended";

const buildHeaders = (hasBody) => {
  const headers = {};
  if (hasBody) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const handleError = async (res) => {
  const data = await res.json().catch(() => null);

  // The token expired or the user was deactivated: sign out everywhere
  if (res.status === 401 && getToken()) {
    removeToken();
    window.dispatchEvent(new Event(SESSION_ENDED_EVENT));
  }

  const error = new Error(
    data?.err || "Something went wrong. Please try again.",
  );
  error.status = res.status;
  error.details = data?.details || [];
  throw error;
};

// api("/babies/123/diary-entries")
// api("/babies/123/diary-entries", { method: "POST", body: { category: "sleep" } })
export const api = async (path, { method = "GET", body } = {}) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: buildHeaders(body !== undefined),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) return handleError(res);
  if (res.status === 204) return null;
  return res.json();
};

// Downloads a file (for example a PDF certificate) with the login token.
// A normal <a href> link cannot send the token, so always use this.
export const downloadFile = async (path, fileName) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: buildHeaders(false),
  });
  if (!res.ok) return handleError(res);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
