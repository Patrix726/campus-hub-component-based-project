"use client";

import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { useRef, useState } from "react";
import { useFiles } from "./useFiles";

export function FileUpload() {
  const { uploadFile } = useFiles();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleUpload = async () => {
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setStatus("uploading");
    setMessage("");
    try {
      const uploaded = await uploadFile(file);
      setStatus("done");
      setMessage(`Uploaded: ${uploaded.name}`);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Upload failed");
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-xl font-bold">Upload File</h2>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,image/*"
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold"
      />
      <Button onClick={handleUpload} disabled={status === "uploading"}>
        {status === "uploading" ? "Uploading..." : "Upload"}
      </Button>
      {message && (
        <p className={status === "error" ? "text-red-500 text-sm" : "text-green-600 text-sm"}>
          {message}
        </p>
      )}
    </Card>
  );
}
