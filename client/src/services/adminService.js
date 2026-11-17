
import { api } from "./api";

export const getAdminUsers = () => api("/admin/users");

export const getAdminInstitutions = () => api("/admin/institutions");

export const createStaffUser = (data) =>
  api("/admin/users", {
    method: "POST",
    body: data,
  });

export const updateUserStatus = (userId, isActive) =>
  api(`/admin/users/${userId}`, {
    method: "PATCH",
    body: { isActive },
  });
