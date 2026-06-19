import type { Provider } from '../../shared/types';

interface StreamOptions {
  provider: Provider;
  apiKey: string;
  model: string;
  baseUrl: string;
  systemPrompt: string;
  userText: string;
  maxTokens?: number;
  onChunk: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export function streamLLM(options: StreamOptions): AbortController {
  const controller = new AbortController();

  if (options.provider === 'anthropic') {
    streamAnthropic(options, controller.signal);
  } else {
    streamOpenAI(options, controller.signal);
  }

  return controller;
}

async function streamAnthropic(options: StreamOptions, signal: AbortSignal): Promise<void> {
  const { apiKey, model, baseUrl, systemPrompt, userText, maxTokens = 1024, onChunk, onDone, onError } = options;

  try {
    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        stream: true,
        system: systemPrompt,
        messages: [{ role: 'user', content: userText }],
      }),
      signal,
    });

    if (!response.ok) {
      const errBody = await response.text();
      onError(`API Error ${response.status}: ${errBody}`);
      return;
    }

    await parseAnthropicSSE(response, onChunk, onDone, onError);
  } catch (err: unknown) {
    if ((err as Error).name !== 'AbortError') {
      onError((err as Error).message || 'Unknown error');
    }
  }
}

async function streamOpenAI(options: StreamOptions, signal: AbortSignal): Promise<void> {
  const { apiKey, model, baseUrl, systemPrompt, userText, maxTokens = 1024, onChunk, onDone, onError } = options;

  try {
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        stream: true,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userText },
        ],
      }),
      signal,
    });

    if (!response.ok) {
      const errBody = await response.text();
      onError(`API Error ${response.status}: ${errBody}`);
      return;
    }

    await parseOpenAIsSE(response, onChunk, onDone, onError);
  } catch (err: unknown) {
    if ((err as Error).name !== 'AbortError') {
      onError((err as Error).message || 'Unknown error');
    }
  }
}

async function parseAnthropicSSE(
  response: Response,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void
): Promise<void> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('event:')) continue;

        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.type === 'content_block_delta' && data.delta?.text) {
              onChunk(data.delta.text);
            } else if (data.type === 'message_stop') {
              onDone();
              return;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }
    onDone();
  } catch (err: unknown) {
    if ((err as Error).name !== 'AbortError') {
      onError((err as Error).message);
    }
  }
}

async function parseOpenAIsSE(
  response: Response,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void
): Promise<void> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            onChunk(content);
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
    onDone();
  } catch (err: unknown) {
    if ((err as Error).name !== 'AbortError') {
      onError((err as Error).message);
    }
  }
}
