"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AudioRecorder from "@/components/AudioRecorder";
import AudioUploader from "@/components/AudioUploader";
import NoteCard from "@/components/NoteCard";
import type { AudioNoteListItem, AudioNoteDetail, ApiResponse } from "@/types";

export default function Dashboard() {
  const router = useRouter();
  const [notes, setNotes] = useState<AudioNoteListItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/audio-notes");
      const json: ApiResponse<AudioNoteListItem[]> = await res.json();
      if (json.success && json.data) {
        setNotes(json.data);
      }
    } catch {
      console.error("Failed to fetch notes");
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const uploadAudio = async (blob: Blob | File, fileName: string) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("audio", blob, fileName);

      const res = await fetch("/api/audio-notes", { method: "POST", body: formData });
      const json: ApiResponse<AudioNoteDetail> = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Upload failed");
      }

      router.push(`/notes/${json.data!.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRecordingComplete = (blob: Blob, fileName: string) => {
    uploadAudio(blob, fileName);
  };

  const handleFileSelected = (file: File) => {
    uploadAudio(file, file.name);
  };

  return (
    <div className="space-y-8">
      {/* Hero / Input Section */}
      <div className="card">
        <h1 className="text-2xl font-bold text-gray-900">Voice to Code</h1>
        <p className="mt-1 text-sm text-gray-500">
          Record or upload an audio note to generate a structured coding prompt.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <AudioRecorder onRecordingComplete={handleRecordingComplete} disabled={uploading} />
          <div className="text-sm text-gray-400">or</div>
          <AudioUploader onFileSelected={handleFileSelected} disabled={uploading} />
        </div>
        {uploading && (
          <p className="mt-4 text-sm text-brand-600">Uploading audio...</p>
        )}
        {error && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}
      </div>

      {/* Recent Notes */}
      <div>
        <h2 className="section-title mb-4">Recent Notes</h2>
        {notes.length === 0 ? (
          <p className="text-sm text-gray-500">
            No notes yet. Record or upload audio to get started.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notes.slice(0, 9).map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
