"use client";

import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useFiles } from "./useFiles";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileList() {
  const { files, loading, error, deleteFile } = useFiles();

  if (loading) {
    return (
      <Card className="p-6 space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
      </Card>
    );
  }

  if (error) return <div className="text-red-500">Error: {error}</div>;

  if (files.length === 0) {
    return <Card className="p-6 text-gray-500">No files uploaded yet.</Card>;
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Files</h2>
      <ul className="space-y-3">
        {files.map((file) => (
          <li key={file.id} className="flex items-center justify-between border rounded p-3">
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-gray-500">{formatBytes(file.size)}</p>
            </div>
            <div className="flex gap-2">
              <a href={file.url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">View</Button>
              </a>
              <a href={file.url} download={file.name}>
                <Button variant="outline" size="sm">Download</Button>
              </a>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteFile(file.id)}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
