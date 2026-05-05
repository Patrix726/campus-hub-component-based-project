// apps/web/src/components/SearchBar.tsx
"use client";

import { env } from "@repo/env/web";
import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Badge } from "@repo/ui/components/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  profile?: { bio?: string; major?: string };
}

interface Post {
  id: string;
  content: string;
  author: {
    id: string;
    name: string;
    image?: string;
  };
  _count?: { likes: number; comments: number };
}

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  dueDate?: string;
  user: {
    id: string;
    name: string;
    image?: string;
  };
}

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    users?: User[];
    posts?: Post[];
    tasks?: Task[];
  }>({});
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "users" | "posts" | "tasks">("all");
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (value.length < 2) {
      setResults({});
      setShowResults(false);
      return;
    }

    try {
      setLoading(true);
      const searchParams = new URLSearchParams();
      searchParams.append("q", value);
      if (filterType !== "all") {
        searchParams.append("type", filterType);
      }

      const response = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/search?${searchParams}`);
      const data = await response.json();
      setResults(data);
      setShowResults(true);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const hasResults = Object.values(results).some(
    (arr) => Array.isArray(arr) && arr.length > 0
  );

  return (
    <div ref={searchRef} className="w-full">
      <div className="relative">
        <div className="flex gap-2 mb-4">
          <Input
            type="search"
            placeholder="Search users, posts, tasks..."
            value={query}
            onChange={handleSearch}
            className="flex-1"
            onFocus={() => query.length >= 2 && setShowResults(true)}
          />
          <Select
            value={filterType}
            onValueChange={(value: any) => setFilterType(value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="users">Users</SelectItem>
              <SelectItem value="posts">Posts</SelectItem>
              <SelectItem value="tasks">Tasks</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results Dropdown */}
        {showResults && query.length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                Searching...
              </div>
            ) : !hasResults ? (
              <div className="p-4 text-center text-gray-500">
                No results found
              </div>
            ) : (
              <div className="space-y-2 p-2">
                {/* Users Section */}
                {results.users && results.users.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-xs font-semibold text-gray-600 uppercase">
                      Users
                    </div>
                    {results.users.map((user) => (
                      <div
                        key={user.id}
                        className="p-2 hover:bg-gray-100 cursor-pointer rounded"
                      >
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                        {user.profile?.major && (
                          <Badge variant="outline" className="mt-1">
                            {user.profile.major}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Posts Section */}
                {results.posts && results.posts.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-xs font-semibold text-gray-600 uppercase">
                      Posts
                    </div>
                    {results.posts.map((post) => (
                      <div
                        key={post.id}
                        className="p-2 hover:bg-gray-100 cursor-pointer rounded"
                      >
                        <div className="text-sm line-clamp-2">
                          {post.content}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          by {post.author.name}
                        </div>
                        <div className="flex gap-2 mt-1 text-xs text-gray-500">
                          <span>❤️ {post._count?.likes || 0} likes</span>
                          <span>💬 {post._count?.comments || 0} comments</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tasks Section */}
                {results.tasks && results.tasks.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-xs font-semibold text-gray-600 uppercase">
                      Tasks
                    </div>
                    {results.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-2 hover:bg-gray-100 cursor-pointer rounded"
                      >
                        <div className="font-medium line-clamp-1">
                          {task.title}
                        </div>
                        <div className="text-xs text-gray-600">
                          by {task.user.name}
                        </div>
                        <div className="flex gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className={
                              task.priority === "high"
                                ? "bg-red-100 text-red-800"
                                : task.priority === "medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }
                          >
                            {task.priority}
                          </Badge>
                          <Badge variant="outline">{task.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
