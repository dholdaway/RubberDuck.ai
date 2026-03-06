import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { generateFileName } from "@/lib/utils";
import { transcriptionService } from "./transcription.service";
import { openaiService } from "./openai.service";
import { claudeService } from "./claude.service";
import type { AudioNoteDetail, AudioNoteListItem } from "@/types";

function noteToListItem(note: {
  id: string;
  title: string;
  originalFileName: string | null;
  mimeType: string;
  durationSeconds: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): AudioNoteListItem {
  return {
    ...note,
    status: note.status as AudioNoteListItem["status"],
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function noteToDetail(note: any): AudioNoteDetail | null {
  if (!note) return null;

  return {
    id: note.id,
    title: note.title,
    originalFileName: note.originalFileName,
    audioPath: note.audioPath,
    audioUrl: storage.getUrl(note.audioPath),
    mimeType: note.mimeType,
    durationSeconds: note.durationSeconds,
    status: note.status as AudioNoteDetail["status"],
    errorMessage: note.errorMessage,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    transcript: note.transcript
      ? {
          id: note.transcript.id,
          rawText: note.transcript.rawText,
          cleanedText: note.transcript.cleanedText,
          transcriptionProvider: note.transcript.transcriptionProvider,
          language: note.transcript.language,
          createdAt: note.transcript.createdAt.toISOString(),
        }
      : null,
    promptArtifact: note.promptArtifact
      ? {
          id: note.promptArtifact.id,
          engineeringSummary: note.promptArtifact.engineeringSummary,
          detectedIntent: note.promptArtifact.detectedIntent,
          techStack: note.promptArtifact.techStack as string[] | null,
          functionalRequirements: note.promptArtifact.functionalRequirements as string[] | null,
          nonFunctionalRequirements: note.promptArtifact.nonFunctionalRequirements as string[] | null,
          assumptions: note.promptArtifact.assumptions as string[] | null,
          risks: note.promptArtifact.risks as string[] | null,
          acceptanceCriteria: note.promptArtifact.acceptanceCriteria as string[] | null,
          finalClaudePrompt: note.promptArtifact.finalClaudePrompt,
          openaiModel: note.promptArtifact.openaiModel,
          createdAt: note.promptArtifact.createdAt.toISOString(),
        }
      : null,
    claudeRuns: (note.claudeRuns || []).map((run: any) => ({
      id: run.id,
      requestPrompt: run.requestPrompt,
      responseText: run.responseText,
      anthropicModel: run.anthropicModel,
      status: run.status,
      errorMessage: run.errorMessage,
      createdAt: run.createdAt.toISOString(),
    })),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export class NoteService {
  async createNote(
    fileData: Buffer,
    originalFileName: string,
    mimeType: string,
    title?: string
  ): Promise<AudioNoteDetail> {
    const fileName = generateFileName(originalFileName);
    const audioPath = await storage.save(fileName, fileData);

    const note = await prisma.audioNote.create({
      data: {
        title: title || originalFileName.replace(/\.[^/.]+$/, "") || "Untitled Note",
        originalFileName,
        audioPath,
        mimeType,
        status: "uploaded",
      },
      include: { transcript: true, promptArtifact: true, claudeRuns: true },
    });

    return noteToDetail(note)!;
  }

  async listNotes(search?: string): Promise<AudioNoteListItem[]> {
    const notes = await prisma.audioNote.findMany({
      where: search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { originalFileName: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { createdAt: "desc" },
    });

    return notes.map(noteToListItem);
  }

  async getNote(id: string): Promise<AudioNoteDetail | null> {
    const note = await prisma.audioNote.findUnique({
      where: { id },
      include: {
        transcript: true,
        promptArtifact: true,
        claudeRuns: { orderBy: { createdAt: "desc" } },
      },
    });

    return noteToDetail(note);
  }

  async transcribe(id: string): Promise<AudioNoteDetail> {
    const note = await prisma.audioNote.findUnique({ where: { id } });
    if (!note) throw new Error("Note not found");

    await prisma.audioNote.update({
      where: { id },
      data: { status: "transcribing" },
    });

    try {
      const result = await transcriptionService.transcribe(note.audioPath, note.mimeType);

      // Delete existing transcript if regenerating
      await prisma.transcript.deleteMany({ where: { audioNoteId: id } });

      await prisma.transcript.create({
        data: {
          audioNoteId: id,
          rawText: result.text,
          transcriptionProvider: result.provider,
          language: result.language,
        },
      });

      await prisma.audioNote.update({
        where: { id },
        data: { status: "transcribed", errorMessage: null },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Transcription failed";
      await prisma.audioNote.update({
        where: { id },
        data: { status: "error", errorMessage: message },
      });
      throw error;
    }

    return (await this.getNote(id))!;
  }

  async generatePrompt(id: string): Promise<AudioNoteDetail> {
    const note = await prisma.audioNote.findUnique({
      where: { id },
      include: { transcript: true },
    });
    if (!note) throw new Error("Note not found");
    if (!note.transcript) throw new Error("No transcript found — transcribe first");

    await prisma.audioNote.update({
      where: { id },
      data: { status: "generating_prompt" },
    });

    try {
      const result = await openaiService.generatePromptArtifact(note.transcript.rawText);

      // Update transcript with cleaned text
      await prisma.transcript.update({
        where: { id: note.transcript.id },
        data: { cleanedText: result.cleanedTranscript },
      });

      // Update note title from AI output
      await prisma.audioNote.update({
        where: { id },
        data: { title: result.title },
      });

      // Delete existing artifact if regenerating
      await prisma.promptArtifact.deleteMany({ where: { audioNoteId: id } });

      await prisma.promptArtifact.create({
        data: {
          audioNoteId: id,
          engineeringSummary: result.engineeringSummary,
          detectedIntent: result.detectedIntent,
          techStack: result.techStack,
          functionalRequirements: result.functionalRequirements,
          nonFunctionalRequirements: result.nonFunctionalRequirements,
          assumptions: result.assumptions,
          risks: result.risks,
          acceptanceCriteria: result.acceptanceCriteria,
          finalClaudePrompt: result.finalClaudePrompt,
          openaiModel: openaiService.getModel(),
        },
      });

      await prisma.audioNote.update({
        where: { id },
        data: { status: "prompt_generated", errorMessage: null },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Prompt generation failed";
      await prisma.audioNote.update({
        where: { id },
        data: { status: "error", errorMessage: message },
      });
      throw error;
    }

    return (await this.getNote(id))!;
  }

  async runClaude(id: string): Promise<AudioNoteDetail> {
    const note = await prisma.audioNote.findUnique({
      where: { id },
      include: { promptArtifact: true },
    });
    if (!note) throw new Error("Note not found");
    if (!note.promptArtifact) throw new Error("No prompt artifact — generate prompt first");

    await prisma.audioNote.update({
      where: { id },
      data: { status: "running_claude" },
    });

    const run = await prisma.claudeRun.create({
      data: {
        audioNoteId: id,
        promptArtifactId: note.promptArtifact.id,
        requestPrompt: note.promptArtifact.finalClaudePrompt,
        anthropicModel: claudeService.getModel(),
        status: "running",
      },
    });

    try {
      const result = await claudeService.execute(note.promptArtifact.finalClaudePrompt);

      await prisma.claudeRun.update({
        where: { id: run.id },
        data: {
          responseText: result.responseText,
          anthropicModel: result.model,
          status: "completed",
        },
      });

      await prisma.audioNote.update({
        where: { id },
        data: { status: "claude_completed", errorMessage: null },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Claude execution failed";
      await prisma.claudeRun.update({
        where: { id: run.id },
        data: { status: "failed", errorMessage: message },
      });
      await prisma.audioNote.update({
        where: { id },
        data: { status: "error", errorMessage: message },
      });
      throw error;
    }

    return (await this.getNote(id))!;
  }

  async deleteNote(id: string): Promise<void> {
    const note = await prisma.audioNote.findUnique({ where: { id } });
    if (!note) throw new Error("Note not found");

    await storage.delete(note.audioPath);
    await prisma.audioNote.delete({ where: { id } });
  }
}

export const noteService = new NoteService();
