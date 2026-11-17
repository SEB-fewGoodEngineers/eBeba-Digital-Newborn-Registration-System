
import { api } from "./api";

// STORY 1.1 - HOSPITAL BIRTH RECORDS

export const getBabies = () => api("/babies");

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
