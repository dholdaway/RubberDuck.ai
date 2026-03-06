import { NextRequest, NextResponse } from "next/server";
import { noteService } from "@/services/note.service";
import type { ApiResponse } from "@/types";

// GET /api/audio-notes/:id — get note detail
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const note = await noteService.getNote(params.id);
    if (!note) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "Note not found" },
        { status: 404 }
      );
    }
    return NextResponse.json<ApiResponse>({ success: true, data: note });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get note";
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/audio-notes/:id — delete note
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await noteService.deleteNote(params.id);
    return NextResponse.json<ApiResponse>({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete note";
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
