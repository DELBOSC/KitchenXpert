import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';

import { useAIChat } from '../../hooks/useAIChat';

import type { SceneContext, ToolUseEntry, SessionInfo } from '../../hooks/useAIChat';
import type { KitchenEngine } from '@kitchenxpert/3d-engine';

// Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface ChatPanelProps {
  engine: KitchenEngine | null;
  onClose?: () => void;
  onToolAction?: (toolName: string, toolInput: Record<string, unknown>) => void;
}

// ─── Voice-to-Scene: Local Command Parsing ────────────────────────────────────

interface LocalVoiceCommandResult {
  tool: string;
  input: Record<string, unknown>;
}

function mapDirection(dir: string): string {
  const map: Record<string, string> = {
    gauche: 'left',
    droite: 'right',
    devant: 'forward',
    derrière: 'backward',
    left: 'left',
    right: 'right',
    forward: 'forward',
    backward: 'backward',
  };
  return map[dir.toLowerCase()] ?? dir;
}

function mapItemType(item: string): string {
  const map: Record<string, string> = {
    meuble: 'base',
    cabinet: 'base',
    placard: 'wall',
    évier: 'sink',
    sink: 'sink',
    frigo: 'fridge',
    fridge: 'fridge',
    four: 'oven',
    oven: 'oven',
    'lave-vaisselle': 'dishwasher',
    dishwasher: 'dishwasher',
  };
  return map[item.toLowerCase()] ?? item;
}

function mapView(view: string): string {
  const map: Record<string, string> = {
    dessus: 'top',
    top: 'top',
    face: 'front',
    front: 'front',
    droite: 'right',
    right: 'right',
    gauche: 'left',
    left: 'left',
    perspective: '3d',
    '3d': '3d',
  };
  return map[view.toLowerCase()] ?? view;
}

