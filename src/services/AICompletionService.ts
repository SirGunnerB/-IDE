import { OpenAI } from 'openai';

export class AICompletionService {
  private openai: OpenAI;
  private context: string[] = [];

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async getCompletion(prompt: string, language: string) {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: `You are a code completion assistant for ${language}.` },
          ...this.context.map(ctx => ({ role: "user" as const, content: ctx })),
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 150
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('AI completion error:', error);
      return null;
    }
  }

  updateContext(code: string) {
    this.context.push(code);
    if (this.context.length > 5) {
      this.context.shift();
    }
  }
} 