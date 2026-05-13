import i18next from 'i18next';
import { useState, useCallback, useRef } from 'react';

import { API_BASE_URL, API_ENDPOINTS } from '../services/api/endpoints';

interface ToolUseEntry {
  name: string;
  input: Record<string, unknown>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolUse?: ToolUseEntry[];
}

interface SceneContext {
  roomWidth: number;
  roomDepth: number;
  roomHeight: number;
  items: Array<{
    id: string;
    type: string;
    name?: string;
    position: { x: number; y: number; z: number };
    dimensions?: { width: number; height: number; depth: number };
  }>;
  scores?: Record<string, number>;
  suggestions?: string[];
  style?: string;
  budget?: { min: number; max: number };
}

interface SessionInfo {
  id: string;
  title: string;
  kitchenId?: string;
  createdAt: string;
  updatedAt: string;
}

export type { ChatMessage, SceneContext, ToolUseEntry, SessionInfo };

export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const creatingSessionRef = useRef<boolean>(false);

  // Save current messages to the active session
  const saveSession = useCallback(async (currentMessages: ChatMessage[]) => {
    if (!sessionId) {return;}
    try {
      await fetch(`${API_BASE_URL}${API_ENDPOINTS.AI_CHAT.SESSION_BY_ID(sessionId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messages: currentMessages }),
      });
    } catch {
      // Silently fail -- session save is best-effort
    }
  }, [sessionId]);

  // Create a new session and return its ID
  const createSession = useCallback(async (title?: string, kitchenId?: string): Promise<string | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AI_CHAT.SESSIONS}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, kitchenId }),
      });
      if (!res.ok) {return null;}
      const json = await res.json() as { success: boolean; data: { id: string } };
      if (json.success) {
        setSessionId(json.data.id);
        return json.data.id;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // List available sessions
  const listSessions = useCallback(async (): Promise<SessionInfo[]> => {
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AI_CHAT.SESSIONS}`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) {return [];}
      const json = await res.json() as { success: boolean; data: SessionInfo[] };
      return json.success ? json.data : [];
    } catch {
      return [];
    }
  }, []);

  // Load session history from DB
  const loadSession = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AI_CHAT.HISTORY(id)}`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) {return false;}
      const json = await res.json() as {
        success: boolean;
        data: { id: string; messages: ChatMessage[] };
      };
      if (json.success) {
        setSessionId(json.data.id);
        setMessages(json.data.messages || []);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const sendMessage = useCallback(async (message: string, sceneContext: SceneContext) => {
    setError(null);

    // Auto-create session if none exists
    if (!sessionId) {
      if (creatingSessionRef.current) {return;}
      creatingSessionRef.current = true;
      try {
        // Use the first few words of the message as title
        const autoTitle = message.length > 50 ? `${message.slice(0, 50)  }...` : message;
        const newId = await createSession(autoTitle);
        if (!newId) {
          // If session creation fails, continue without persistence
          console.warn('AI chat session creation failed - messages will not persist');
        }
      } finally {
        creatingSessionRef.current = false;
      }
    }

    // Add user message
    const userMsg: ChatMessage = { role: 'user', content: message, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    // Start streaming
    setIsStreaming(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Add placeholder assistant message
    const assistantMsg: ChatMessage = { role: 'assistant', content: '', timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AI_CHAT.STREAM}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message,
          sceneContext,
          conversationHistory: messages.slice(-10),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {throw new Error('No response body');}

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {break;}

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let eventType = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (eventType === 'text_delta') {
                try {
                  const text = JSON.parse(data) as string;
                  setMessages(prev => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last && last.role === 'assistant') {
                      updated[updated.length - 1] = { ...last, content: last.content + text };
                    }
                    return updated;
                  });
                } catch {
                  /* ignore parse errors */
                }
              } else if (eventType === 'tool_use') {
                try {
                  const parsed = JSON.parse(data) as string;
                  // The server double-serializes: data is JSON.stringify(JSON.stringify({toolName, toolInput}))
                  // So `parsed` is a string that we parse again
                  const toolData = JSON.parse(parsed) as { toolName: string; toolInput: Record<string, unknown> };
                  setMessages(prev => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last && last.role === 'assistant') {
                      const existingTools = last.toolUse || [];
                      updated[updated.length - 1] = {
                        ...last,
                        toolUse: [...existingTools, { name: toolData.toolName, input: toolData.toolInput }],
                      };
                    }
                    return updated;
                  });
                } catch {
                  /* ignore parse errors */
                }
              } else if (eventType === 'close') {
                break;
              }
              eventType = '';
            }
          }
        }
      } finally {
        reader.cancel().catch(() => {});
      }

      // After stream completes, save to session
      setMessages(prev => {
        // Schedule save with the final messages (need to capture in callback)
        void saveSession(prev);
        return prev;
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {return;}
      const errorMsg = err instanceof Error
        ? err.message
        : i18next.t('errors.connectionError', 'Connection error');
      setError(errorMsg);
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'assistant' && !last.content) {
          updated[updated.length - 1] = {
            ...last,
            content: i18next.t('errors.aiChatError', 'Sorry, an error occurred. Please try again.'),
          };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [messages, sessionId, createSession, saveSession]);

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setError(null);
  }, []);

  return {
    messages,
    isStreaming,
    error,
    sessionId,
    sendMessage,
    stopStreaming,
    clearHistory,
    createSession,
    listSessions,
    loadSession,
    setSessionId,
  };
}
