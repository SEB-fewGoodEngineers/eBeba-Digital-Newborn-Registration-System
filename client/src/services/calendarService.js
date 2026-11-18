import { downloadFile } from "./api";

// Download the baby's upcoming check-ups and vaccinations as an .ics file.
// downloadFile() sends the login token; a normal link cannot.
export const downloadCalendar = (babyId) =>
  downloadFile(`/babies/${babyId}/calendar.ics`, "ebeba-calendar.ics");
