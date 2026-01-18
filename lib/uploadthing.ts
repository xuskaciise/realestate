import {
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react";

import type { OurFileRouter } from "@/app/api/uploadthing/core";

// UploadThing client components - automatically reads UPLOADTHING_APP_ID from env
export const UploadButton = generateUploadButton<OurFileRouter>({
  url: "/api/uploadthing",
});

export const UploadDropzone = generateUploadDropzone<OurFileRouter>({
  url: "/api/uploadthing",
});
