import { useState, useEffect, useCallback } from "react";
import { env } from "@repo/env/web";
import type { FeedPost } from "../shared";

export function useFeed(page = 1, limit = 20) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/posts?page=${page}&limit=${limit}`);
      if (!res.ok) throw new Error("Failed to fetch feed");
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  return { posts, loading, error, refresh: fetchFeed };
}
