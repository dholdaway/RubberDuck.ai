import Anthropic from "@anthropic-ai/sdk";

export interface ClaudeExecutionResult {
  responseText: string;
  model: string;
}

export class ClaudeService {
  private _client: Anthropic | null = null;
  private model: string = "claude-sonnet-4-20250514";

  private get client(): Anthropic {
    if (!this._client) {
      this._client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    return this._client;
  }

  async execute(prompt: string): Promise<ClaudeExecutionResult> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const textBlocks = response.content.filter((block) => block.type === "text");
    const responseText = textBlocks.map((block) => block.text).join("\n\n");

    if (!responseText) {
      throw new Error("Claude returned empty response");
    }

    return {
      responseText,
      model: this.model,
    };
  }

  getModel(): string {
    return this.model;
  }
}

export const claudeService = new ClaudeService();
