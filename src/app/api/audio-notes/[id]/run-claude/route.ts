import { NextRequest, NextResponse } from "next/server";
import { noteService } from "@/services/note.service";
import type { ApiResponse } from "@/types";

// POST /api/audio-notes/:id/run-claude
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let customPrompt: string | undefined;
    try {
      const body = await request.json();
      if (body.prompt && typeof body.prompt === "string") {
        customPrompt = body.prompt;
      }
    } catch {
      // No body or invalid JSON — use default prompt from artifact
    }

    const note = await noteService.runClaude(params.id, customPrompt);
    return NextResponse.json<ApiResponse>({ success: true, data: note });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Claude execution failed";
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 });
  }
}
