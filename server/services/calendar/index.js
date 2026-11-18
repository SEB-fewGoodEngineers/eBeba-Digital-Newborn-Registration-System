// CALENDAR SERVICE (Story 4.6)
// Builds an .ics file (iCalendar, RFC 5545) without an extra package.
// Google Calendar and Apple Calendar both read this format.

const TIMEZONE = "Europe/Podgorica";
const PRODUCT_ID = "-//eBeba//Demo calendar export//EN";
const UID_DOMAIN = "ebeba.demo";
const APPOINTMENT_LENGTH_MS = 60 * 60 * 1000; // a check-up has no end time: 1 hour

// Text values: escape \ ; , and new lines (RFC 5545, 3.3.11).
const escapeText = (value) =>
  String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

// Lines longer than 75 bytes are folded: CRLF + one space (RFC 5545, 3.1).
// Never cut inside a UTF-8 character (č, ć, š, ž, đ).
const foldLine = (line) => {
  const parts = [];
  let current = "";
  let currentBytes = 0;

  for (const char of line) {
    const charBytes = Buffer.byteLength(char, "utf8");
    const limit = parts.length === 0 ? 75 : 74; // folded lines start with a space
    if (currentBytes + charBytes > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += charBytes;
  }
  parts.push(current);

  return parts.join("\r\n ");
};

// 2026-11-18T08:00:00.000Z → 20261118T080000Z
const formatUtc = (date) =>
  new Date(date)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

// The calendar day in Montenegro, as YYYYMMDD.
const formatLocalDay = (date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(date));
  const get = (type) => parts.find((part) => part.type === type).value;
  return `${get("year")}${get("month")}${get("day")}`;
};

// The day after YYYYMMDD (all-day events end on the next day).
const nextDay = (yyyymmdd) => {
  const d = new Date(
    Date.UTC(
      Number(yyyymmdd.slice(0, 4)),
      Number(yyyymmdd.slice(4, 6)) - 1,
      Number(yyyymmdd.slice(6, 8)) + 1,
    ),
  );
  return d.toISOString().slice(0, 10).replace(/-/g, "");
};

// A vaccination is planned for a day: an all-day event.
const vaccinationEvent = (vaccination, babyLabel, stamp) => {
  const day = formatLocalDay(vaccination.scheduledDate);
  return [
    "BEGIN:VEVENT",
    `UID:vaccination-${vaccination._id}@${UID_DOMAIN}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${day}`,
    `DTEND;VALUE=DATE:${nextDay(day)}`,
    `SUMMARY:${escapeText(
      `Vaccination: ${vaccination.vaccineName}, dose ${vaccination.doseNumber}`,
    )}`,
    `DESCRIPTION:${escapeText(`${babyLabel}. Demo schedule from eBeba.`)}`,
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
  ];
};

// A check-up has a date and time: a timed event in UTC.
const appointmentEvent = (appointment, babyLabel, stamp) => {
  const start = new Date(appointment.scheduledAt);
  const end = new Date(start.getTime() + APPOINTMENT_LENGTH_MS);
  return [
    "BEGIN:VEVENT",
    `UID:appointment-${appointment._id}@${UID_DOMAIN}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${formatUtc(start)}`,
    `DTEND:${formatUtc(end)}`,
    `SUMMARY:${escapeText(appointment.title)}`,
    ...(appointment.location
      ? [`LOCATION:${escapeText(appointment.location)}`]
      : []),
    `DESCRIPTION:${escapeText(`${babyLabel}. Demo check-up from eBeba.`)}`,
    "END:VEVENT",
  ];
};

/**
 * Build the .ics text for one baby.
 * @param {object} input
 * @param {object} input.baby           { firstName } (never the JMBG)
 * @param {Array}  input.appointments   upcoming check-ups
 * @param {Array}  input.vaccinations   scheduled vaccinations
 * @param {Date}   [input.now]
 */
const buildCalendar = ({
  baby,
  appointments = [],
  vaccinations = [],
  now = new Date(),
}) => {
  const stamp = formatUtc(now);
  const babyLabel = baby?.firstName ? `For ${baby.firstName}` : "For your baby";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODUCT_ID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText("eBeba")}`,
    ...appointments.flatMap((a) => appointmentEvent(a, babyLabel, stamp)),
    ...vaccinations.flatMap((v) => vaccinationEvent(v, babyLabel, stamp)),
    "END:VCALENDAR",
  ];

  // Every line ends with CRLF, also the last one.
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
};

module.exports = {
  buildCalendar,
  escapeText,
  foldLine,
  formatLocalDay,
  TIMEZONE,
};
