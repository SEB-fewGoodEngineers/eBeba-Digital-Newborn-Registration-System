import { api } from "./api";

export const getBabies = () => api("/babies");

export const createBaby = (babyData) =>
  api("/babies", {
    method: "POST",
    body: babyData,
  });
