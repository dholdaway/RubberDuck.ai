import { NextRequest, NextResponse } from "next/server";
import { noteService } from "@/services/note.service";
import type { ApiResponse } from "@/types";

// POST /api/audio-notes/:id/run-claude
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const note = await noteService.runClaude(params.id);
    return NextResponse.json<ApiResponse>({ success: true, data: note });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Claude execution failed";
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
