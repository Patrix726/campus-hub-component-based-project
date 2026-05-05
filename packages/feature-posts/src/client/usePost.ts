import { useState, useEffect } from "react";
import { env } from "@repo/env/web";
import type { FeedPost } from "../shared";

export function usePost(postId: string) {
  const [post, setPost] = useState<FeedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchPost = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/posts/${postId}`);
        if (!res.ok) throw new Error("Failed to fetch post");
        const data = await res.json();
        if (!cancelled) setPost(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPost();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  return { post, loading, error };
}
