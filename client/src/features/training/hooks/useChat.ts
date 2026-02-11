import { useState, useCallback, useRef } from 'react';
import type { SessionMessage } from '../types/session.types';
import { sendMessageSSE } from '../services/session.service';

interface UseChatOptions {
  skillId: string;
  sessionId: string;
  initialMessages?: SessionMessage[];
  maxRetries?: number;
  onToolUse?: (tool: string, input: Record<string, unknown>) => void;
}

export default function useChat({ skillId, sessionId, initialMessages = [], maxRetries = 2, onToolUse }: UseChatOptions) {
  const [messages, setMessages] = useState<SessionMessage[]>(initialMessages);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const lastContentRef = useRef('');

  const sendMessage = useCallback((content: string) => {
    if (streaming) return;
    setError(null);
    retryCountRef.current = 0;
    lastContentRef.current = content;

    // Add user message
    const userMsg: SessionMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    startStream(content);
  }, [skillId, sessionId, streaming]); // eslint-disable-line react-hooks/exhaustive-deps

  function startStream(content: string) {
    setStreaming(true);
    let assistantContent = '';

    // Add placeholder assistant message
    const assistantMsg: SessionMessage = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => {
      // If retrying, replace the last (empty/partial) assistant message
      if (retryCountRef.current > 0) {
        const updated = [...prev];
        if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
          updated[updated.length - 1] = assistantMsg;
          return updated;
        }
      }
      return [...prev, assistantMsg];
    });

    abortRef.current = sendMessageSSE(
      skillId,
      sessionId,
      content,
      (text) => {
        assistantContent += text;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], content: assistantContent };
          return updated;
        });
      },
      (tool, input) => {
        onToolUse?.(tool, input);
      },
      () => {
        setStreaming(false);
        retryCountRef.current = 0;
      },
      (err) => {
        // Don't retry on non-transient errors (session lock, auth, validation)
        const nonRetryable = err.includes('AbortError') || err.includes('already processing') || err.includes('not active') || err.includes('limit');

        if (retryCountRef.current < maxRetries && !nonRetryable) {
          retryCountRef.current++;
          setTimeout(() => {
            startStream(lastContentRef.current);
          }, 1000 * retryCountRef.current); // exponential-ish backoff
          return;
        }
        setError(err);
        setStreaming(false);
      },
    );
  }

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  return { messages, streaming, error, sendMessage, abort, setMessages };
}
