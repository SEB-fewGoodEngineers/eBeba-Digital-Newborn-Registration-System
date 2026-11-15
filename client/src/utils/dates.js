// Date helpers. The server stores UTC; the browser shows the user's local time.

const pad = (n) => String(n).padStart(2, "0");

// Value from <TextField type="date"> ("2026-11-16") or type="datetime-local"
// ("2026-11-16T08:30") → ISO string for the server.
// Date-only strings are read as LOCAL midnight. (new Date("2026-11-16") would use UTC.)
export const toIso = (value) => {
  if (!value) return undefined;
  const local = value.length === 10 ? `${value}T00:00` : value;
  return new Date(local).toISOString();
};

// ISO string from the server → value for <TextField type="date">
export const toDateInput = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// ISO string from the server → value for <TextField type="datetime-local">
export const toDateTimeInput = (iso) => {
  const d = new Date(iso);
  return `${toDateInput(iso)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// "16.11.2026"
export const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};

// "16.11.2026 08:30"
export const formatDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${formatDate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// The user's local day as { from, to } ISO strings, for "today" lists
export const todayRange = (date = new Date()) => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
};
