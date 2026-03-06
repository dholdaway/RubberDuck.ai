"use client";

import type { NoteStatus } from "@/types";

const statusConfig: Record<NoteStatus, { label: string; color: string }> = {
  uploaded: { label: "Uploaded", color: "bg-gray-100 text-gray-700" },
  transcribing: { label: "Transcribing...", color: "bg-yellow-100 text-yellow-700" },
  transcribed: { label: "Transcribed", color: "bg-blue-100 text-blue-700" },
  generating_prompt: { label: "Generating...", color: "bg-yellow-100 text-yellow-700" },
  prompt_generated: { label: "Prompt Ready", color: "bg-green-100 text-green-700" },
  running_claude: { label: "Running Claude...", color: "bg-purple-100 text-purple-700" },
  claude_completed: { label: "Complete", color: "bg-emerald-100 text-emerald-700" },
  error: { label: "Error", color: "bg-red-100 text-red-700" },
};

export default function StatusBadge({ status }: { status: NoteStatus }) {
  const config = statusConfig[status] || statusConfig.uploaded;
  const isAnimating = ["transcribing", "generating_prompt", "running_claude"].includes(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}
    >
      {isAnimating && (
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-record" />
      )}
      {config.label}
    </span>
  );
}
