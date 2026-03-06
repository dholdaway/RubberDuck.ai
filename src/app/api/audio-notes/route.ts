import { NextRequest, NextResponse } from "next/server";
import { noteService } from "@/services/note.service";
import type { ApiResponse } from "@/types";

// GET /api/audio-notes — list all notes
export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get("search") || undefined;
    const notes = await noteService.listNotes(search);
    return NextResponse.json<ApiResponse>({ success: true, data: notes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list notes";
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/audio-notes — upload audio file
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("audio") as File | null;
    const title = formData.get("title") as string | null;

    if (!file) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "No audio file provided" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const note = await noteService.createNote(buffer, file.name, file.type, title || undefined);

    return NextResponse.json<ApiResponse>({ success: true, data: note }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create note";
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
