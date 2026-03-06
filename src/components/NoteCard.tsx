"use client";

import Link from "next/link";
import StatusBadge from "./StatusBadge";
import { formatDate, truncate } from "@/lib/utils";
import type { AudioNoteListItem } from "@/types";

export default function NoteCard({ note }: { note: AudioNoteListItem }) {
  return (
    <Link href={`/notes/${note.id}`}>
      <div className="card hover:border-brand-300 hover:shadow-md transition-all cursor-pointer">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-gray-900 truncate">{note.title}</h3>
            {note.originalFileName && (
              <p className="mt-1 text-xs text-gray-500">{truncate(note.originalFileName, 40)}</p>
            )}
          </div>
          <StatusBadge status={note.status} />
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
          <span>{formatDate(note.createdAt)}</span>
          {note.durationSeconds && (
            <span>
              {Math.floor(note.durationSeconds / 60)}:{Math.floor(note.durationSeconds % 60).toString().padStart(2, "0")}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
