import { createUploadthing, type FileRouter } from "uploadthing/next";

// Support both UPLOADTHING_SECRET (standard) and UPLOADTHING_TOKEN (custom)
if (process.env.UPLOADTHING_TOKEN && !process.env.UPLOADTHING_SECRET) {
  process.env.UPLOADTHING_SECRET = process.env.UPLOADTHING_TOKEN;
}

const f = createUploadthing();

export const ourFileRouter = {
  // Profile images for tenants
  tenantImage: f({ 
    image: { 
      maxFileSize: "2MB", 
      maxFileCount: 1 
    } 
  })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.url, key: file.key };
    }),

  // Profile images for users
  userImage: f({ 
    image: { 
      maxFileSize: "2MB", 
      maxFileCount: 1 
    } 
  })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.url, key: file.key };
    }),

  // Contract documents for rents (PDF)
  rentContract: f({ 
    pdf: { 
      maxFileSize: "4MB", 
      maxFileCount: 1 
    } 
  })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.url, key: file.key };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
