import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string; // 'users', 'tenants', 'rents'
    const fileName = formData.get('fileName') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!folder) {
      return NextResponse.json(
        { error: 'No folder specified' },
        { status: 400 }
      );
    }

    // Validate file size and type based on folder
    const maxSize = folder === 'rents' ? 4 * 1024 * 1024 : 2 * 1024 * 1024; // 4MB for rents, 2MB for others
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size exceeds ${maxSize / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    // Validate file type
    if (folder === 'rents') {
      if (file.type !== 'application/pdf') {
        return NextResponse.json(
          { error: 'Only PDF files are allowed for contracts' },
          { status: 400 }
        );
      }
    } else {
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Only image files are allowed' },
          { status: 400 }
        );
      }
    }

    // Create Supabase client with error handling
    let supabase;
    try {
      supabase = createServerClient();
    } catch (error) {
      console.error('Supabase client creation error:', error);
      return NextResponse.json(
        { error: 'Server configuration error. Please check Supabase environment variables.' },
        { status: 500 }
      );
    }
    
    const bucket = 'realestate'; // Your Supabase bucket name

    // Generate unique file name
    const fileExt = file.name.split('.').pop();
    const uniqueFileName = fileName || `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${folder}/${uniqueFileName}`;

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json(
        { error: 'Failed to upload file', details: error.message },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return NextResponse.json({
      url: urlData.publicUrl,
      path: filePath,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
