import { api } from "./api";

// Get the check-ups of one baby (soonest first).
export const getAppointments = (babyId) =>
  api(`/babies/${babyId}/appointments`);

// Add a check-up: { title, scheduledAt, location, notes }.
export const createAppointment = (babyId, appointment) =>
  api(`/babies/${babyId}/appointments`, {
    method: "POST",
    body: appointment,
  });

// Mark a check-up "completed" or "cancelled".
export const updateAppointmentStatus = (babyId, appointmentId, status) =>
  api(`/babies/${babyId}/appointments/${appointmentId}`, {
    method: "PATCH",
    body: { status },
  });
