
import api from "../../lib/api";

export async function getHomeFeed(page = 1, limit = 10) {
  const response = await api.get("/posts/feed", {
    params: { page, limit },
  });

  return response.data;
}
