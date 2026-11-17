import { api } from "./api";

export const getDiaryEntries = (babyId, from, to) => {
  const params = new URLSearchParams({ from, to });
  return api(`/babies/${babyId}/diary-entries?${params.toString()}`);
};

export const createDiaryEntry = (babyId, entry) =>
  api(`/babies/${babyId}/diary-entries`, {
    method: "POST",
    body: entry,
  });

export const deleteDiaryEntry = (babyId, entryId) =>
  api(`/babies/${babyId}/diary-entries/${entryId}`, {
    method: "DELETE",
  });

export const getGrowthMeasurements = (babyId) =>
  api(`/babies/${babyId}/growth-measurements`);

export const createGrowthMeasurement = (babyId, measurement) =>
  api(`/babies/${babyId}/growth-measurements`, {
    method: "POST",
    body: measurement,
  });