# KitchenXpert 3D Engine

Moteur de visualisation 3D basé sur Three.js pour la conception interactive de
cuisines.

## 🎯 Fonctionnalités Implémentées

### ✅ Architecture de base

- Gestion de scène 3D complète
- Système de caméra avec 4 presets (Top, Isometric, Front, Perspective)
- Renderer WebGL optimisé avec ombres et tone mapping
- Système d'éclairage réaliste (ambient + directional + hemisphere)

### ✅ Génération de layouts de cuisine

- **6 formes supportées** : L, U, I, G, Island, Peninsula
- Génération automatique des murs, sol
- **Points d'ancrage intelligents** pour placement d'objets
- Conversion automatique des unités (mm, cm, m, ft, in)

### ✅ Système de collision et contraintes

- Détection de collision entre objets (Box3)
- Contraintes de placement configurables
- **Snap-to-grid** automatique
- Recherche de position valide la plus proche

### ✅ Manipulation d'objets

- **Drag & drop** avec validation de collision
- Rotation et échelle
- Sélection avec surbrillance
- Duplication et suppression

## 📦 Installation

```bash
pnpm install
```

## 🚀 Utilisation Rapide

```typescript
import { KitchenEngine, CameraPreset } from '@kitchenxpert/3d-engine';

// 1. Créer le moteur
const container = document.getElementById('canvas');
const engine = new KitchenEngine(container);

// 2. Générer un layout en L
const layout = engine.layoutGenerator.generateLayout('L', {
  width: 400,
  length: 300,
  height: 250,
  unit: 'cm',
});

// 3. Ajouter à la scène
layout.walls.forEach((wall, i) => {
  engine.scene.addObject(`wall_${i}`, wall);
  engine.collisionSystem.addCollisionObject(wall);
});
engine.scene.addObject('floor', layout.floor);

// 4. Vue isométrique
engine.camera.applyPreset(CameraPreset.ISOMETRIC, {
  width: 4,
  depth: 3,
});

// 5. Démarrer
engine.start();
```

## 📐 Formes de Cuisine

| Forme         | Description                  | Use Case                  |
| ------------- | ---------------------------- | ------------------------- |
| **I**         | Une paroi                    | Petits espaces, studios   |
| **L**         | Deux parois perpendiculaires | Cuisines moyennes         |
| **U**         | Trois parois                 | Cuisines spacieuses       |
| **G**         | U + péninsule                | Grandes cuisines ouvertes |
| **Island**    | Mur + îlot central           | Cuisines américaines      |
| **Peninsula** | L + péninsule                | Séparation espace         |

## 🎮 Manipulation Interactive

### Drag & Drop avec collision

```typescript
// Mousedown
manipulator.startDrag(intersectionPoint);

// Mousemove
const raycaster = new THREE.Raycaster();
raycaster.setFromCamera(mouse, camera.getThreeCamera());
manipulator.updateDrag(raycaster);

// Mouseup
manipulator.endDrag();
```

### Contraintes automatiques

- ✅ Snap to grid (1cm par défaut)
- ✅ Distance minimale aux murs (5cm)
- ✅ Distance entre objets (2cm)
- ✅ Recherche de position valide si collision

## 📷 Presets de Caméra

```typescript
// Vue du dessus (plan 2D)
camera.applyPreset(CameraPreset.TOP_VIEW, kitchenSize);

// Vue isométrique (recommandé)
camera.applyPreset(CameraPreset.ISOMETRIC, kitchenSize);

// Vue de face
camera.applyPreset(CameraPreset.FRONT, kitchenSize);

// Vue perspective libre
camera.applyPreset(CameraPreset.PERSPECTIVE, kitchenSize);
```

## 🔧 Configuration Avancée

### Éclairage personnalisé

```typescript
const lighting = new KitchenLighting(scene, {
  ambient: { intensity: 0.7 },
  directional: { castShadow: true, intensity: 0.8 },
  hemisphere: { skyColor: 0x87ceeb },
});
```

### Collision personnalisée

```typescript
const collision = new CollisionSystem({
  minDistanceToWall: 0.1, // 10cm
  snapToGrid: true,
  gridSize: 0.05, // 5cm grid
  allowOverlap: false,
});
```

## 📊 Export/Import

```typescript
// Export
const model = scene.toKitchenModel(camera.getPosition(), camera.getTarget());
const json = JSON.stringify(model);

// Import
await scene.fromKitchenModel(JSON.parse(json));
```

## 🎯 Points d'Ancrage

Les layouts génèrent automatiquement des points où placer les objets :

```typescript
layout.anchorPoints.forEach((anchor) => {
  console.log(anchor.type); // 'wall', 'corner', 'island'
  console.log(anchor.position); // Vector3
  console.log(anchor.normal); // Direction de placement
  console.log(anchor.wallId); // Identifiant du mur
});
```

## 🚀 Performance

- ✅ Pixel ratio optimal (max 2x)
- ✅ Ombres optimisées (PCFSoftShadowMap)
- ✅ Dispose automatique des geometries/materials
- ✅ Boucle de rendu avec requestAnimationFrame

## 📝 API Reference

Voir la documentation complète dans
[../../docs/3d-engine/](../../docs/3d-engine/)

## 🤝 Contribution

Voir [../../CONTRIBUTING.md](../../CONTRIBUTING.md)
