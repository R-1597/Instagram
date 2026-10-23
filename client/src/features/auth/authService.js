

import api from "@/lib/api";

export async function registerUser(formData) {
  const payload = {
    username: formData.username.trim().toLowerCase(),
    email: formData.email.trim().toLowerCase(),
    password: formData.password,
    ...(formData.displayName?.trim()
      ? { displayName: formData.displayName.trim() }
      : {}),
  };

  const response = await api.post("/auth/register", payload);
  return response.data;
}

export async function loginUser(credentials) {
  const response = await api.post("/auth/login", {
    email: credentials.email.trim().toLowerCase(),
    password: credentials.password,
  });

  return response.data;
}

export async function forgotPassword(email) {
  const response = await api.post("/auth/forgot-password", {
    email: email.trim().toLowerCase(),
  });

  return response.data;
}

export async function resetPassword(token, newPassword) {
  const response = await api.post("/auth/reset-password", {
    token,
    newPassword,
  });

  return response.data;
}



export async function changePassword(currentPassword, newPassword) {
  const response = await api.patch("/auth/change-password", {
    currentPassword,
    newPassword,
  });

  return response.data;
}
