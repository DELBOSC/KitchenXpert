/**
 * Kitchen Model Class
 * Provides methods for working with kitchen project data
 */

import {
  KitchenProject,
  KitchenShape,
  KitchenStyle,
  RoomType,
  KitchenDimensions,
  KitchenModel3D,
  ApplianceSelection,
  FurnitureSelection,
  DesignPreferences,
  ID,
} from '../types';

export interface KitchenCreateInput {
  userId: ID;
  name: string;
  description?: string | null;
  shape: KitchenShape;
  style: KitchenStyle;
  roomType: RoomType;
  dimensions: KitchenDimensions;
  budget?: number | null;
  currency?: string;
}

export interface KitchenUpdateInput {
  name?: string;
  description?: string | null;
  shape?: KitchenShape;
  style?: KitchenStyle;
  roomType?: RoomType;
  dimensions?: KitchenDimensions;
  budget?: number | null;
  currency?: string;
  status?: 'draft' | 'in_progress' | 'completed' | 'archived';
  thumbnailUrl?: string | null;
  modelData?: KitchenModel3D | null;
}

export class KitchenModel implements KitchenProject {
  id: ID;
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
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;

  constructor(data: KitchenProject) {
    this.id = data.id;
    this.userId = data.userId;
    this.name = data.name;
    this.description = data.description;
    this.shape = data.shape;
    this.style = data.style;
    this.roomType = data.roomType;
    this.dimensions = data.dimensions;
    this.budget = data.budget;
    this.currency = data.currency;
    this.status = data.status;
    this.thumbnailUrl = data.thumbnailUrl;
    this.modelData = data.modelData;
    this.appliances = data.appliances || [];
    this.furniture = data.furniture || [];
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.deletedAt = data.deletedAt;
  }

  /**
   * Check if the kitchen project is a draft
   */
  isDraft(): boolean {
    return this.status === 'draft';
  }

  /**
   * Check if the kitchen project is in progress
   */
  isInProgress(): boolean {
    return this.status === 'in_progress';
  }

  /**
   * Check if the kitchen project is completed
   */
  isCompleted(): boolean {
    return this.status === 'completed';
  }

  /**
   * Check if the kitchen project is archived
   */
  isArchived(): boolean {
    return this.status === 'archived';
  }

  /**
   * Get the total area of the kitchen in square units
   */
  getArea(): number {
    return this.dimensions.width * this.dimensions.length;
  }

  /**
   * Get the volume of the kitchen in cubic units
   */
  getVolume(): number {
    return this.dimensions.width * this.dimensions.length * this.dimensions.height;
  }

  /**
   * Get the total cost of all appliances
   */
  getAppliancesCost(): number {
    return this.appliances.reduce((total, appliance) => {
      return total + appliance.price * appliance.quantity;
    }, 0);
  }

  /**
   * Get the total cost of all furniture
   */
  getFurnitureCost(): number {
    return this.furniture.reduce((total, item) => {
      return total + item.price * item.quantity;
    }, 0);
  }

  /**
   * Get the total estimated cost
   */
  getTotalCost(): number {
    return this.getAppliancesCost() + this.getFurnitureCost();
  }

  /**
   * Check if the project is within budget
   */
  isWithinBudget(): boolean {
    if (!this.budget) return true;
    return this.getTotalCost() <= this.budget;
  }

  /**
   * Get remaining budget
   */
  getRemainingBudget(): number | null {
    if (!this.budget) return null;
    return this.budget - this.getTotalCost();
  }

  /**
   * Get the count of appliances
   */
  getAppliancesCount(): number {
    return this.appliances.reduce((count, appliance) => count + appliance.quantity, 0);
  }

  /**
   * Get the count of furniture items
   */
  getFurnitureCount(): number {
    return this.furniture.reduce((count, item) => count + item.quantity, 0);
  }

  /**
   * Add an appliance to the kitchen
   */
  addAppliance(appliance: ApplianceSelection): void {
    this.appliances.push(appliance);
  }

  /**
   * Remove an appliance from the kitchen
   */
  removeAppliance(applianceId: ID): boolean {
    const index = this.appliances.findIndex((a) => a.id === applianceId);
    if (index !== -1) {
      this.appliances.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Add furniture to the kitchen
   */
  addFurniture(furniture: FurnitureSelection): void {
    this.furniture.push(furniture);
  }

  /**
   * Remove furniture from the kitchen
   */
  removeFurniture(furnitureId: ID): boolean {
    const index = this.furniture.findIndex((f) => f.id === furnitureId);
    if (index !== -1) {
      this.furniture.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Check if the kitchen has 3D model data
   */
  has3DModel(): boolean {
    return !!this.modelData;
  }

  /**
   * Validate design preferences against the kitchen
   */
  matchesPreferences(preferences: DesignPreferences): boolean {
    if (preferences.budget && this.getTotalCost() > preferences.budget) {
      return false;
    }
    return true;
  }

  /**
   * Convert to plain object
   */
  toJSON(): KitchenProject {
    return {
      id: this.id,
      userId: this.userId,
      name: this.name,
      description: this.description,
      shape: this.shape,
      style: this.style,
      roomType: this.roomType,
      dimensions: this.dimensions,
      budget: this.budget,
      currency: this.currency,
      status: this.status,
      thumbnailUrl: this.thumbnailUrl,
      modelData: this.modelData,
      appliances: this.appliances,
      furniture: this.furniture,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    };
  }

  /**
   * Create a new KitchenModel from input data
   */
  static create(input: KitchenCreateInput, id: ID): KitchenModel {
    const now = new Date();
    return new KitchenModel({
      id,
      userId: input.userId,
      name: input.name,
      description: input.description,
      shape: input.shape,
      style: input.style,
      roomType: input.roomType,
      dimensions: input.dimensions,
      budget: input.budget,
      currency: input.currency || 'EUR',
      status: 'draft',
      appliances: [],
      furniture: [],
      createdAt: now,
      updatedAt: now,
    });
  }
}

export default KitchenModel;
