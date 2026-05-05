"use client";

import { FileList } from "@repo/feature-file-sharing/client";
import { FileUpload } from "@repo/feature-file-sharing/client";

export default function FilesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl space-y-6">
        <FileUpload />
        <FileList />
      </div>
    </div>
  );
}
