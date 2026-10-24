
import api from "@/lib/api";

export async function deletePost(postId) {
  const response = await api.delete(`/posts/${postId}`);
  return response.data;
}
