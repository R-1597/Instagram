
import api from "@/lib/api";

export async function searchUsers(query) {
  const response = await api.get("/users/search", {
    params: { q: query },
  });

  return response.data;
}
