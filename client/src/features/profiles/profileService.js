

import api from "../../lib/api";

export async function getCurrentUser() {
  const response = await api.get("/users/me");
  return response.data.user;
}

export async function getUserPosts(userId, page = 1, limit = 50) {
  const response = await api.get(`/users/${userId}/posts`, {
    params: { page, limit },
  });

  return response.data;
}

export async function getFollowCounts(userId) {
  const response = await api.get(`/users/${userId}/counts`);
  return response.data;
}

export async function getFollowStatus(userId) {
  const response = await api.get(`/users/${userId}/status`);
  return response.data;
}

export async function getFollowers(userId) {
  const response = await api.get(`/users/${userId}/followers`);
  return response.data;
}

export async function getFollowing(userId) {
  const response = await api.get(`/users/${userId}/following`);
  return response.data;
}

export async function followUser(userId) {
  const response = await api.post(`/users/${userId}/follow`);
  return response.data;
}

export async function unfollowUser(userId) {
  const response = await api.delete(`/users/${userId}/follow`);
  return response.data;
}


export async function updateCurrentUser(payload) {
  const response = await api.patch("/users/me", payload);
  return response.data.user;
}

export async function getUserProfile(userId) {
    const response = await api.get(`/users/${userId}`);
    return response.data.user;
}