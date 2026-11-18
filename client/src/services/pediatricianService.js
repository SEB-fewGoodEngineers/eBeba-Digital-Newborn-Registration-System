import { api } from "./api";

// The babies assigned to me (pediatrician).
export const getMyBabies = () => api("/pediatrician/babies");

// Story 4.7: one baby's growth measurements, read-only. { baby, measurements }
export const getBabyGrowth = (babyId) =>
  api(`/pediatrician/babies/${babyId}/growth-measurements`);
