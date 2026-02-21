import * as THREE from 'three';

/**
 * Definition d'un materiau cuisine
 */
export interface KitchenMaterial {
  id: string;
  name: string;
  type: 'wood' | 'stone' | 'metal' | 'laminate' | 'glass' | 'ceramic';
  color: string;
  roughness: number;
  metalness: number;
  normalMapUrl?: string;
  aoMapUrl?: string;
  previewUrl?: string;
}

/**
 * Materiaux pre-definis pour les cuisines
 */
export const KITCHEN_MATERIALS: KitchenMaterial[] = [
  // Bois
  { id: 'wood-oak', name: 'Chêne naturel', type: 'wood', color: '#D4A574', roughness: 0.75, metalness: 0.05 },
  { id: 'wood-walnut', name: 'Noyer', type: 'wood', color: '#5D4037', roughness: 0.7, metalness: 0.05 },
  { id: 'wood-maple', name: 'Érable', type: 'wood', color: '#E8D4B8', roughness: 0.7, metalness: 0.05 },
  { id: 'wood-birch', name: 'Bouleau', type: 'wood', color: '#DCC8A0', roughness: 0.75, metalness: 0.05 },
  { id: 'wood-ash', name: 'Frêne', type: 'wood', color: '#C8B896', roughness: 0.72, metalness: 0.05 },
  { id: 'wood-wenge', name: 'Wengé', type: 'wood', color: '#3E2723', roughness: 0.68, metalness: 0.08 },

  // Pierres
  { id: 'stone-white-marble', name: 'Marbre blanc', type: 'stone', color: '#F5F5F5', roughness: 0.15, metalness: 0.05 },
  { id: 'stone-granite', name: 'Granite gris', type: 'stone', color: '#696969', roughness: 0.6, metalness: 0.1 },
  { id: 'stone-quartz-white', name: 'Quartz blanc', type: 'stone', color: '#E8E8E8', roughness: 0.2, metalness: 0.05 },
  { id: 'stone-quartz-black', name: 'Quartz noir', type: 'stone', color: '#1A1A1A', roughness: 0.2, metalness: 0.08 },
  { id: 'stone-slate', name: 'Ardoise', type: 'stone', color: '#2F4F4F', roughness: 0.75, metalness: 0.05 },

  // Metaux
  { id: 'metal-stainless', name: 'Inox brossé', type: 'metal', color: '#C0C0C0', roughness: 0.35, metalness: 0.9 },
  { id: 'metal-brass', name: 'Laiton', type: 'metal', color: '#B5A642', roughness: 0.3, metalness: 0.85 },
  { id: 'metal-copper', name: 'Cuivre', type: 'metal', color: '#B87333', roughness: 0.3, metalness: 0.85 },
  { id: 'metal-black', name: 'Métal noir mat', type: 'metal', color: '#1A1A1A', roughness: 0.7, metalness: 0.8 },

  // Stratifies / Laque
  { id: 'laminate-white', name: 'Blanc laqué', type: 'laminate', color: '#FFFFFF', roughness: 0.1, metalness: 0.05 },
  { id: 'laminate-cream', name: 'Crème', type: 'laminate', color: '#FFF8E7', roughness: 0.15, metalness: 0.05 },
  { id: 'laminate-grey', name: 'Gris anthracite', type: 'laminate', color: '#3D3D3D', roughness: 0.2, metalness: 0.05 },
  { id: 'laminate-navy', name: 'Bleu marine', type: 'laminate', color: '#1B2A4A', roughness: 0.2, metalness: 0.05 },
  { id: 'laminate-sage', name: 'Vert sauge', type: 'laminate', color: '#9CAF88', roughness: 0.25, metalness: 0.05 },

  // Verre
  { id: 'glass-clear', name: 'Verre transparent', type: 'glass', color: '#E0F0FF', roughness: 0.05, metalness: 0.1 },
  { id: 'glass-frosted', name: 'Verre dépoli', type: 'glass', color: '#F0F0F0', roughness: 0.5, metalness: 0.05 },

  // Ceramique
  { id: 'ceramic-white', name: 'Céramique blanche', type: 'ceramic', color: '#FAFAFA', roughness: 0.3, metalness: 0.05 },
  { id: 'ceramic-terracotta', name: 'Terre cuite', type: 'ceramic', color: '#C67240', roughness: 0.7, metalness: 0.05 },
];

/**
 * Bibliotheque de materiaux — conversion KitchenMaterial → THREE.MeshStandardMaterial
 */
export class MaterialLibrary {
  private materialCache: Map<string, THREE.MeshStandardMaterial> = new Map();
  private textureLoader: THREE.TextureLoader = new THREE.TextureLoader();

  /**
   * Recupere un materiau Three.js depuis un KitchenMaterial
   */
  getMaterial(kitchen: KitchenMaterial): THREE.MeshStandardMaterial {
    const cached = this.materialCache.get(kitchen.id);
    if (cached) return cached;

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(kitchen.color),
      roughness: kitchen.roughness,
      metalness: kitchen.metalness,
    });

    // Transparence pour le verre
    if (kitchen.type === 'glass') {
      mat.transparent = true;
      mat.opacity = 0.6;
    }

    this.materialCache.set(kitchen.id, mat);
    return mat;
  }

  /**
   * Recupere un materiau avec textures chargees
   */
  async getMaterialWithTextures(kitchen: KitchenMaterial): Promise<THREE.MeshStandardMaterial> {
    const mat = this.getMaterial(kitchen);

    if (kitchen.normalMapUrl) {
      try {
        const normalMap = await this.loadTexture(kitchen.normalMapUrl);
        mat.normalMap = normalMap;
        mat.needsUpdate = true;
      } catch {
        // Texture optionnelle
      }
    }

    if (kitchen.aoMapUrl) {
      try {
        const aoMap = await this.loadTexture(kitchen.aoMapUrl);
        mat.aoMap = aoMap;
        mat.needsUpdate = true;
      } catch {
        // Texture optionnelle
      }
    }

    return mat;
  }

  /**
   * Applique un materiau a un objet 3D
   */
  applyMaterial(object: THREE.Object3D, material: KitchenMaterial): void {
    const threeMat = this.getMaterial(material);

    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = threeMat.clone();
      }
    });
  }

  /**
   * Retourne les materiaux par type
   */
  getMaterialsByType(type: KitchenMaterial['type']): KitchenMaterial[] {
    return KITCHEN_MATERIALS.filter((m) => m.type === type);
  }

  /**
   * Recherche un materiau par ID
   */
  findById(id: string): KitchenMaterial | undefined {
    return KITCHEN_MATERIALS.find((m) => m.id === id);
  }

  /**
   * Dispose tous les materiaux en cache
   */
  dispose(): void {
    for (const mat of this.materialCache.values()) {
      mat.dispose();
      mat.normalMap?.dispose();
      mat.aoMap?.dispose();
      mat.map?.dispose();
    }
    this.materialCache.clear();
  }

  private loadTexture(url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(url, resolve, undefined, reject);
    });
  }
}
