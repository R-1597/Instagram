
import api from "../../lib/api";

export async function getHomeFeed(page = 1, limit = 10) {
  const response = await api.get("/posts/feed", {
    params: { page, limit },
  });

  return response.data;
}


export async function likePost(postId) {
  const response = await api.post(`/posts/${postId}/like`);
  return response.data;
}

export async function unlikePost(postId) {
  const response = await api.delete(`/posts/${postId}/like`);
  return response.data;
}


export async function uploadPostImage(file) {
  const formData = new FormData();
  formData.append("image", file);

  const response = await api.post("/posts/uploads/image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function createPost(payload) {
  const response = await api.post("/posts", payload);
  return response.data;
}


export async function getPostComments(postId, page = 1, limit = 20) {
  const response = await api.get(`/posts/${postId}/comments`, {
    params: { page, limit },
  });

  return response.data;
}

export async function createComment(postId, text) {
  const response = await api.post(`/posts/${postId}/comments`, {
    text,
  });

  return response.data;
}

export async function deleteComment(postId, commentId) {
  const response = await api.delete(
    `/posts/${postId}/comments/${commentId}`
  );

  return response.data;
}
