"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import CopyButton from "@/components/CopyButton";
import { formatDate } from "@/lib/utils";
import type { AudioNoteDetail, ApiResponse } from "@/types";

export default function NoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [note, setNote] = useState<AudioNoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const runAction = async (action: string, endpoint: string) => {
    setActionLoading(action);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const json: ApiResponse<AudioNoteDetail> = await res.json();
      if (json.success && json.data) {
        setNote(json.data);
      } else {
        setError(json.error || `${action} failed`);
        // Reload note to get current state
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

  const exportJSON = () => {
    if (!note?.promptArtifact) return;
    const blob = new Blob([JSON.stringify(note.promptArtifact, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${note.title.replace(/\s+/g, "-").toLowerCase()}-spec.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }

  if (!note) {
    return <p className="text-sm text-red-600">{error || "Note not found"}</p>;
  }

  const canTranscribe = ["uploaded", "error"].includes(note.status) || note.status === "transcribed";
  const canGenerate =
    note.transcript && ["transcribed", "prompt_generated", "claude_completed", "error"].includes(note.status);
  const canRunClaude =
    note.promptArtifact && ["prompt_generated", "claude_completed", "error"].includes(note.status);

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

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Pipeline Actions */}
      <div className="card">
        <h2 className="section-title mb-4">Pipeline</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => runAction("Transcribe", `/api/audio-notes/${id}/transcribe`)}
            disabled={!canTranscribe || actionLoading !== null}
            className="btn-primary"
          >
            {actionLoading === "Transcribe" ? "Transcribing..." : "Transcribe"}
          </button>
          <button
            onClick={() => runAction("Generate Prompt", `/api/audio-notes/${id}/generate-prompt`)}
            disabled={!canGenerate || actionLoading !== null}
            className="btn-primary"
          >
            {actionLoading === "Generate Prompt" ? "Generating..." : "Generate Prompt"}
          </button>
          <button
            onClick={() => runAction("Run Claude", `/api/audio-notes/${id}/run-claude`)}
            disabled={!canRunClaude || actionLoading !== null}
            className="btn-primary bg-purple-600 hover:bg-purple-700 focus:ring-purple-500"
          >
            {actionLoading === "Run Claude" ? "Running..." : "Run in Claude"}
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
            {note.transcript.language && <span>Language: {note.transcript.language}</span>}
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
                <span className="text-gray-700">{note.promptArtifact.detectedIntent}</span>
              </p>
            )}
          </div>

          {/* Structured Spec */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title">Technical Specification</h2>
              <button onClick={exportJSON} className="btn-secondary text-xs">
                Export JSON
              </button>
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
              <SpecSection title="Risks & Ambiguities" items={note.promptArtifact.risks} />
              <SpecSection
                title="Acceptance Criteria"
                items={note.promptArtifact.acceptanceCriteria}
              />
            </div>
            <p className="mt-3 text-xs text-gray-400">
              Model: {note.promptArtifact.openaiModel}
            </p>
          </div>

          {/* Claude Prompt */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title">Claude Prompt</h2>
              <div className="flex gap-2">
                <CopyButton text={note.promptArtifact.finalClaudePrompt} label="Copy Prompt" />
              </div>
            </div>
            <pre className="max-h-96 overflow-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100 leading-relaxed whitespace-pre-wrap">
              {note.promptArtifact.finalClaudePrompt}
            </pre>
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
                    <span className="text-xs text-gray-400">{run.anthropicModel}</span>
                    <span className="text-xs text-gray-400">{formatDate(run.createdAt)}</span>
                  </div>
                  {run.responseText && <CopyButton text={run.responseText} label="Copy Output" />}
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
