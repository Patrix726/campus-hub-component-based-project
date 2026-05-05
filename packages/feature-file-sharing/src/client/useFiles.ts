import { useState, useEffect, useCallback } from "react";
import type { FileRecord } from "../shared";

export function useFiles() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/files");
      if (!res.ok) throw new Error("Failed to fetch files");
      setFiles(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadFile = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/files/upload", { method: "POST", body: form });
    if (!res.ok) throw new Error("Upload failed");
    const uploaded: FileRecord = await res.json();
    setFiles((prev) => [uploaded, ...prev]);
    return uploaded;
  };

  const deleteFile = async (id: string) => {
    const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Delete failed");
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  useEffect(() => { getFiles(); }, [getFiles]);

  return { files, loading, error, uploadFile, deleteFile, refetch: getFiles };
}
