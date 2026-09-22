import { env } from '../config/env.js';
import { ApiError, ERROR_CODES } from '../utils/ApiError.js';

/**
 * Provider-agnostic LLM client. Talks to any OpenAI-compatible `/v1/chat/
 * completions` endpoint, configured through the environment:
 *
 *   AI_PROVIDER=openai (default) | openai-compatible
 *   AI_API_KEY=…
 *   AI_MODEL=gpt-4o-mini
 *   AI_BASE_URL=…  (optional custom endpoint; default https://api.openai.com/v1)
 *
 * The pipeline degrades gracefully: summary/ask tools return a friendly error
 * until a key is configured, while local tools (markdown, extraction) keep
 * working untouched.
 */

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const MAX_CONTEXT_CHARS = 120_000;

export function aiConfigured(): boolean {
  return Boolean(env.ai.apiKey);
}

export interface ChatRequest {
  system?: string;
  user: string;
  maxTokens?: number;
}

export async function chatComplete(request: ChatRequest): Promise<string> {
  if (!env.ai.apiKey) {
    throw new ApiError(
      503,
      ERROR_CODES.PROCESSING_FAILED,
      'The AI assistant is not configured yet. Set AI_API_KEY (and AI_MODEL) in server/.env and restart.',
    );
  }

  const baseUrl = (env.ai.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const model = env.ai.model || 'gpt-4o-mini';
  const endpoint = `${baseUrl}/chat/completions`;

  const messages = [
    ...(request.system ? [{ role: 'system', content: request.system }] : []),
    { role: 'user', content: request.user },
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.ai.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: request.maxTokens ?? 2000,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new ApiError(
        502,
        ERROR_CODES.PROCESSING_FAILED,
        `The AI provider returned ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`,
      );
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) throw new ApiError(502, ERROR_CODES.PROCESSING_FAILED, 'The AI provider returned an empty answer.');
    return content;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if ((error as Error).name === 'AbortError') {
      throw new ApiError(504, ERROR_CODES.PROCESSING_FAILED, 'The AI request timed out. Try a shorter document.');
    }
    throw new ApiError(502, ERROR_CODES.PROCESSING_FAILED, 'Could not reach the AI provider.', {
      cause: (error as Error).message,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Trims very long documents so the prompt stays inside the model's window. */
export function clampContext(text: string): string {
  if (text.length <= MAX_CONTEXT_CHARS) return text;
  return `${text.slice(0, MAX_CONTEXT_CHARS)}\n\n[…] document truncated for length.`;
}