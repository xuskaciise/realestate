import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
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
        const uploadDir = join(process.cwd(), "public", "uploads", "tenants");
        
        if (!existsSync(uploadDir)) {
          await mkdir(uploadDir, { recursive: true });
        }

        const fileExtension = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExtension}`;
        const filePath = join(uploadDir, fileName);

        await writeFile(filePath, buffer);
        
        return NextResponse.json({
          message: "File uploaded successfully",
          fileName: `/uploads/tenants/${fileName}`,
          base64: dataUrl, // Also return base64 for consistency
        });
      } catch (fsError) {
        // If filesystem write fails, fall back to base64 only
        console.warn("Filesystem write failed, using base64 only:", fsError);
      }
    }
    
    // Return base64 data (works in both dev and production)
    return NextResponse.json({
      message: "File uploaded successfully",
      fileName: dataUrl, // Store base64 data URL directly
      base64: dataUrl,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
