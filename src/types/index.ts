export type NoteStatus =
  | "uploaded"
  | "transcribing"
  | "transcribed"
  | "generating_prompt"
  | "prompt_generated"
  | "running_claude"
  | "claude_completed"
  | "error";

export interface AudioNoteListItem {
  id: string;
  title: string;
  originalFileName: string | null;
  mimeType: string;
  durationSeconds: number | null;
  status: NoteStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AudioNoteDetail {
  id: string;
  title: string;
  originalFileName: string | null;
  audioPath: string;
  audioUrl: string;
  mimeType: string;
  durationSeconds: number | null;
  status: NoteStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  transcript: TranscriptData | null;
  promptArtifact: PromptArtifactData | null;
  claudeRuns: ClaudeRunData[];
}

export interface TranscriptData {
  id: string;
  rawText: string;
  cleanedText: string | null;
  transcriptionProvider: string;
  language: string | null;
  createdAt: string;
}

export interface PromptArtifactData {
  id: string;
  engineeringSummary: string | null;
  detectedIntent: string | null;
  techStack: string[] | null;
  functionalRequirements: string[] | null;
  nonFunctionalRequirements: string[] | null;
  assumptions: string[] | null;
  risks: string[] | null;
  acceptanceCriteria: string[] | null;
  finalClaudePrompt: string;
  openaiModel: string;
  createdAt: string;
}

export interface ClaudeRunData {
  id: string;
  requestPrompt: string;
  responseText: string | null;
  anthropicModel: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}

// OpenAI structured output from prompt generation
export interface PromptGenerationOutput {
  title: string;
  cleanedTranscript: string;
  engineeringSummary: string;
  detectedIntent: string;
  detectedTaskType: string;
  businessGoal: string;
  developerGoal: string;
  techStack: string[];
  functionalRequirements: string[];
  nonFunctionalRequirements: string[];
  assumptions: string[];
  risks: string[];
  edgeCases: string[];
  acceptanceCriteria: string[];
  deliverables: string[];
  finalClaudePrompt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
