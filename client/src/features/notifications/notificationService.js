import api from "../../lib/api";

export async function getUnreadNotificationCount() {
  const response = await api.get("/notifications/unread-count");
  return response.data;
}


export async function getNotifications(page = 1, limit = 20) {
  const response = await api.get("/notifications", {
    params: { page, limit },
  });
  return response.data;
}

export async function markNotificationRead(notificationId) {
  const response = await api.patch(
    `/notifications/${notificationId}/read`
  );
  return response.data;
}

export async function markAllNotificationsRead() {
  const response = await api.patch("/notifications/read-all");
  return response.data;
}

export async function deleteNotification(notificationId) {
  const response = await api.delete(
    `/notifications/${notificationId}`
  );
  return response.data;
}