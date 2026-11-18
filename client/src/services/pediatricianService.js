import { api } from "./api";

// The babies assigned to me (pediatrician).
export const getMyBabies = () => api("/pediatrician/babies");
