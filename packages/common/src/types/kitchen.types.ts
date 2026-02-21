import { BaseEntity, ID } from './base.types';

export type KitchenShape = 'L' | 'U' | 'I' | 'G' | 'island' | 'peninsula';
export type KitchenStyle = 'modern' | 'classic' | 'industrial' | 'scandinavian' | 'rustic' | 'minimalist';
export type RoomType = 'open' | 'closed' | 'semi-open';

export interface KitchenDimensions {
  width: number;
  length: number;
  height: number;
  unit: 'mm' | 'cm' | 'm' | 'ft' | 'in';
}

export interface KitchenProject extends BaseEntity {
  userId: ID;
  name: string;
  description?: string | null;
  shape: KitchenShape;
  style: KitchenStyle;
  roomType: RoomType;
  dimensions: KitchenDimensions;
  budget?: number | null;
  currency?: string;
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  thumbnailUrl?: string | null;
  modelData?: KitchenModel3D | null;
  appliances: ApplianceSelection[];
  furniture: FurnitureSelection[];
}

export interface KitchenModel3D {
  version: string;
  scene: Record<string, unknown>;
  camera: {
    position: [number, number, number];
    target: [number, number, number];
  };
  objects: Object3D[];
}

export interface Object3D {
  id: ID;
  type: 'appliance' | 'furniture' | 'wall' | 'floor' | 'ceiling' | 'custom';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  modelUrl?: string;
  textureUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface ApplianceSelection {
  id: ID;
  catalogId: ID;
  providerId: string;
  category: string;
  name: string;
  brand: string;
  model: string;
  price: number;
  currency: string;
  position?: [number, number, number];
  quantity: number;
}

export interface FurnitureSelection {
  id: ID;
  catalogId: ID;
  providerId: string;
  category: string;
  name: string;
  brand: string;
  dimensions: {
    width: number;
    depth: number;
    height: number;
  };
  price: number;
  currency: string;
  position?: [number, number, number];
  quantity: number;
}

export interface DesignPreferences {
  budget?: number;
  currency?: string;
  preferredBrands?: string[];
  colorScheme?: string[];
  materials?: string[];
  features?: string[];
}
