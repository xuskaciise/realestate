"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onUploadComplete: (keyOrUrl: string) => void;
  onUploadError?: (error: string) => void;
  folder: "users" | "tenants" | "rents";
  accept?: string;
  maxSize?: number; // in MB
  currentFile?: string; // Current file URL to show preview
  className?: string;
  variant?: "button" | "dropzone";
  label?: string;
}

export function FileUpload({
  onUploadComplete,
  onUploadError,
  folder,
  accept,
  maxSize,
  currentFile,
  className,
  variant = "button",
  label,
}: FileUploadProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (file: File) => {
    // Validate file size
    const maxSizeBytes = (maxSize || (folder === "rents" ? 4 : 2)) * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const errorMsg = `File size exceeds ${maxSize || (folder === "rents" ? 4 : 2)}MB limit`;
      onUploadError?.(errorMsg);
      return;
    }

    // Validate file type
    if (folder === "rents") {
      if (file.type !== "application/pdf") {
        onUploadError?.("Only PDF files are allowed");
        return;
      }
    } else {
      if (!file.type.startsWith("image/")) {
        onUploadError?.("Only image files are allowed");
        return;
      }
    }

    setUploadProgress(0);

    try {
      setUploading(true);

      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder,
          filename: file.name,
          contentType: file.type,
        }),
      });

      if (!presignRes.ok) {
        const err = await presignRes.json().catch(() => null);
        throw new Error(err?.error || "Failed to prepare upload");
      }

      const { uploadUrl, key } = (await presignRes.json()) as {
        uploadUrl: string;
        key: string;
      };

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);

        xhr.upload.onprogress = (e) => {
          if (!e.lengthComputable) return;
          const pct = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(pct);
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(file);
      });

      // Private buckets: store the object key. Use /api/uploads/sign-get for preview/view.
      onUploadComplete(key);
    } catch (error) {
      console.error("Upload error:", error);
      onUploadError?.(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  if (variant === "dropzone") {
    return (
      <div className={cn("space-y-2", className)}>
        {currentFile && (
          <div className="relative inline-block">
            {folder === "rents" ? (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
                <a
                  href={currentFile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline truncate max-w-xs"
                >
                  View Contract
                </a>
              </div>
            ) : (
              <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
                <img
                  src={currentFile}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        )}

        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 transition-colors",
            dragActive
              ? "border-primary bg-primary/5"
              : "border-gray-300 dark:border-gray-700",
            uploading && "opacity-50 cursor-not-allowed"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center gap-3">
            <Upload
              className={cn(
                "h-12 w-12",
                dragActive
                  ? "text-primary"
                  : "text-gray-400 dark:text-gray-500"
              )}
            />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {label || "Drag and Drop here"}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">or</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={accept || (folder === "rents" ? "application/pdf" : "image/*")}
              onChange={handleInputChange}
              disabled={uploading}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-transparent text-blue-600 dark:text-blue-400 font-medium px-0 py-0 border-0 shadow-none hover:underline"
            >
              Browse files
            </Button>
            {uploading && (
              <div className="w-full max-w-xs space-y-1">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Uploading... {Math.round(uploadProgress)}%
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Button variant
  return (
    <div className={cn("space-y-2", className)}>
      {currentFile && folder !== "rents" && (
        <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
          <img
            src={currentFile}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept || (folder === "rents" ? "application/pdf" : "image/*")}
        onChange={handleInputChange}
        disabled={uploading}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full"
      >
        {uploading ? (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span>Uploading... {Math.round(uploadProgress)}%</span>
          </div>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            {label || "Choose File"}
          </>
        )}
      </Button>
      {currentFile && !uploading && (
        <p className="text-xs text-green-600">✓ File uploaded successfully</p>
      )}
    </div>
  );
}