const LOCAL_VOICE_COMMANDS: Array<{
  patterns: RegExp[];
  action: (match: RegExpMatchArray) => LocalVoiceCommandResult;
}> = [
  {
    patterns: [
      /(?:déplace|bouge|move)\s+(?:le |la |l')?(.*?)\s+(?:à |de |vers la? )?(gauche|droite|devant|derrière|left|right|forward|backward)/i,
    ],
    action: (match) => ({
      tool: 'move_object',
      input: { objectName: match[1] ?? '', direction: mapDirection(match[2] ?? ''), distance: 10 },
    }),
  },
  {
    patterns: [
      /(?:ajoute|add)\s+(?:un |une |a )?(meuble|cabinet|placard|évier|sink|frigo|fridge|four|oven|lave-vaisselle|dishwasher)/i,
    ],
    action: (match) => ({
      tool: 'add_cabinet',
      input: { type: mapItemType(match[1] ?? ''), width: 60 },
    }),
  },
  {
    patterns: [/(?:supprime|enlève|remove|delete)\s+(?:le |la |l')?(.*)/i],
    action: (match) => ({
      tool: 'remove_object',
      input: { objectName: match[1] ?? '' },
    }),
  },
  {
    patterns: [/(?:vue|view)\s+(dessus|top|face|front|droite|right|gauche|left|perspective|3d)/i],
    action: (match) => ({
      tool: 'switch_view',
      input: { view: mapView(match[1] ?? '') },
    }),
  },
  {
    patterns: [/(?:quel|what|combien|how much).*(?:budget|coût|cost|prix|price)/i],
    action: () => ({
      tool: 'get_budget_summary',
      input: {},
    }),
  },
  {
    patterns: [/(?:triangle|ergonomie|ergonomic)/i],
    action: () => ({
      tool: 'get_work_triangle',
      input: {},
    }),
  },
];

/**
 * Try to match a transcript against local voice commands.
 * Returns the tool action if matched, or null if no match.
 */
function tryParseLocalVoiceCommand(text: string): LocalVoiceCommandResult | null {
  for (const cmd of LOCAL_VOICE_COMMANDS) {
    for (const pattern of cmd.patterns) {
      const match = text.match(pattern);
      if (match) {
        return cmd.action(match);
      }
    }
  }
  return null;
}

/**
 * Extract scene context from the 3D engine for the AI chat
 */
function extractSceneContext(engine: KitchenEngine): SceneContext {
  const items: SceneContext['items'] = [];
  const scene = engine.scene.getThreeScene();

  scene.traverse((child: THREE.Object3D) => {
    if (
      !child.userData.id ||
      child.userData.type === 'wall' ||
      child.userData.type === 'floor' ||
      child.userData.isKitchenStructure
    ) {
      return;
    }

    const box = new THREE.Box3().setFromObject(child);
    const size = box.getSize(new THREE.Vector3());

    const userDimensions = child.userData.dimensions as
      | { width?: number; height?: number; depth?: number }
      | undefined;

    items.push({
      id: child.userData.id as string,
      type: (child.userData.type as string) || 'unknown',
      name: child.userData.name as string | undefined,
      position: {
        x: child.position.x,
        y: child.position.y,
        z: child.position.z,
      },
      dimensions: {
        width: userDimensions?.width || size.x,
        height: userDimensions?.height || size.y,
        depth: userDimensions?.depth || size.z,
      },
    });
  });

  return {
    roomWidth: Math.round(engine.roomWidth * 1000),
    roomDepth: Math.round(engine.roomDepth * 1000),
    roomHeight: Math.round(engine.roomHeight * 1000),
    items,
  };
}

/**
 * Renders a single tool action card
 */
function ToolActionCard({
  tool,
  onApply,
  onDismiss,
  t,
  toolLabels,
}: {
  tool: ToolUseEntry;
  onApply: () => void;
  onDismiss: () => void;
  t: (key: string, fallback: string) => string;
  toolLabels: Record<string, string>;
}): React.ReactElement {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return <></>;
  }

  return (
    <div className="mt-2 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <svg
          className="w-4 h-4 text-purple-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
          {toolLabels[tool.name] ?? tool.name}
        </span>
      </div>

      {/* Display tool parameters */}
      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5 mb-2">
        {Object.entries(tool.input).map(([key, value]) => (
          <div key={key} className="flex gap-1">
            <span className="font-medium text-gray-500 dark:text-gray-400">{key}:</span>
            <span>{String(value)}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onApply}
          className="px-3 py-1 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          {t('designer.chat.apply', 'Appliquer')}
        </button>
        <button
          onClick={() => {
            setDismissed(true);
            onDismiss();
          }}
          className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          {t('designer.chat.dismiss', 'Ignorer')}
        </button>
      </div>
    </div>
  );
}

export default function ChatPanel({
  engine,
  onClose,
  onToolAction,
}: ChatPanelProps): React.ReactElement {
  const { t, i18n } = useTranslation();

  const quickSuggestions = useMemo(
    () => [
      t('designer.chat.suggestion.workTriangle', 'Comment ameliorer mon triangle de travail ?'),
      t('designer.chat.suggestion.missingItems', 'Que manque-t-il dans ma cuisine ?'),
      t('designer.chat.suggestion.budget', 'Mon budget est-il realiste ?'),
      t('designer.chat.suggestion.storage', 'Comment optimiser le rangement ?'),
    ],
    [t]
  );

  const toolLabels: Record<string, string> = useMemo(
    () => ({
      suggest_add_item: t('designer.chat.tool.addItem', 'Ajouter un element'),
      suggest_move_item: t('designer.chat.tool.moveItem', 'Deplacer un element'),
      analyze_work_triangle: t(
        'designer.chat.tool.analyzeTriangle',
        'Analyser le triangle de travail'
      ),
      estimate_budget: t('designer.chat.tool.estimateBudget', 'Estimer le budget'),
      suggest_style_improvement: t('designer.chat.tool.styleImprovement', 'Amelioration de style'),
    }),
    [t]
  );

  const {
    messages,
    isStreaming,
    error,
    sessionId,
    sendMessage,
    stopStreaming,
    clearHistory,
    listSessions,
    loadSession,
  } = useAIChat();
  const [input, setInput] = useState('');
  const [dismissedError, setDismissedError] = useState(false);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceCommandToast, setVoiceCommandToast] = useState<string | null>(null);
  const voiceToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Check if Web Speech API is supported
  useEffect(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognitionCtor);
  }, []);

  // Cleanup speech recognition and voice toast timer on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      if (voiceToastTimerRef.current) {
        clearTimeout(voiceToastTimerRef.current);
      }
    };
  }, []);

  // Track mounted state for async callbacks
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Show a brief toast confirming a voice command was executed
  const showVoiceCommandToast = useCallback(
    (toolName: string) => {
      const label = toolLabels[toolName] ?? toolName;
      setVoiceCommandToast(label);
      if (voiceToastTimerRef.current) {
        clearTimeout(voiceToastTimerRef.current);
      }
      voiceToastTimerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setVoiceCommandToast(null);
        }
        voiceToastTimerRef.current = null;
      }, 3000);
    },
    [toolLabels]
  );

  // Execute a local voice command directly without going through AI
  const executeLocalVoiceCommand = useCallback(
    (result: LocalVoiceCommandResult) => {
      onToolAction?.(result.tool, result.input);
      showVoiceCommandToast(result.tool);
    },
    [onToolAction, showVoiceCommandToast]
  );

  const toggleVoiceInput = useCallback(() => {
    if (!voiceSupported) {
      return;
    }

    // If already listening, stop
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;
    // Use current i18n locale, fallback to fr-FR
    const currentLang = i18n.language || 'fr-FR';
    recognition.lang = currentLang.includes('-')
      ? currentLang
      : `${currentLang}-${currentLang.toUpperCase()}`;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        // Try to match a local voice command first
        const localCommand = tryParseLocalVoiceCommand(transcript);
        if (localCommand) {
          executeLocalVoiceCommand(localCommand);
          return;
        }
        // No local match -- append to text input as before
        setInput((prev) => {
          const separator = prev.trim() ? ' ' : '';
          return prev + separator + transcript;
        });
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [voiceSupported, isListening, i18n.language, executeLocalVoiceCommand]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset error dismissal when a new error arrives
  useEffect(() => {
    setDismissedError(false);
  }, [error]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSessionDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load sessions list on demand
  const handleOpenSessionDropdown = useCallback(async () => {
    if (!sessionsLoaded) {
      const loaded = await listSessions();
      setSessions(loaded);
      setSessionsLoaded(true);
    }
    setShowSessionDropdown((prev) => !prev);
  }, [sessionsLoaded, listSessions]);

  const handleSelectSession = useCallback(
    async (id: string) => {
      setShowSessionDropdown(false);
      await loadSession(id);
    },
    [loadSession]
  );

  const handleNewConversation = useCallback(() => {
    setShowSessionDropdown(false);
    clearHistory();
  }, [clearHistory]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || !engine) {
      return;
    }

    // Try local voice command parsing on typed text as well
    const localCommand = tryParseLocalVoiceCommand(trimmed);
    if (localCommand) {
      executeLocalVoiceCommand(localCommand);
      setInput('');
      return;
    }

    const sceneContext = extractSceneContext(engine);
    void sendMessage(trimmed, sceneContext);
    setInput('');
  }, [input, isStreaming, engine, sendMessage, executeLocalVoiceCommand]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleQuickSuggestion = useCallback(
    (suggestion: string) => {
      if (isStreaming || !engine) {
        return;
      }
      const sceneContext = extractSceneContext(engine);
      void sendMessage(suggestion, sceneContext);
    },
    [isStreaming, engine, sendMessage]
  );

  const handleToolApply = useCallback(
    (toolName: string, toolInput: Record<string, unknown>) => {
      onToolAction?.(toolName, toolInput);
    },
    [onToolAction]
  );

  return (
    <div
      className="flex flex-col h-full bg-white dark:bg-gray-800"
      role="complementary"
      aria-label={t('designer.chat.title', 'Chat IA')}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-purple-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {t('designer.chat.title', 'Chat IA')}
          </h2>
          {isStreaming && (
            <span className="flex items-center gap-1 text-xs text-purple-500">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
              </span>
              {t('designer.chat.thinking', 'Reflexion...')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Session dropdown toggle */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={handleOpenSessionDropdown}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
              title={t('designer.chat.sessions', 'Conversations')}
              aria-label={t('designer.chat.sessions', 'Conversations')}
            >
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
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>

            {showSessionDropdown && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                <button
                  onClick={handleNewConversation}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 border-b border-gray-200 dark:border-gray-600"
                >
                  + {t('designer.chat.newConversation', 'Nouvelle conversation')}
                </button>
                {sessions.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-400">
                    {t('designer.chat.noSessions', 'Aucune conversation sauvegardee')}
                  </div>
                ) : (
                  sessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => handleSelectSession(session.id)}
                      className={`w-full px-3 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors ${
                        session.id === sessionId
                          ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="font-medium truncate">
                        {session.title || t('designer.chat.untitled', 'Sans titre')}
                      </div>
                      <div className="text-gray-400 dark:text-gray-500 mt-0.5">
                        {new Date(session.updatedAt).toLocaleDateString()}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              disabled={isStreaming}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors disabled:opacity-50"
              title={t('designer.chat.clear', "Effacer l'historique")}
              aria-label={t('designer.chat.clear', "Effacer l'historique")}
            >
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
              title={t('common.close', 'Fermer')}
              aria-label={t('common.close', 'Fermer')}
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
        role="log"
        aria-live="polite"
        aria-label={t('designer.chat.messages', 'Messages')}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-6">
            <div className="text-center">
              <svg
                className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {t('designer.chat.placeholder', 'Posez une question sur votre cuisine...')}
              </p>
            </div>

            {/* Quick suggestions */}
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {quickSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleQuickSuggestion(suggestion)}
                  disabled={!engine || isStreaming}
                  className="px-3 py-1.5 text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div
                key={`${msg.role}-${idx}`}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className="max-w-[80%]">
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-md'
                    }`}
                  >
                    {msg.content ||
                      (isStreaming && idx === messages.length - 1 ? (
                        <span className="flex items-center gap-1.5 text-gray-400">
                          <span className="flex gap-1">
                            <span
                              className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: '0ms' }}
                            />
                            <span
                              className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: '150ms' }}
                            />
                            <span
                              className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                              style={{ animationDelay: '300ms' }}
                            />
                          </span>
                        </span>
                      ) : null)}
                  </div>

                  {/* Tool action cards */}
                  {msg.toolUse && msg.toolUse.length > 0 && (
                    <div className="space-y-2">
                      {msg.toolUse.map((tool, toolIdx) => (
                        <ToolActionCard
                          key={`${tool.name}-${toolIdx}`}
                          tool={tool}
                          onApply={() => handleToolApply(tool.name, tool.input)}
                          onDismiss={() => {
                            /* noop - card hides itself */
                          }}
                          t={t}
                          toolLabels={toolLabels}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Voice command toast */}
      {voiceCommandToast && (
        <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 border-t border-green-200 dark:border-green-800 flex-shrink-0 flex items-center gap-2 transition-all duration-300">
          <svg
            className="w-4 h-4 text-green-500 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-xs text-green-700 dark:text-green-300 font-medium">
            {t('designer.chat.voiceCommandExecuted', 'Voice command executed:')} {voiceCommandToast}
          </p>
        </div>
      )}

      {/* Error display */}
      {error && !dismissedError && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800 flex-shrink-0 flex items-center justify-between">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => setDismissedError(true)}
            className="ml-2 text-red-500 hover:text-red-700 flex-shrink-0"
            aria-label={t('common.close', 'Fermer')}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('designer.chat.inputPlaceholder', 'Ecrivez votre message...')}
            disabled={!engine || isStreaming}
            rows={1}
            className="flex-1 resize-none px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('designer.chat.inputPlaceholder', 'Ecrivez votre message...')}
          />

          {/* Voice input button */}
          {voiceSupported && (
            <button
              onClick={toggleVoiceInput}
              disabled={!engine || isStreaming}
              className={`flex-shrink-0 p-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isListening
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title={
                isListening
                  ? t('chat.listening', 'Listening...')
                  : t('chat.voiceInput', 'Voice input')
              }
              aria-label={
                isListening
                  ? t('chat.listening', 'Listening...')
                  : t('chat.voiceInput', 'Voice input')
              }
              aria-pressed={isListening}
            >
              {isListening ? (
                <svg className="w-5 h-5 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                  />
                </svg>
              )}
            </button>
          )}

          {isStreaming ? (
            <button
              onClick={stopStreaming}
              className="flex-shrink-0 p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
              title={t('designer.chat.stop', 'Arreter')}
              aria-label={t('designer.chat.stop', 'Arreter')}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || !engine || isStreaming}
              className="flex-shrink-0 p-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={t('designer.chat.send', 'Envoyer')}
              aria-label={t('designer.chat.send', 'Envoyer')}
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
