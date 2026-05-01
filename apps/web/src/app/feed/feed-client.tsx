"use client";

import { authClient } from "@/lib/auth-client";
import { useFeed } from "@repo/feature-posts/client";
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface FeedClientProps {
  session: typeof authClient.$Infer.Session;
}

export default function FeedClient({ session }: FeedClientProps) {
  const { posts, loading, error, refresh } = useFeed();

  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [contentError, setContentError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setContentError(null);
    setSubmitError(null);

    if (!content.trim()) {
      setContentError("Post content cannot be empty.");
      return;
    }

    setSubmitting(true);
    try {
      const body: { content: string; imageUrl?: string } = { content: content.trim() };
      if (imageUrl.trim()) {
        body.imageUrl = imageUrl.trim();
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Failed to create post");
      }

      setContent("");
      setImageUrl("");
      refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-2xl font-bold">Community Feed</h1>
      <p className="text-sm text-muted-foreground">
        Signed in as {session.user.name}
      </p>

      {/* Post creation form */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Create a Post</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="content">What&apos;s on your mind?</Label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share something with the community..."
              rows={4}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              maxLength={2000}
            />
            {contentError && (
              <p className="mt-1 text-sm text-destructive">{contentError}</p>
            )}
          </div>
          <div>
            <Label htmlFor="imageUrl">Image URL (optional)</Label>
            <Input
              id="imageUrl"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1"
            />
          </div>
          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Posting...
              </>
            ) : (
              "Post"
            )}
          </Button>
        </form>
      </Card>

      {/* Feed */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load feed: {error}
        </div>
      ) : posts.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          No posts yet. Be the first to share something!
        </p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{post.authorName}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(post.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {post.likeCount} {post.likeCount === 1 ? "like" : "likes"} ·{" "}
                  {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
                </div>
              </div>
              <p className="mt-2 text-sm whitespace-pre-wrap">{post.content}</p>
              {post.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.imageUrl}
                  alt="Post image"
                  className="mt-3 rounded-md max-h-64 object-cover w-full"
                />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
