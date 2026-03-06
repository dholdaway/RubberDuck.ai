import { NextRequest, NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import path from "path";

// GET /api/audio-notes/file/:filename — serve audio files
export async function GET(
  _request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const basePath = process.env.STORAGE_LOCAL_PATH || "./uploads";
    const filePath = path.join(basePath, decodeURIComponent(params.filename));
    const buffer = await storage.read(filePath);

    // Determine content type from extension
    const ext = params.filename.split(".").pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      webm: "audio/webm",
      mp3: "audio/mpeg",
      wav: "audio/wav",
      m4a: "audio/mp4",
      ogg: "audio/ogg",
      mp4: "audio/mp4",
    };
    const contentType = mimeMap[ext || ""] || "application/octet-stream";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
