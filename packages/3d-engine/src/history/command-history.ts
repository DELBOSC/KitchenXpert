import * as THREE from 'three';
import type { TechnicalConstraints, TechnicalPoint } from '../technical/technical-constraints';

/**
 * Interface pour une commande reversible (Command Pattern)
 */
export interface Command {
  execute(): void;
  undo(): void;
  readonly description: string;
}

/**
 * Gestionnaire d'historique de commandes (Undo/Redo)
 */
export class CommandHistory {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxHistory: number;
  private onChange?: () => void;
  private lastCommandTime: number = 0;
  private lastBatchKey: string | null = null;
  private batchTimeout: number = 500; // 500ms window for batching

  constructor(maxHistory: number = 100) {
    this.maxHistory = maxHistory;
  }

  execute(command: Command): void {
    command.execute();
    this.undoStack.push(command);
    this.redoStack = [];

    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }

    this.onChange?.();
  }

  /**
   * Execute a command, merging with the previous command when:
   * - The same batchKey is provided
   * - The time since the last command is within the batch window (500ms)
   *
   * This prevents filling the undo stack with dozens of micro-moves when
   * the user drags an object. The original "undo" from the first command
   * in the batch is preserved so that undo returns to the position before
   * the drag started.
   */
  executeWithBatch(command: Command, batchKey?: string): void {
    const now = Date.now();

    if (
      batchKey &&
      this.lastBatchKey === batchKey &&
      now - this.lastCommandTime < this.batchTimeout &&
      this.undoStack.length > 0
    ) {
      // Keep the previous command's undo (original state) but execute the new command
      const last = this.undoStack[this.undoStack.length - 1]!;
      command.execute();

      // Replace the stack entry: keep original undo, use new execute & description
      this.undoStack[this.undoStack.length - 1] = {
        execute: () => command.execute(),
        undo: () => last.undo(),
        description: command.description,
      };

      this.redoStack = [];
      this.lastCommandTime = now;
      this.onChange?.();
      return;
    }

    // Normal execution path
    this.execute(command);
    this.lastCommandTime = now;
    this.lastBatchKey = batchKey ?? null;
  }

  /**
   * Set the batch timeout window in milliseconds (default 500).
   */
  setBatchTimeout(ms: number): void {
    this.batchTimeout = ms;
  }

  undo(): void {
    const command = this.undoStack.pop();
    if (command) {
      command.undo();
      this.redoStack.push(command);
      this.onChange?.();
    }
  }

  redo(): void {
    const command = this.redoStack.pop();
    if (command) {
      command.execute();
      this.undoStack.push(command);
      this.onChange?.();
    }
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get undoDescription(): string | undefined {
    return this.undoStack[this.undoStack.length - 1]?.description;
  }

  get redoDescription(): string | undefined {
    return this.redoStack[this.redoStack.length - 1]?.description;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.onChange?.();
  }

  onChangeCallback(callback: () => void): void {
    this.onChange = callback;
  }
}

/**
 * Commande : Ajouter un objet a la scene
 */
export class AddObjectCommand implements Command {
  readonly description: string;

  constructor(
    private scene: THREE.Scene,
    private object: THREE.Object3D,
    private objectMap: Map<string, THREE.Object3D>,
    private collisionAdd?: (obj: THREE.Object3D) => void,
    private collisionRemove?: (obj: THREE.Object3D) => void
  ) {
    this.description = `Ajouter ${object.userData.type || 'objet'}`;
  }

  execute(): void {
    this.scene.add(this.object);
    const id = this.object.userData.id as string;
    if (id) {
      this.objectMap.set(id, this.object);
    }
    this.collisionAdd?.(this.object);
  }

  undo(): void {
    this.scene.remove(this.object);
    const id = this.object.userData.id as string;
    if (id) {
      this.objectMap.delete(id);
    }
    this.collisionRemove?.(this.object);
  }
}

/**
 * Commande : Supprimer un objet de la scene
 */
export class RemoveObjectCommand implements Command {
  readonly description: string;

  constructor(
    private scene: THREE.Scene,
    private object: THREE.Object3D,
    private objectMap: Map<string, THREE.Object3D>,
    private collisionAdd?: (obj: THREE.Object3D) => void,
    private collisionRemove?: (obj: THREE.Object3D) => void
  ) {
    this.description = `Supprimer ${object.userData.type || 'objet'}`;
  }

