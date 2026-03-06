"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import CopyButton from "@/components/CopyButton";
import { formatDate } from "@/lib/utils";
import type { AudioNoteDetail, ApiResponse, NoteStatus } from "@/types";

// ---------------------------------------------------------------------------
// Pipeline step definitions
// ---------------------------------------------------------------------------
const PIPELINE_STEPS: {
  key: string;
  label: string;
  activeStates: NoteStatus[];
  doneStates: NoteStatus[];
}[] = [
  {
    key: "upload",
    label: "Uploaded",
    activeStates: ["uploaded"],
    doneStates: [
      "transcribing",
      "transcribed",
      "generating_prompt",
      "prompt_generated",
      "running_claude",
      "claude_completed",
    ],
  },
  {
    key: "transcribe",
    label: "Transcribed",
    activeStates: ["transcribing"],
    doneStates: [
      "transcribed",
      "generating_prompt",
      "prompt_generated",
      "running_claude",
      "claude_completed",
    ],
  },
  {
    key: "prompt",
    label: "Prompt Ready",
    activeStates: ["generating_prompt"],
    doneStates: ["prompt_generated", "running_claude", "claude_completed"],
  },
  {
    key: "claude",
    label: "Code Generated",
    activeStates: ["running_claude"],
    doneStates: ["claude_completed"],
  },
];

