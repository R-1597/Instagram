import api from "@/lib/api";

export async function getConversations() {
  const response = await api.get("/messages/conversations");
  return response.data;
}

export async function startConversation(recipientId) {
  const response = await api.post("/messages/conversations", {
    recipientId,
  });
  return response.data;
}

export async function getMessages(conversationId) {
  const response = await api.get(
    `/messages/conversations/${conversationId}/messages`
  );
  return response.data;
}

export async function sendMessage(conversationId, text) {
  const response = await api.post(
    `/messages/conversations/${conversationId}/messages`,
    { text }
  );
  return response.data;
}

export async function searchMessageUsers(query) {
  const response = await api.get("/users/search", {
    params: { q: query },
  });

  return response.data;
}

export async function getUnreadMessageCount() {
  const response = await api.get("/messages/unread-count");
  return response.data;
}

export async function markConversationRead(conversationId) {
  const response = await api.patch(
    `/messages/conversations/${conversationId}/read`
  );

  return response.data;
}