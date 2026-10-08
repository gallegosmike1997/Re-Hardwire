import { config } from './config';
import type { LLMRequest, RouteResponse } from './api';

export async function streamConversation(
  request: LLMRequest, signal: AbortSignal,
  onDelta: (text: string) => void, onRoute: (route: RouteResponse) => void,
): Promise<void> {
  const response = await fetch(`${config.api.baseUrl}/api/llm/stream`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request), signal,
    cache: 'no-store', credentials: 'omit', redirect: 'error',
    referrerPolicy: 'no-referrer',
  });
  if (!response.ok || !response.body) throw new Error(`Chat unavailable (HTTP ${response.status}).`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let complete = false;
  const consume = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.type === 'error') throw new Error(event.error || 'Model stream failed.');
    if (event.type === 'route') onRoute(event.route);
    if (event.type === 'delta' && typeof event.content === 'string') onDelta(event.content);
    if (event.type === 'done') complete = true;
  };
  try {
    while (!complete) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      lines.forEach(consume);
      if (done) { consume(buffer); break; }
    }
    if (!complete) throw new Error('The response was interrupted. Please retry.');
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
