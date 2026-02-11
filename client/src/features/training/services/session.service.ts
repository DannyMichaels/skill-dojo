import api from '../../../api/client';
import type { Session, SessionType } from '../types/session.types';

export async function listSessions(skillId: string): Promise<Session[]> {
  const res = await api.get(`/user-skills/${skillId}/sessions`);
  return res.data.sessions;
}

export async function createSession(skillId: string, type: SessionType = 'training'): Promise<Session> {
  const res = await api.post(`/user-skills/${skillId}/sessions`, { type });
  return res.data.session;
}

export async function getSession(skillId: string, sessionId: string): Promise<Session> {
  const res = await api.get(`/user-skills/${skillId}/sessions/${sessionId}`);
  return res.data.session;
}

export async function deleteSession(skillId: string, sessionId: string): Promise<void> {
  await api.delete(`/user-skills/${skillId}/sessions/${sessionId}`);
}

export async function reactivateSession(skillId: string, sessionId: string): Promise<Session> {
  const res = await api.patch(`/user-skills/${skillId}/sessions/${sessionId}/reactivate`);
  return res.data.session;
}

/**
 * Send a message and stream the response via SSE.
 * Returns an abort controller for cancellation.
 */
export function sendMessageSSE(
  skillId: string,
  sessionId: string,
  content: string,
  onText: (text: string) => void,
  onToolUse: (tool: string, input: Record<string, unknown>) => void,
  onDone: () => void,
  onError: (error: string) => void,
): AbortController {
  const controller = new AbortController();
  const token = localStorage.getItem('__dojo-auth-token');

  fetch(`/api/user-skills/${skillId}/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        onError(data.error || `HTTP ${response.status}`);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onError('No response body');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let settled = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            switch (event.type) {
              case 'text':
                onText(event.content);
                break;
              case 'tool_use':
                onToolUse(event.tool, event.input);
                break;
              case 'done':
                settled = true;
                onDone();
                break;
              case 'error':
                settled = true;
                onError(event.error);
                break;
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }

      if (!settled) {
        onError('Stream ended unexpectedly');
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError(err.message);
      }
    });

  return controller;
}
