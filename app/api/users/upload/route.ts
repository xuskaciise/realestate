import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only images are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (max 2MB for base64)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 2MB limit." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Convert to base64
    const base64Image = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64Image}`;

    // Try to save to filesystem in development, but always return base64 for production compatibility
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
    
    if (!isProduction) {
      // In development, also save to filesystem
      try {
        const fileExtension = file.name.split(".").pop();
        const fileName = `${uuidv4()}.${fileExtension}`;

        // Create uploads/users directory if it doesn't exist
        const uploadDir = join(process.cwd(), "public", "uploads", "users");
        if (!existsSync(uploadDir)) {
          mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = join(uploadDir, fileName);
        await writeFile(filePath, buffer);

        // Return the file path relative to public folder
        const publicPath = `/uploads/users/${fileName}`;

        return NextResponse.json({
          success: true,
          path: publicPath,
          fileName: fileName,
          base64: dataUrl, // Also return base64 for consistency
        });
      } catch (fsError) {
        // If filesystem write fails, fall back to base64 only
        console.warn("Filesystem write failed, using base64 only:", fsError);
      }
    }
    
    // Return base64 data (works in both dev and production)
    return NextResponse.json({
      success: true,
      path: dataUrl, // Store base64 data URL directly
      fileName: dataUrl,
      base64: dataUrl,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
