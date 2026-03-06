import OpenAI from "openai";
import type { PromptGenerationOutput } from "@/types";

const SYSTEM_PROMPT = `You are a senior technical prompt architect. Your job is to transform a raw voice transcript from a developer into a structured, high-quality technical specification and an implementation-ready coding prompt for Claude.

RULES:
- Preserve the user's original intent faithfully
- Convert vague spoken language into clear engineering language
- Do NOT invent requirements — if you must assume something, mark it explicitly under "assumptions"
- Prefer modular, maintainable, production-minded code patterns
- Include testing and setup instructions in the final Claude prompt
- Keep the final Claude prompt high-signal and implementation-ready — no bloat
- The Claude prompt should be self-contained: another AI should be able to implement from it alone

OUTPUT FORMAT:
Return a single JSON object with exactly these fields:

{
  "title": "Short descriptive title for this task",
  "cleanedTranscript": "The transcript cleaned up for grammar, filler words removed, but meaning preserved",
  "engineeringSummary": "2-3 sentence summary of what the developer wants to build",
  "detectedIntent": "The core intent in one sentence",
  "detectedTaskType": "e.g. new feature, bug fix, refactor, integration, full app, API, etc.",
  "businessGoal": "What business outcome this serves",
  "developerGoal": "What the developer specifically wants implemented",
  "techStack": ["array of technologies mentioned or implied"],
  "functionalRequirements": ["array of specific functional requirements"],
  "nonFunctionalRequirements": ["array of non-functional requirements like performance, security, etc."],
  "assumptions": ["array of assumptions you made — be explicit"],
  "risks": ["array of risks or ambiguities detected"],
  "edgeCases": ["array of edge cases to consider"],
  "acceptanceCriteria": ["array of acceptance criteria"],
  "deliverables": ["array of expected deliverables"],
  "finalClaudePrompt": "The complete, self-contained implementation prompt for Claude. This should be detailed enough for Claude to produce working code. Include: what to build, tech stack, architecture guidance, key requirements, constraints, testing expectations, and setup instructions. Write it as a direct instruction to an AI coding assistant."
}

IMPORTANT: Return ONLY valid JSON. No markdown fences, no explanation outside the JSON.`;

export class OpenAIPromptService {
  private _client: OpenAI | null = null;
  private model: string = "gpt-4o";

  private get client(): OpenAI {
    if (!this._client) {
      this._client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return this._client;
  }

  async generatePromptArtifact(transcript: string): Promise<PromptGenerationOutput> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Here is the raw voice transcript from a developer. Transform it into a structured technical specification and Claude-ready implementation prompt.\n\nTRANSCRIPT:\n${transcript}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned empty response");
    }

    const parsed = JSON.parse(content) as PromptGenerationOutput;

    // Validate required fields
    if (!parsed.finalClaudePrompt) {
      throw new Error("OpenAI response missing finalClaudePrompt");
    }
    if (!parsed.cleanedTranscript) {
      throw new Error("OpenAI response missing cleanedTranscript");
    }

    return parsed;
  }

  getModel(): string {
    return this.model;
  }
}

export const openaiService = new OpenAIPromptService();