function stepStatus(
  step: (typeof PIPELINE_STEPS)[number],
  noteStatus: NoteStatus
): "done" | "active" | "pending" | "error" {
  if (noteStatus === "error") {
    // Mark the last non-done step as error
    if (step.activeStates.includes("error" as NoteStatus)) return "error";
    if (step.doneStates.includes(noteStatus)) return "done";
    // Find the earliest pending step and mark it as error
    return "error";
  }
  if (step.doneStates.includes(noteStatus)) return "done";
  if (step.activeStates.includes(noteStatus)) return "active";
  return "pending";
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function NoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [note, setNote] = useState<AudioNoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Editable prompt state
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState("");
  const [promptSaving, setPromptSaving] = useState(false);

  const fetchNote = useCallback(async () => {
    try {
      const res = await fetch(`/api/audio-notes/${id}`);
      const json: ApiResponse<AudioNoteDetail> = await res.json();
      if (json.success && json.data) {
        setNote(json.data);
      } else {
        setError(json.error || "Note not found");
      }
    } catch {
      setError("Failed to load note");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  // Sync edited prompt when note loads or prompt artifact changes
  useEffect(() => {
    if (note?.promptArtifact) {
      setEditedPrompt(note.promptArtifact.finalClaudePrompt);
    }
  }, [note?.promptArtifact]);

  const runAction = async (
    action: string,
    endpoint: string,
    options?: RequestInit
  ) => {
    setActionLoading(action);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "POST", ...options });
      const json: ApiResponse<AudioNoteDetail> = await res.json();
      if (json.success && json.data) {
        setNote(json.data);
      } else {
        setError(json.error || `${action} failed`);
        await fetchNote();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `${action} failed`);
      await fetchNote();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this note and all associated data?")) return;
    try {
      await fetch(`/api/audio-notes/${id}`, { method: "DELETE" });
      router.push("/");
    } catch {
      setError("Failed to delete note");
    }
  };

  const savePrompt = async () => {
    setPromptSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/audio-notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: editedPrompt }),
      });
      const json: ApiResponse<AudioNoteDetail> = await res.json();
      if (json.success && json.data) {
        setNote(json.data);
        setEditingPrompt(false);
      } else {
        setError(json.error || "Failed to save prompt");
      }
    } catch {
      setError("Failed to save prompt");
    } finally {
      setPromptSaving(false);
    }
  };

  const exportJSON = () => {
    if (!note?.promptArtifact) return;
    downloadFile(
      JSON.stringify(note.promptArtifact, null, 2),
      `${slugify(note.title)}-spec.json`,
      "application/json"
    );
  };

  const exportMarkdown = () => {
    if (!note?.promptArtifact) return;
    const md = buildMarkdownSpec(note);
    downloadFile(md, `${slugify(note.title)}-spec.md`, "text/markdown");
  };

  // Determine which retry action to show on error
  const retryAction = (() => {
    if (note?.status !== "error") return null;
    if (note.promptArtifact) return { label: "Retry Claude", action: "Run Claude", endpoint: `/api/audio-notes/${id}/run-claude` };
    if (note.transcript) return { label: "Retry Prompt Generation", action: "Generate Prompt", endpoint: `/api/audio-notes/${id}/generate-prompt` };
    return { label: "Retry Transcription", action: "Transcribe", endpoint: `/api/audio-notes/${id}/transcribe` };
  })();

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-gray-500"><Spinner /> Loading...</div>;
  }

  if (!note) {
    return <p className="text-sm text-red-600">{error || "Note not found"}</p>;
  }

  const canTranscribe =
    ["uploaded", "error"].includes(note.status) || note.status === "transcribed";
  const canGenerate =
    note.transcript &&
    ["transcribed", "prompt_generated", "claude_completed", "error"].includes(
      note.status
    );
  const canRunClaude =
    note.promptArtifact &&
    ["prompt_generated", "claude_completed", "error"].includes(note.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="mb-2 text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{note.title}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
            <span>{formatDate(note.createdAt)}</span>
            <StatusBadge status={note.status} />
          </div>
        </div>
        <button onClick={handleDelete} className="btn-danger self-start text-xs">
          Delete
        </button>
      </div>

      {/* Error + Retry */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between gap-4">
          <span>{error}</span>
          {retryAction && (
            <button
              onClick={() => runAction(retryAction.action, retryAction.endpoint)}
              disabled={actionLoading !== null}
              className="btn-secondary text-xs whitespace-nowrap"
            >
              {actionLoading === retryAction.action ? "Retrying..." : retryAction.label}
            </button>
          )}
        </div>
      )}
      {note.status === "error" && note.errorMessage && !error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between gap-4">
          <span>{note.errorMessage}</span>
          {retryAction && (
            <button
              onClick={() => runAction(retryAction.action, retryAction.endpoint)}
              disabled={actionLoading !== null}
              className="btn-secondary text-xs whitespace-nowrap"
            >
              {actionLoading === retryAction.action ? "Retrying..." : retryAction.label}
            </button>
          )}
        </div>
      )}

      {/* Visual Pipeline Tracker */}
      <div className="card">
        <h2 className="section-title mb-4">Pipeline</h2>
        <div className="flex items-center gap-0">
          {PIPELINE_STEPS.map((step, i) => {
            const s = stepStatus(step, note.status);
            return (
              <div key={step.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                      s === "done"
                        ? "bg-green-500 text-white"
                        : s === "active"
                          ? "bg-brand-600 text-white animate-pulse-record"
                          : s === "error"
                            ? "bg-red-500 text-white"
                            : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {s === "done" ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : s === "error" ? (
                      "!"
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-medium whitespace-nowrap ${
                      s === "done"
                        ? "text-green-600"
                        : s === "active"
                          ? "text-brand-600"
                          : s === "error"
                            ? "text-red-600"
                            : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 mt-[-16px] ${
                      s === "done" ? "bg-green-400" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="mt-5 flex flex-wrap gap-3 border-t border-gray-100 pt-4">
          <button
            onClick={() =>
              runAction("Transcribe", `/api/audio-notes/${id}/transcribe`)
            }
            disabled={!canTranscribe || actionLoading !== null}
            className="btn-primary"
          >
            {actionLoading === "Transcribe" ? (
              <><Spinner /> Transcribing...</>
            ) : note.transcript ? (
              "Re-transcribe"
            ) : (
              "Transcribe"
            )}
          </button>
          <button
            onClick={() =>
              runAction(
                "Generate Prompt",
                `/api/audio-notes/${id}/generate-prompt`
              )
            }
            disabled={!canGenerate || actionLoading !== null}
            className="btn-primary"
          >
            {actionLoading === "Generate Prompt" ? (
              <><Spinner /> Generating...</>
            ) : note.promptArtifact ? (
              "Regenerate Prompt"
            ) : (
              "Generate Prompt"
            )}
          </button>
          <button
            onClick={() =>
              runAction("Run Claude", `/api/audio-notes/${id}/run-claude`)
            }
            disabled={!canRunClaude || actionLoading !== null}
            className="btn-primary bg-purple-600 hover:bg-purple-700 focus:ring-purple-500"
          >
            {actionLoading === "Run Claude" ? (
              <><Spinner /> Running...</>
            ) : (
              "Run in Claude"
            )}
          </button>
        </div>
      </div>

      {/* Audio Player */}
      <div className="card">
        <h2 className="section-title mb-3">Audio</h2>
        <audio controls className="w-full" src={note.audioUrl}>
          Your browser does not support audio playback.
        </audio>
        {note.originalFileName && (
          <p className="mt-2 text-xs text-gray-500">{note.originalFileName}</p>
        )}
      </div>

      {/* Raw Transcript */}
      {note.transcript && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">Raw Transcript</h2>
            <CopyButton text={note.transcript.rawText} />
          </div>
          <p className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
            {note.transcript.rawText}
          </p>
          <div className="mt-3 flex gap-3 text-xs text-gray-400">
            <span>Provider: {note.transcript.transcriptionProvider}</span>
            {note.transcript.language && (
              <span>Language: {note.transcript.language}</span>
            )}
          </div>
        </div>
      )}

      {/* Cleaned Transcript */}
      {note.transcript?.cleanedText && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">Cleaned Transcript</h2>
            <CopyButton text={note.transcript.cleanedText} />
          </div>
          <p className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
            {note.transcript.cleanedText}
          </p>
        </div>
      )}

      {/* Prompt Artifact */}
      {note.promptArtifact && (
        <>
          {/* Summary */}
          <div className="card">
            <h2 className="section-title mb-3">Engineering Summary</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              {note.promptArtifact.engineeringSummary}
            </p>
            {note.promptArtifact.detectedIntent && (
              <p className="mt-2 text-sm">
                <span className="font-medium text-gray-600">Intent: </span>
                <span className="text-gray-700">
                  {note.promptArtifact.detectedIntent}
                </span>
              </p>
            )}
          </div>

          {/* Structured Spec */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">Technical Specification</h2>
              <div className="flex gap-2">
                <button onClick={exportMarkdown} className="btn-secondary text-xs">
                  Export MD
                </button>
                <button onClick={exportJSON} className="btn-secondary text-xs">
                  Export JSON
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <SpecSection title="Tech Stack" items={note.promptArtifact.techStack} />
              <SpecSection
                title="Functional Requirements"
                items={note.promptArtifact.functionalRequirements}
              />
              <SpecSection
                title="Non-Functional Requirements"
                items={note.promptArtifact.nonFunctionalRequirements}
              />
              <SpecSection title="Assumptions" items={note.promptArtifact.assumptions} />
              <SpecSection
                title="Risks & Ambiguities"
                items={note.promptArtifact.risks}
              />
              <SpecSection
                title="Acceptance Criteria"
                items={note.promptArtifact.acceptanceCriteria}
              />
            </div>
            <p className="mt-3 text-xs text-gray-400">
              Model: {note.promptArtifact.openaiModel}
            </p>
          </div>

          {/* Claude Prompt — editable */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title">Claude Prompt</h2>
              <div className="flex gap-2">
                {!editingPrompt ? (
                  <>
                    <button
                      onClick={() => setEditingPrompt(true)}
                      className="btn-secondary text-xs"
                    >
                      Edit
                    </button>
                    <CopyButton
                      text={note.promptArtifact.finalClaudePrompt}
                      label="Copy"
                    />
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditedPrompt(note.promptArtifact!.finalClaudePrompt);
                        setEditingPrompt(false);
                      }}
                      className="btn-secondary text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={savePrompt}
                      disabled={promptSaving}
                      className="btn-primary text-xs"
                    >
                      {promptSaving ? "Saving..." : "Save"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {editingPrompt ? (
              <textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                rows={20}
                className="w-full rounded-lg border border-gray-300 bg-white p-4 text-sm font-mono text-gray-800 leading-relaxed focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            ) : (
              <pre className="max-h-96 overflow-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100 leading-relaxed whitespace-pre-wrap">
                {note.promptArtifact.finalClaudePrompt}
              </pre>
            )}
          </div>
        </>
      )}

      {/* Claude Output */}
      {note.claudeRuns.length > 0 && (
        <div className="card">
          <h2 className="section-title mb-4">Claude Output</h2>
          <div className="space-y-4">
            {note.claudeRuns.map((run) => (
              <div key={run.id} className="rounded-lg border border-gray-200 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        run.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : run.status === "running"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {run.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      {run.anthropicModel}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(run.createdAt)}
                    </span>
                  </div>
                  {run.responseText && (
                    <CopyButton text={run.responseText} label="Copy Output" />
                  )}
                </div>
                {run.errorMessage && (
                  <p className="mb-2 text-sm text-red-600">{run.errorMessage}</p>
                )}
                {run.responseText && (
                  <pre className="max-h-[600px] overflow-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100 leading-relaxed whitespace-pre-wrap">
                    {run.responseText}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function SpecSection({
  title,
  items,
}: {
  title: string;
  items: string[] | null;
}) {
  if (!items || items.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <ul className="list-disc pl-5 space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-gray-700">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function slugify(text: string): string {
  return text.replace(/\s+/g, "-").toLowerCase();
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildMarkdownSpec(note: AudioNoteDetail): string {
  const a = note.promptArtifact;
  if (!a) return "";

  const lines: string[] = [];
  lines.push(`# ${note.title}\n`);
  lines.push(`_Generated ${formatDate(note.createdAt)} | Model: ${a.openaiModel}_\n`);

  if (a.engineeringSummary) {
    lines.push(`## Summary\n`);
    lines.push(`${a.engineeringSummary}\n`);
  }
  if (a.detectedIntent) {
    lines.push(`**Intent:** ${a.detectedIntent}\n`);
  }

  const addList = (title: string, items: string[] | null) => {
    if (!items || items.length === 0) return;
    lines.push(`## ${title}\n`);
    items.forEach((item) => lines.push(`- ${item}`));
    lines.push("");
  };

  addList("Tech Stack", a.techStack);
  addList("Functional Requirements", a.functionalRequirements);
  addList("Non-Functional Requirements", a.nonFunctionalRequirements);
  addList("Assumptions", a.assumptions);
  addList("Risks & Ambiguities", a.risks);
  addList("Acceptance Criteria", a.acceptanceCriteria);

  lines.push(`## Claude Prompt\n`);
  lines.push("```");
  lines.push(a.finalClaudePrompt);
  lines.push("```\n");

  return lines.join("\n");
}
