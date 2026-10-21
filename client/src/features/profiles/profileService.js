import api from "../../lib/api";

export async function getCurrentUser() {
  const response = await api.get("/users/me");
  return response.data.user;
}

export async function getUserPosts(userId, page = 1, limit = 10) {
  const response = await api.get(`/users/${userId}/posts`, {
    params: { page, limit },
  });

  return response.data;
}

export async function updateCurrentUser(payload) {
  const response = await api.patch("/users/me", payload);
  return response.data.user;
}