  execute(): void {
    this.scene.remove(this.object);
    const id = this.object.userData.id as string;
    if (id) {
      this.objectMap.delete(id);
    }
    this.collisionRemove?.(this.object);
  }

  undo(): void {
    this.scene.add(this.object);
    const id = this.object.userData.id as string;
    if (id) {
      this.objectMap.set(id, this.object);
    }
    this.collisionAdd?.(this.object);
  }
}

/**
 * Commande : Deplacer un objet
 */
export class MoveObjectCommand implements Command {
  readonly description = 'Deplacer objet';

  constructor(
    private object: THREE.Object3D,
    private oldPosition: THREE.Vector3,
    private newPosition: THREE.Vector3
  ) {}

  execute(): void {
    this.object.position.copy(this.newPosition);
  }

  undo(): void {
    this.object.position.copy(this.oldPosition);
  }
}

/**
 * Commande : Rotation d'un objet
 */
export class RotateObjectCommand implements Command {
  readonly description = 'Tourner objet';

  constructor(
    private object: THREE.Object3D,
    private oldRotation: THREE.Euler,
    private newRotation: THREE.Euler
  ) {}

  execute(): void {
    this.object.rotation.copy(this.newRotation);
  }

  undo(): void {
    this.object.rotation.copy(this.oldRotation);
  }
}

/**
 * Commande : Changement d'echelle
 */
export class ScaleObjectCommand implements Command {
  readonly description = 'Redimensionner objet';

  constructor(
    private object: THREE.Object3D,
    private oldScale: THREE.Vector3,
    private newScale: THREE.Vector3
  ) {}

  execute(): void {
    this.object.scale.copy(this.newScale);
  }

  undo(): void {
    this.object.scale.copy(this.oldScale);
  }
}

/**
 * Commande : Changement de propriete
 */
export class ChangePropertyCommand implements Command {
  readonly description: string;

  constructor(
    private object: THREE.Object3D,
    private property: string,
    private oldValue: unknown,
    private newValue: unknown
  ) {
    this.description = `Modifier ${property}`;
  }

  execute(): void {
    this.setNestedProperty(
      this.object as unknown as Record<string, unknown>,
      this.property,
      this.newValue
    );
  }

  undo(): void {
    this.setNestedProperty(
      this.object as unknown as Record<string, unknown>,
      this.property,
      this.oldValue
    );
  }

  private setNestedProperty(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]!] as Record<string, unknown>;
    }
    current[keys[keys.length - 1]!] = value;
  }
}

/**
 * Commande : Groupe de commandes (batch)
 */
export class BatchCommand implements Command {
  readonly description: string;

  constructor(
    private commands: Command[],
    description?: string
  ) {
    this.description = description || `Batch (${commands.length} actions)`;
  }

  execute(): void {
    for (const cmd of this.commands) {
      cmd.execute();
    }
  }

  undo(): void {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i]!.undo();
    }
  }
}

/**
 * Commande : Ajouter un point technique
 */
export class AddTechnicalPointCommand implements Command {
  readonly description: string;

  constructor(
    private constraints: TechnicalConstraints,
    private point: TechnicalPoint
  ) {
    this.description = `Ajouter point ${point.subtype}`;
  }

  execute(): void {
    this.constraints.addPoint(this.point);
  }

  undo(): void {
    this.constraints.removePoint(this.point.id);
  }
}

/**
 * Commande : Supprimer un point technique
 */
export class RemoveTechnicalPointCommand implements Command {
  readonly description: string;

  constructor(
    private constraints: TechnicalConstraints,
    private point: TechnicalPoint
  ) {
    this.description = `Supprimer point ${point.subtype}`;
  }

  execute(): void {
    this.constraints.removePoint(this.point.id);
  }

  undo(): void {
    this.constraints.addPoint(this.point);
  }
}

/**
 * Commande : Deplacer un point technique
 */
export class MoveTechnicalPointCommand implements Command {
  readonly description = 'Deplacer point technique';

  constructor(
    private constraints: TechnicalConstraints,
    private pointId: string,
    private oldPosition: THREE.Vector3,
    private newPosition: THREE.Vector3
  ) {}

  execute(): void {
    this.constraints.updatePoint(this.pointId, { position: this.newPosition.clone() });
  }

  undo(): void {
    this.constraints.updatePoint(this.pointId, { position: this.oldPosition.clone() });
  }
}
