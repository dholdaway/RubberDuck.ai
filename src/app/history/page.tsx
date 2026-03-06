"use client";

import { useState, useEffect, useCallback } from "react";
import NoteCard from "@/components/NoteCard";
import type { AudioNoteListItem, ApiResponse, NoteStatus } from "@/types";

const STATUS_OPTIONS: { label: string; value: NoteStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Uploaded", value: "uploaded" },
  { label: "Transcribed", value: "transcribed" },
  { label: "Prompt Ready", value: "prompt_generated" },
  { label: "Complete", value: "claude_completed" },
  { label: "Error", value: "error" },
];

export default function HistoryPage() {
  const [notes, setNotes] = useState<AudioNoteListItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<NoteStatus | "all">("all");
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/audio-notes?${params}`);
      const json: ApiResponse<AudioNoteListItem[]> = await res.json();
      if (json.success && json.data) {
        setNotes(json.data);
      }
    } catch {
      console.error("Failed to fetch notes");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const debounce = setTimeout(fetchNotes, 300);
    return () => clearTimeout(debounce);
  }, [fetchNotes]);

  const filtered =
    statusFilter === "all"
      ? notes
      : notes.filter((n) => n.status === statusFilter);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">History</h1>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500">No notes found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}
