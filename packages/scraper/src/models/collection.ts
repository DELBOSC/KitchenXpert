/**
 * Collection/Range Model
 */

import type { Segment } from './brand.js';

export interface Collection {
  id: string;
  brandId: string;

  name: string;
  slug: string;
  description?: string;

  style?: string; // modern, classic, contemporary, etc.
  segment?: Segment;

  launchYear?: number;
  isActive: boolean;
  isFeatured: boolean;

  images: string[];
  url?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCollectionInput {
  brandId: string;
  name: string;
  slug: string;
  description?: string;
  style?: string;
  segment?: Segment;
  launchYear?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  images?: string[];
  url?: string;
}

export interface CollectionWithProducts extends Collection {
  cabinetsCount: number;
  facadesCount: number;
}
