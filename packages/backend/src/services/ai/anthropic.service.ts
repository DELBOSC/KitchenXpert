import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../../database/client';
import logger from '../../utils/logger';

export class AnthropicService {
  private _client: Anthropic;
  private static instance: AnthropicService;

  private constructor() {
    this._client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 120_000, // 2 minute timeout
    });
  }

  /** Expose the raw Anthropic SDK client for advanced usage (e.g. streaming with tools) */
  get client(): Anthropic {
    return this._client;
  }

  static getInstance(): AnthropicService {
    if (!AnthropicService.instance) {
      AnthropicService.instance = new AnthropicService();
    }
    return AnthropicService.instance;
  }

  /**
   * Non-streaming text generation
   */
  async generateText(options: {
    system?: string;
    messages: Anthropic.Messages.MessageParam[];
    maxTokens?: number;
    model?: string;
  }): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
    const maxTokens = Math.min(options.maxTokens || 4096, 16384);

    const response = await this._client.messages.create({
      model: options.model || 'claude-sonnet-4-5-20250929',
      max_tokens: maxTokens,
      system: options.system,
      messages: options.messages,
    });

    const text = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }

  /**
   * Streaming text generation for SSE
   */
  async *streamText(options: {
    system?: string;
    messages: Anthropic.Messages.MessageParam[];
    maxTokens?: number;
    model?: string;
  }): AsyncGenerator<
    | { type: 'text_delta'; text: string }
    | { type: 'message_stop'; inputTokens: number; outputTokens: number }
  > {
    const maxTokens = Math.min(options.maxTokens || 4096, 16384);

    const stream = this._client.messages.stream({
      model: options.model || 'claude-sonnet-4-5-20250929',
      max_tokens: maxTokens,
      system: options.system,
      messages: options.messages,
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield { type: 'text_delta', text: event.delta.text };
      }
    }

    const finalMessage = await stream.finalMessage();
    yield {
      type: 'message_stop',
      inputTokens: finalMessage.usage.input_tokens,
      outputTokens: finalMessage.usage.output_tokens,
    };
  }

  /**
   * Generate structured JSON with retry and parsing/validation
   */
  async generateJSON<T>(options: {
    system?: string;
    messages: Anthropic.Messages.MessageParam[];
    maxTokens?: number;
    model?: string;
    parse: (text: string) => T;
  }): Promise<{ data: T; inputTokens: number; outputTokens: number }> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await this.generateText(options);

        // Try to extract JSON from markdown code blocks
        let jsonStr = result.text.trim();
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1]!.trim();
        }

        const data = options.parse(jsonStr);
        return {
          data,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        logger.warn(`[AI] JSON generation attempt ${attempt + 1} failed`, {
          error: lastError.message,
        });
        // Wait before retrying with exponential backoff
        if (attempt < 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error('JSON generation failed');
  }

  /**
   * Vision analysis (for room scan compatibility)
   */
  async analyzeImage(options: {
    images: Array<{
      data: string;
      mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
    }>;
    prompt: string;
    model?: string;
    maxTokens?: number;
  }): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
    const content: Anthropic.Messages.ContentBlockParam[] = [];

    for (const img of options.images) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: img.mediaType,
          data: img.data,
        },
      });
    }
    content.push({ type: 'text', text: options.prompt });

    const maxTokens = Math.min(options.maxTokens || 2000, 16384);

    const response = await this._client.messages.create({
      model: options.model || 'claude-sonnet-4-5-20250929',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content }],
    });

    const text = response.content
      .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }

  /**
   * Generate with tool use
   */
  async generateWithTools(options: {
    system?: string;
    messages: Anthropic.Messages.MessageParam[];
    tools: Anthropic.Messages.Tool[];
    maxTokens?: number;
    model?: string;
  }): Promise<{
    content: Anthropic.Messages.ContentBlock[];
    inputTokens: number;
    outputTokens: number;
    stopReason: string;
  }> {
    const maxTokens = Math.min(options.maxTokens || 4096, 16384);

    const response = await this._client.messages.create({
      model: options.model || 'claude-sonnet-4-5-20250929',
      max_tokens: maxTokens,
      system: options.system,
      messages: options.messages,
      tools: options.tools,
    });

    return {
      content: response.content,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      stopReason: response.stop_reason || 'end_turn',
    };
  }

  /**
   * Log AI usage to the database for tracking and billing.
   *
   * @param userId - The user who made the API call
   * @param service - Service name (e.g., 'anthropic', 'gemini')
   * @param model - Model identifier used
   * @param inputTokens - Number of input tokens consumed
   * @param outputTokens - Number of output tokens generated
   * @param durationMs - Optional duration of the call in milliseconds
   * @param metadata - Optional metadata for tracking (prompt version, A/B test group, etc.)
   */
  async logUsage(
    userId: string,
    service: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    durationMs?: number,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await prisma.aIUsageLog.create({
        data: {
          userId,
          service,
          model,
          inputTokens,
          outputTokens,
          durationMs: durationMs ?? null,
        },
      });
      if (metadata) {
        logger.info('[AI] Usage metadata', { userId, ...metadata });
      }
    } catch (err) {
      // Non-critical: log a warning but don't break the calling flow
      logger.warn('[AI] Failed to log usage', {
        error: err instanceof Error ? err.message : String(err),
        userId,
        service,
        model,
      });
    }
  }
}

export default AnthropicService;
