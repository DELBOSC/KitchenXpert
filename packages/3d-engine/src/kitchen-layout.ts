import * as THREE from 'three';
import { KitchenShape, KitchenDimensions } from '@kitchenxpert/common';

/**
 * Point d'ancrage pour placement d'objets
 */
export interface AnchorPoint {
  position: THREE.Vector3;
  normal: THREE.Vector3; // Direction normale au mur
  wallId: string;
  type: 'wall' | 'corner' | 'island';
}

/**
 * Résultat de génération de layout
 */
export interface KitchenLayoutResult {
  walls: THREE.Mesh[];
  floor: THREE.Mesh;
  ceiling?: THREE.Mesh;
  anchorPoints: AnchorPoint[];
  workingZone?: THREE.Box3; // Zone de travail principale
}

/**
 * Générateur de layout de cuisine
 * Crée les structures 3D selon la forme choisie (L, U, I, G, island, peninsula)
 */
export class KitchenLayoutGenerator {
  private wallHeight: number = 2.5; // 2.5m de hauteur standard
  private wallThickness: number = 0.15; // 15cm d'épaisseur de mur

  /**
   * Génère un layout de cuisine complet
   */
  generateLayout(shape: KitchenShape, dimensions: KitchenDimensions): KitchenLayoutResult {
    // Convertir les dimensions en mètres
    const width = this.convertToMeters(dimensions.width, dimensions.unit);
    const depth = this.convertToMeters(dimensions.length, dimensions.unit);
    const height = this.convertToMeters(dimensions.height, dimensions.unit) || this.wallHeight;

    this.wallHeight = height;

    switch (shape) {
      case 'L':
        return this.generateLShape(width, depth);
      case 'U':
        return this.generateUShape(width, depth);
      case 'I':
        return this.generateIShape(width, depth);
      case 'G':
        return this.generateGShape(width, depth);
      case 'island':
        return this.generateIslandShape(width, depth);
      case 'peninsula':
        return this.generatePeninsulaShape(width, depth);
      default:
        return this.generateIShape(width, depth);
    }
  }

  /**
   * Cuisine en forme de I (une seule paroi)
   */
  private generateIShape(width: number, depth: number): KitchenLayoutResult {
    const walls: THREE.Mesh[] = [];
    const anchorPoints: AnchorPoint[] = [];

    // Mur principal du fond
    const backWall = this.createWall(width, this.wallHeight, this.wallThickness);
    backWall.position.set(0, this.wallHeight / 2, -depth / 2);
    backWall.userData = { type: 'wall', wallId: 'back' };
    walls.push(backWall);

    // Points d'ancrage le long du mur pour placer les meubles
    const numAnchors = Math.floor(width / 0.6); // Un point tous les 60cm
    for (let i = 0; i < numAnchors; i++) {
      const x = -width / 2 + i * (width / numAnchors) + width / numAnchors / 2;
      anchorPoints.push({
        position: new THREE.Vector3(x, 0, -depth / 2 + 0.6), // 60cm devant le mur
        normal: new THREE.Vector3(0, 0, 1), // Pointe vers l'avant
        wallId: 'back',
        type: 'wall',
      });
    }

    // Sol
    const floor = this.createFloor(width, depth);

    return { walls, floor, anchorPoints };
  }

  /**
   * Cuisine en forme de L (deux parois perpendiculaires)
   */
  private generateLShape(width: number, depth: number): KitchenLayoutResult {
    const walls: THREE.Mesh[] = [];
    const anchorPoints: AnchorPoint[] = [];

    // Mur du fond
    const backWall = this.createWall(width, this.wallHeight, this.wallThickness);
    backWall.position.set(0, this.wallHeight / 2, -depth / 2);
    backWall.userData = { type: 'wall', wallId: 'back' };
    walls.push(backWall);

    // Mur de gauche
    const leftWall = this.createWall(depth, this.wallHeight, this.wallThickness);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-width / 2, this.wallHeight / 2, 0);
    leftWall.userData = { type: 'wall', wallId: 'left' };
    walls.push(leftWall);

