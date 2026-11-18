
import { api } from "./api";

// STORY 1.1 - HOSPITAL BIRTH RECORDS

// STORY 1.5 - SEARCH THE HOSPITAL LIST
export const getBabies = (search = "") =>
  api(`/babies?search=${encodeURIComponent(search)}`);

export const createBaby = (babyData) =>
  api("/babies", {
    method: "POST",
    body: babyData,
  });

// STORY 1.2 - LINK MY BABY

export const linkBaby = (birthRecordNumber) =>
  api("/babies/link", {
    method: "POST",
    body: { birthRecordNumber },
  });

export const getMyBabies = () => api("/babies/mine");

export const getBaby = (babyId) => api(`/babies/${babyId}`);
