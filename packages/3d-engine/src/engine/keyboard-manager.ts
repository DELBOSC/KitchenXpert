import type { TransformMode } from '../interaction/controls';

/**
 * Actions clavier disponibles dans le moteur 3D
 */
export type ShortcutAction =
  | 'undo'
  | 'redo'
  | 'delete'
  | 'duplicate'
  | 'copy'
  | 'paste'
  | 'mode_translate'
  | 'mode_rotate'
  | 'mode_scale'
  | 'deselect'
  | 'snap_toggle'
  | 'view_top'
  | 'view_front'
  | 'view_right'
  | 'view_left'
  | 'view_back'
  | 'nudge_left'
  | 'nudge_right'
  | 'nudge_forward'
  | 'nudge_backward';

/**
 * Definition d'un raccourci clavier
 */
export interface KeyBinding {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: ShortcutAction;
}

/**
 * Gestionnaire de raccourcis clavier pour le moteur 3D
 *
 * Fournit un systeme extensible de raccourcis clavier avec des bindings par defaut
 * pour les operations courantes (undo, redo, suppression, modes de transformation, etc.)
 *
 * Ignore automatiquement les raccourcis quand l'utilisateur est dans un input/textarea.
 */
export class KeyboardManager {
  private bindings: KeyBinding[];
  private listeners: Map<ShortcutAction, (() => void)[]> = new Map();
  private enabled: boolean = true;
  private handler: (e: KeyboardEvent) => void;
  private target: EventTarget;

  constructor(target: HTMLElement | Window = window) {
    this.target = target;
    this.bindings = this.getDefaultBindings();
    this.handler = this.handleKeyDown.bind(this);
    this.target.addEventListener('keydown', this.handler as EventListener);
  }

  /**
   * Bindings par defaut couvrant les raccourcis standards d'edition 3D
   */
  private getDefaultBindings(): KeyBinding[] {
    return [
      // History
      { key: 'z', ctrl: true, action: 'undo' },
      { key: 'y', ctrl: true, action: 'redo' },
      { key: 'z', ctrl: true, shift: true, action: 'redo' },

      // Object operations
      { key: 'Delete', action: 'delete' },
      { key: 'Backspace', action: 'delete' },
      { key: 'd', ctrl: true, action: 'duplicate' },
      { key: 'c', ctrl: true, action: 'copy' },
      { key: 'v', ctrl: true, action: 'paste' },

      // Transform modes
      { key: 't', action: 'mode_translate' },
      { key: 'r', action: 'mode_rotate' },
      { key: 's', action: 'mode_scale' },

      // Selection
      { key: 'Escape', action: 'deselect' },

      // Snap
      { key: 'g', action: 'snap_toggle' },

      // Camera views
      { key: '1', action: 'view_top' },
      { key: '2', action: 'view_front' },
      { key: '3', action: 'view_right' },
      { key: '4', action: 'view_left' },
      { key: '5', action: 'view_back' },

      // Nudge (arrow keys)
      { key: 'ArrowLeft', action: 'nudge_left' },
      { key: 'ArrowRight', action: 'nudge_right' },
      { key: 'ArrowUp', action: 'nudge_forward' },
      { key: 'ArrowDown', action: 'nudge_backward' },
    ];
  }

  /**
   * Gere un evenement keydown et dispatche aux listeners enregistres
   */
  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.enabled) return;

    // Ne pas intercepter si l'utilisateur tape dans un champ de saisie
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      return;

    // Trouver le binding correspondant
    // Pour les raccourcis avec Ctrl+Shift (ex: Ctrl+Shift+Z = redo), on doit matcher exactement
    const binding = this.bindings.find(
      (b) =>
        b.key.toLowerCase() === e.key.toLowerCase() &&
        !!b.ctrl === (e.ctrlKey || e.metaKey) &&
        !!b.shift === e.shiftKey &&
        !!b.alt === e.altKey
    );

    if (binding) {
      e.preventDefault();
      const callbacks = this.listeners.get(binding.action);
      if (callbacks) {
        callbacks.forEach((cb) => {
          try {
            cb();
          } catch (err) {
            console.error(`[KeyboardManager] Error in ${binding.action} handler:`, err);
          }
        });
      }
    }
  }

  /**
   * Enregistre un callback pour une action
   */
  on(action: ShortcutAction, callback: () => void): void {
    const existing = this.listeners.get(action) || [];
    existing.push(callback);
    this.listeners.set(action, existing);
  }

  /**
   * Supprime un callback pour une action
   */
  off(action: ShortcutAction, callback: () => void): void {
    const existing = this.listeners.get(action) || [];
    this.listeners.set(
      action,
      existing.filter((cb) => cb !== callback)
    );
  }

  /**
   * Active ou desactive le gestionnaire de raccourcis
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Retourne si le gestionnaire est actif
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Remplace les bindings par un nouveau jeu de raccourcis
   */
  setBindings(bindings: KeyBinding[]): void {
    this.bindings = bindings;
  }

  /**
   * Ajoute un binding supplementaire
   */
  addBinding(binding: KeyBinding): void {
    this.bindings.push(binding);
  }

  /**
   * Supprime tous les bindings pour une action donnee
   */
  removeBindingsForAction(action: ShortcutAction): void {
    this.bindings = this.bindings.filter((b) => b.action !== action);
  }

  /**
   * Retourne les bindings actuels
   */
  getBindings(): ReadonlyArray<KeyBinding> {
    return this.bindings;
  }

  /**
   * Retourne le label de raccourci pour l'affichage UI (ex: "Ctrl+Z")
   */
  getShortcutLabel(action: ShortcutAction): string | null {
    const binding = this.bindings.find((b) => b.action === action);
    if (!binding) return null;

    const parts: string[] = [];
    if (binding.ctrl) parts.push('Ctrl');
    if (binding.shift) parts.push('Shift');
    if (binding.alt) parts.push('Alt');

    // Formate la touche pour l'affichage
    const keyDisplay = binding.key.length === 1 ? binding.key.toUpperCase() : binding.key;
    parts.push(keyDisplay);

    return parts.join('+');
  }

  /**
   * Nettoie les ressources
   */
  dispose(): void {
    this.target.removeEventListener('keydown', this.handler as EventListener);
    this.listeners.clear();
  }
}

/**
 * Map ShortcutAction vers TransformMode pour les modes de transformation
 */
export function shortcutToTransformMode(action: ShortcutAction): TransformMode | null {
  switch (action) {
    case 'mode_translate':
      return 'translate';
    case 'mode_rotate':
      return 'rotate';
    case 'mode_scale':
      return 'scale';
    default:
      return null;
  }
}
