import OpenAI from "openai";
import { storage } from "@/lib/storage";

export interface TranscriptionResult {
  text: string;
  language: string | null;
  provider: string;
}

export interface TranscriptionProvider {
  transcribe(audioPath: string, mimeType: string): Promise<TranscriptionResult>;
}

class OpenAIWhisperProvider implements TranscriptionProvider {
  private _client: OpenAI | null = null;

  private get client(): OpenAI {
    if (!this._client) {
      this._client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return this._client;
  }

  async transcribe(audioPath: string, mimeType: string): Promise<TranscriptionResult> {
    const audioBuffer = await storage.read(audioPath);
    const ext = audioPath.split(".").pop() || "webm";

    const file = new File([new Uint8Array(audioBuffer)], `audio.${ext}`, { type: mimeType });

    const response = await this.client.audio.transcriptions.create({
      model: "whisper-1",
      file,
      response_format: "verbose_json",
    });

    return {
      text: response.text,
      language: response.language ?? null,
      provider: "openai-whisper",
    };
  }
}

// Factory for swapping transcription providers
export function createTranscriptionProvider(): TranscriptionProvider {
  return new OpenAIWhisperProvider();
}

export const transcriptionService = createTranscriptionProvider();
