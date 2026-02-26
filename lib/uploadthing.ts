"use client";

import {
  generateUploadButton,
  generateUploadDropzone,
  generateReactHelpers,
} from "@uploadthing/react";

import type { OurFileRouter } from "@/app/api/uploadthing/core";

// UploadThing client components
// These automatically connect to /api/uploadthing route
// Make sure UPLOADTHING_APP_ID is set in your environment (or NEXT_PUBLIC_UPLOADTHING_APP_ID for client access)
export const UploadButton = generateUploadButton<OurFileRouter>({
  url: typeof window !== "undefined" ? `${window.location.origin}/api/uploadthing` : "/api/uploadthing",
});

export const UploadDropzone = generateUploadDropzone<OurFileRouter>({
  url: typeof window !== "undefined" ? `${window.location.origin}/api/uploadthing` : "/api/uploadthing",
});

// Generate React helpers for programmatic uploads
export const { useUploadThing } = generateReactHelpers<OurFileRouter>({
  url: typeof window !== "undefined" ? `${window.location.origin}/api/uploadthing` : "/api/uploadthing",
});