    // Points d'ancrage mur du fond
    const numAnchorsBack = Math.floor(width / 0.6);
    for (let i = 0; i < numAnchorsBack; i++) {
      const x = -width / 2 + i * (width / numAnchorsBack) + width / numAnchorsBack / 2;
      anchorPoints.push({
        position: new THREE.Vector3(x, 0, -depth / 2 + 0.6),
        normal: new THREE.Vector3(0, 0, 1),
        wallId: 'back',
        type: 'wall',
      });
    }

    // Points d'ancrage mur de gauche
    const numAnchorsLeft = Math.floor(depth / 0.6);
    for (let i = 0; i < numAnchorsLeft; i++) {
      const z = -depth / 2 + i * (depth / numAnchorsLeft) + depth / numAnchorsLeft / 2;
      anchorPoints.push({
        position: new THREE.Vector3(-width / 2 + 0.6, 0, z),
        normal: new THREE.Vector3(1, 0, 0),
        wallId: 'left',
        type: 'wall',
      });
    }

    // Point d'ancrage au coin (important pour le L)
    anchorPoints.push({
      position: new THREE.Vector3(-width / 2 + 0.6, 0, -depth / 2 + 0.6),
      normal: new THREE.Vector3(0.707, 0, 0.707), // 45° angle
      wallId: 'corner',
      type: 'corner',
    });

    const floor = this.createFloor(width, depth);

