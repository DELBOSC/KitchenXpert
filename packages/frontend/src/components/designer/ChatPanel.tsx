import { History, MessageSquare, Mic, MicOff, Trash2, X } from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import * as THREE from 'three';

import { useAIChat } from '../../hooks/useAIChat';
import ChatShell from '../assistant/ChatShell';

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
  /**
   * The mode switch, injected by AssistantSurface. Forwarded to ChatShell so the
   * two modes share ONE header — the user reads a single assistant showing two
   * faces, not two stacked chrome bars.
   */
  headerSlot?: React.ReactNode;
  /** One name for both modes — two names would read as two features. */
  title?: string;
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
  headerSlot,
  title,
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

  // Enter-to-send now lives in ChatShell — one keyboard contract for both modes.

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
    <ChatShell
      title={title ?? t('designer.chat.title', 'Chat IA')}
      icon={
        <MessageSquare
          className="h-5 w-5 text-kx-brand-strong dark:text-kx-brand-from"
          aria-hidden
        />
      }
      headerSlot={headerSlot}
      headerActions={
        <>
          {/* Session history */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={handleOpenSessionDropdown}
              className="kx-focus rounded p-1.5 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
              title={t('designer.chat.sessions', 'Conversations')}
              aria-label={t('designer.chat.sessions', 'Conversations')}
            >
              <History className="h-4 w-4" aria-hidden />
            </button>

            {showSessionDropdown && (
              <div className="absolute right-0 top-full z-50 mt-1 max-h-64 w-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700">
                <button
                  type="button"
                  onClick={handleNewConversation}
                  className="w-full border-b border-gray-200 px-3 py-2 text-left text-xs font-medium text-kx-brand-strong hover:bg-gray-50 dark:border-gray-600 dark:text-kx-brand-from dark:hover:bg-gray-600"
                >
                  {t('designer.chat.newConversation', 'Nouvelle conversation')}
                </button>
                {sessions.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-400">
                    {t('designer.chat.noSessions', 'Aucune conversation sauvegardee')}
                  </div>
                ) : (
                  sessions.map((session) => (
                    <button
                      type="button"
                      key={session.id}
                      onClick={() => handleSelectSession(session.id)}
                      className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-gray-50 dark:hover:bg-gray-600 ${
                        session.id === sessionId
                          ? 'bg-gray-50 text-kx-brand-strong dark:bg-gray-600 dark:text-kx-brand-from'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="truncate font-medium">
                        {session.title || t('designer.chat.untitled', 'Sans titre')}
                      </div>
                      <div className="mt-0.5 text-gray-400 dark:text-gray-500">
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
              type="button"
              onClick={clearHistory}
              disabled={isStreaming}
              className="kx-focus rounded p-1.5 text-gray-400 transition-colors hover:text-gray-600 disabled:opacity-50 dark:hover:text-gray-300"
              title={t('designer.chat.clear', "Effacer l'historique")}
              aria-label={t('designer.chat.clear', "Effacer l'historique")}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="kx-focus rounded p-1.5 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
              title={t('common.close', 'Fermer')}
              aria-label={t('common.close', 'Fermer')}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </>
      }
      messages={messages.map((m) => ({ role: m.role, content: m.content }))}
      renderMessageExtra={(_msg, idx) => {
        const source = messages[idx];
        if (!source?.toolUse?.length) {
          return null;
        }
        return (
          <div className="space-y-2">
            {source.toolUse.map((tool, toolIdx) => (
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
        );
      }}
      emptyState={
        <div className="flex h-full flex-col items-center justify-center gap-4 py-6">
          <div className="text-center">
            <MessageSquare
              className="mx-auto mb-2 h-9 w-9 text-gray-300 dark:text-gray-600"
              aria-hidden
            />
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {t('designer.chat.placeholder', 'Posez une question sur votre cuisine...')}
            </p>
          </div>
          <div className="flex max-w-sm flex-wrap justify-center gap-2">
            {quickSuggestions.map((suggestion) => (
              <button
                type="button"
                key={suggestion}
                onClick={() => handleQuickSuggestion(suggestion)}
                disabled={!engine || isStreaming}
                className="kx-focus rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700/60 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      }
      busy={isStreaming}
      error={error && !dismissedError ? error : null}
      onDismissError={() => setDismissedError(true)}
      footer={
        voiceCommandToast ? (
          <p className="flex-shrink-0 border-t border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
            {t('designer.chat.voiceCommandExecuted', 'Commande vocale executee :')}{' '}
            {voiceCommandToast}
          </p>
        ) : null
      }
      value={input}
      onChange={setInput}
      onSend={handleSend}
      onStop={stopStreaming}
      inputDisabled={!engine || isStreaming}
      inputPlaceholder={t('designer.chat.inputPlaceholder', 'Ecrivez votre message...')}
      inputActions={
        voiceSupported ? (
          <button
            type="button"
            onClick={toggleVoiceInput}
            disabled={!engine || isStreaming}
            className={`kx-focus flex-shrink-0 rounded-xl p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              isListening
                ? 'bg-rose-100 text-rose-500 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
            }`}
            title={isListening ? t('chat.listening', 'Ecoute...') : t('chat.voiceInput', 'Dictee')}
            aria-label={
              isListening ? t('chat.listening', 'Ecoute...') : t('chat.voiceInput', 'Dictee')
            }
            aria-pressed={isListening}
          >
            {isListening ? (
              <MicOff className="h-5 w-5 animate-pulse motion-reduce:animate-none" aria-hidden />
            ) : (
              <Mic className="h-5 w-5" aria-hidden />
            )}
          </button>
        ) : null
      }
    />
  );
}
