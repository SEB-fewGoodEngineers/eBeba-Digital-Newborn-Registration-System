import { api } from "./api";
import { todayRange } from "../utils/dates";

// Get the vaccinations of one baby (by scheduled date).
export const getVaccinations = (babyId) =>
  api(`/babies/${babyId}/vaccinations`);

// Add a scheduled vaccination.
export const createVaccination = (babyId, vaccination) =>
  api(`/babies/${babyId}/vaccinations`, {
    method: "POST",
    body: vaccination,
  });

// Mark a vaccination as given.
export const markVaccinationGiven = (babyId, vaccinationId, administeredDate) =>
  api(`/babies/${babyId}/vaccinations/${vaccinationId}`, {
    method: "PATCH",
    body: { administeredDate },
  });

// "Overdue" is worked out when shown, never stored:
// the scheduled day is before today and there is no given date.
export const isOverdue = (vaccination, now = new Date()) =>
  !vaccination.administeredDate &&
  new Date(vaccination.scheduledDate) < new Date(todayRange(now).from);