    return { walls, floor, anchorPoints };
  }

  /**
   * Cuisine en forme de U (trois parois)
   */
  private generateUShape(width: number, depth: number): KitchenLayoutResult {
    const walls: THREE.Mesh[] = [];
    const anchorPoints: AnchorPoint[] = [];

    // Mur du fond
    const backWall = this.createWall(width, this.wallHeight, this.wallThickness);
    backWall.position.set(0, this.wallHeight / 2, -depth / 2);
    backWall.userData = { type: 'wall', wallId: 'back' };
    walls.push(backWall);

    // Mur de gauche
    const leftWall = this.createWall(depth, this.wallHeight, this.wallThickness);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-width / 2, this.wallHeight / 2, 0);
    leftWall.userData = { type: 'wall', wallId: 'left' };
    walls.push(leftWall);

    // Mur de droite
    const rightWall = this.createWall(depth, this.wallHeight, this.wallThickness);
    rightWall.rotation.y = Math.PI / 2;
    rightWall.position.set(width / 2, this.wallHeight / 2, 0);
    rightWall.userData = { type: 'wall', wallId: 'right' };
    walls.push(rightWall);

    // Ancres mur du fond
    const numAnchorsBack = Math.floor(width / 0.6);
    for (let i = 0; i < numAnchorsBack; i++) {
      const x = -width / 2 + i * (width / numAnchorsBack) + width / numAnchorsBack / 2;
      anchorPoints.push({
        position: new THREE.Vector3(x, 0, -depth / 2 + 0.6),
        normal: new THREE.Vector3(0, 0, 1),
        wallId: 'back',
        type: 'wall',
      });
    }

    // Ancres mur de gauche
    const numAnchorsLeft = Math.floor(depth / 0.6);
    for (let i = 0; i < numAnchorsLeft; i++) {
      const z = -depth / 2 + i * (depth / numAnchorsLeft) + depth / numAnchorsLeft / 2;
      anchorPoints.push({
        position: new THREE.Vector3(-width / 2 + 0.6, 0, z),
        normal: new THREE.Vector3(1, 0, 0),
        wallId: 'left',
        type: 'wall',
      });
    }

    // Ancres mur de droite
    for (let i = 0; i < numAnchorsLeft; i++) {
      const z = -depth / 2 + i * (depth / numAnchorsLeft) + depth / numAnchorsLeft / 2;
      anchorPoints.push({
        position: new THREE.Vector3(width / 2 - 0.6, 0, z),
        normal: new THREE.Vector3(-1, 0, 0),
        wallId: 'right',
        type: 'wall',
      });
    }

    const floor = this.createFloor(width, depth);

    return { walls, floor, anchorPoints };
  }

  /**
   * Cuisine en forme de G (U avec péninsule)
   */
  private generateGShape(width: number, depth: number): KitchenLayoutResult {
    // Base en U
    const result = this.generateUShape(width, depth);

    // Ajouter une péninsule (barre)
    const peninsulaWidth = width * 0.4;
    const peninsula = this.createWall(peninsulaWidth, 0.9, 0.6); // Barre à hauteur de comptoir
    peninsula.position.set(width / 2 - peninsulaWidth / 2, 0.45, depth / 4);
    peninsula.userData = { type: 'peninsula', wallId: 'peninsula' };
    result.walls.push(peninsula);

    // Ancres sur la péninsule
    result.anchorPoints.push({
      position: new THREE.Vector3(width / 2 - peninsulaWidth / 2, 0, depth / 4 - 0.3),
      normal: new THREE.Vector3(0, 0, 1),
      wallId: 'peninsula',
      type: 'wall',
    });

    return result;
  }

  /**
   * Cuisine avec îlot central
   */
  private generateIslandShape(width: number, depth: number): KitchenLayoutResult {
    // Base en I
    const result = this.generateIShape(width, depth);

    // Ajouter un îlot au centre
    const islandWidth = Math.min(width * 0.3, 2.0);
    const islandDepth = Math.min(depth * 0.2, 1.2);
    const island = this.createWall(islandWidth, 0.9, islandDepth);
    island.position.set(0, 0.45, 0);
    island.userData = { type: 'island', wallId: 'island' };
    result.walls.push(island);

    // Ancres sur l'îlot (4 côtés)
    result.anchorPoints.push(
      // Côté face à l'utilisateur
      {
        position: new THREE.Vector3(0, 0, islandDepth / 2 + 0.3),
        normal: new THREE.Vector3(0, 0, -1),
        wallId: 'island',
        type: 'island',
      },
      // Côté opposé
      {
        position: new THREE.Vector3(0, 0, -islandDepth / 2 - 0.3),
        normal: new THREE.Vector3(0, 0, 1),
        wallId: 'island',
        type: 'island',
      }
    );

    return result;
  }

  /**
   * Cuisine avec péninsule
   */
  private generatePeninsulaShape(width: number, depth: number): KitchenLayoutResult {
    // Base en L
    const result = this.generateLShape(width, depth);

    // Ajouter une péninsule
    const peninsulaLength = depth * 0.5;
    const peninsula = this.createWall(peninsulaLength, 0.9, 0.6);
    peninsula.rotation.y = Math.PI / 2;
    peninsula.position.set(width / 4, 0.45, depth / 4);
    peninsula.userData = { type: 'peninsula', wallId: 'peninsula' };
    result.walls.push(peninsula);

    return result;
  }

  /**
   * Crée un mur
   */
  private createWall(width: number, height: number, thickness: number): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(width, height, thickness);
    const material = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      roughness: 0.8,
      metalness: 0.2,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  /**
   * Crée un sol
   */
  private createFloor(width: number, depth: number): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(width, depth);
    const material = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.6,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    mesh.userData = { type: 'floor' };
    return mesh;
  }

  /**
   * Convertit une dimension en mètres
   */
  private convertToMeters(value: number, unit: string): number {
    switch (unit) {
      case 'mm':
        return value / 1000;
      case 'cm':
        return value / 100;
      case 'm':
        return value;
      case 'ft':
        return value * 0.3048;
      case 'in':
        return value * 0.0254;
      default:
        return value;
    }
  }
}
