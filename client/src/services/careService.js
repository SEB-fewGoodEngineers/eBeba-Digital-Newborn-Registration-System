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
