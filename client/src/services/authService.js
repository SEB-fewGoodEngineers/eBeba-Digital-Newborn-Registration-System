import { api, saveToken, removeToken } from "./api";

// Each returns the user object. The token is saved for later requests.

export const signUp = async (formData) => {
  const { token, user } = await api("/auth/sign-up", {
    method: "POST",
    body: formData,
  });
  saveToken(token);
  return user;
};

export const signIn = async (formData) => {
  const { token, user } = await api("/auth/sign-in", {
    method: "POST",
    body: formData,
  });
  saveToken(token);
  return user;
};

export const getMe = () => api("/users/me");

export const signOut = () => removeToken();
