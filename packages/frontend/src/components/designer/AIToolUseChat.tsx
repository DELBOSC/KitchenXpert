import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL, API_ENDPOINTS } from '../../services/api/endpoints';

// ─── Types ───────────────────────────────────────────────────────────

interface ToolCall {
  name: string;
  params: Record<string, unknown>;
}

interface ToolCallStatus extends ToolCall {
  executed: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolCalls?: ToolCallStatus[];
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
  scores?: {
    overall: number;
    ergonomics: number;
    storage: number;
    aesthetics: number;
    budgetEfficiency: number;
    spaceUtilization: number;
  };
  suggestions?: string[];
  style?: string;
  budget?: { min: number; max: number };
}

interface AIToolUseChatProps {
  /** Current 3D scene context to send with each message */
  sceneContext: SceneContext;
  /** Callback to execute a tool call on the 3D engine */
  onExecuteToolCall: (name: string, params: Record<string, unknown>) => void;
  /** Optional CSS class name */
  className?: string;
}

// ─── Tool display names (French) ─────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
  add_cabinet: 'Ajouter meuble',
  move_object: 'Deplacer objet',
  remove_object: 'Supprimer objet',
  change_material: 'Changer materiau',
  change_all_materials: 'Changer tous les materiaux',
  add_appliance: 'Ajouter electromenager',
  optimize_work_triangle: 'Optimiser triangle',
  apply_style: 'Appliquer style',
  auto_fill_wall: 'Remplir mur',
  generate_countertop: 'Generer plan de travail',
  add_island: 'Ajouter ilot',
  rotate_object: 'Tourner objet',
  set_room_dimensions: 'Dimensions piece',
  run_compliance_check: 'Verification normes',
  undo: 'Annuler',
  redo: 'Refaire',
};

// ─── Helpers ─────────────────────────────────────────────────────────

let messageIdCounter = 0;
function generateMessageId(): string {
  messageIdCounter += 1;
  return `msg-${Date.now()}-${messageIdCounter}`;
}

// ─── Component ───────────────────────────────────────────────────────

export default function AIToolUseChat({
  sceneContext,
  onExecuteToolCall,
  className = '',
}: AIToolUseChatProps): React.ReactElement {
  const { t } = useTranslation();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  /**
   * Send a message to the backend tool-use endpoint,
   * receive tool calls, and execute them on the 3D engine.
   */
  const sendMessage = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    setInputValue('');

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Create abort controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Build conversation history (text-only, last 10 messages)
      const conversationHistory = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }));

      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AI_CHAT.TOOL_USE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: trimmed,
          sceneContext,
          conversationHistory,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json() as {
        success: boolean;
        data?: { text: string; toolCalls: ToolCall[] };
        error?: string;
      };

      if (!json.success || !json.data) {
        throw new Error(json.error || 'Unknown error');
      }

      const { text, toolCalls } = json.data;

      // Execute each tool call on the 3D engine
      const toolCallStatuses: ToolCallStatus[] = toolCalls.map(tc => ({
        ...tc,
        executed: false,
      }));

      // Add assistant message with tool calls
      const assistantMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: text,
        timestamp: new Date().toISOString(),
        toolCalls: toolCallStatuses,
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Execute tool calls sequentially
      for (let i = 0; i < toolCalls.length; i++) {
        const tc = toolCalls[i];
        if (!tc) continue;
        try {
          onExecuteToolCall(tc.name, tc.params);

          // Mark as executed
          setMessages(prev => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg && lastMsg.toolCalls) {
              const updatedTools = [...lastMsg.toolCalls];
              updatedTools[i] = { ...updatedTools[i]!, executed: true };
              updated[updated.length - 1] = { ...lastMsg, toolCalls: updatedTools };
            }
            return updated;
          });
        } catch (execErr) {
          logger_warn(`Failed to execute tool ${tc.name}`, execErr);
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);

      // Add error assistant message
      setMessages(prev => [
        ...prev,
        {
          id: generateMessageId(),
          role: 'assistant',
          content: t(
            'designer.toolUse.error',
            'Desole, une erreur est survenue. Veuillez reessayer.'
          ),
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [inputValue, isLoading, messages, sceneContext, onExecuteToolCall, t]);

  /** Handle Enter key press */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void sendMessage();
      }
    },
    [sendMessage]
  );

  /** Clear chat history */
  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return (
    <div
      className={`flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          {/* Wand / magic icon */}
          <svg
            className="w-5 h-5 text-indigo-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5"
            />
          </svg>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {t('designer.toolUse.title', 'Commandes IA 3D')}
          </h2>
        </div>

        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title={t('designer.toolUse.clearHistory', 'Effacer l\'historique')}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] max-h-[400px]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <svg
              className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
              />
            </svg>
            <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">
              {t(
                'designer.toolUse.placeholder',
                'Decrivez ce que vous souhaitez modifier dans votre cuisine. Ex: "Ajoute un ilot central de 1m20" ou "Change tous les plans de travail en granit noir"'
              )}
            </p>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
              >
                {/* Message text */}
                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>

                {/* Tool call indicators */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mt-2 space-y-1 border-t border-gray-200 dark:border-gray-600 pt-2">
                    {msg.toolCalls.map((tc, idx) => (
                      <div
                        key={`${msg.id}-tool-${idx}`}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        {/* Status icon */}
                        {tc.executed ? (
                          <svg
                            className="w-3.5 h-3.5 text-green-500 flex-shrink-0"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                          </svg>
                        ) : (
                          <svg
                            className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0 animate-spin"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                        )}

                        {/* Tool name */}
                        <span
                          className={`font-medium ${
                            tc.executed
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {TOOL_LABELS[tc.name] || tc.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Timestamp */}
                <p
                  className={`text-[10px] mt-1 ${
                    msg.role === 'user'
                      ? 'text-indigo-200'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-indigo-500 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t('designer.toolUse.thinking', 'Analyse en cours...')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t(
              'designer.toolUse.inputPlaceholder',
              'Ex: Ajoute un ilot central de 1m20...'
            )}
            disabled={isLoading}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={() => void sendMessage()}
            disabled={isLoading || !inputValue.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <svg
                className="w-4 h-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Simple console warning helper (avoids direct console usage in production builds)
function logger_warn(message: string, data?: unknown): void {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(`[AIToolUseChat] ${message}`, data);
  }
}
