/**
 * Project Model Class
 * Provides methods for working with kitchen project data (alias for KitchenModel)
 * This serves as a general-purpose project model that wraps KitchenProject
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
  ID,
} from '../types';

export type ProjectStatus = 'draft' | 'in_progress' | 'completed' | 'archived';

export interface ProjectCreateInput {
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

export interface ProjectUpdateInput {
  name?: string;
  description?: string | null;
  shape?: KitchenShape;
  style?: KitchenStyle;
  roomType?: RoomType;
  dimensions?: KitchenDimensions;
  budget?: number | null;
  currency?: string;
  status?: ProjectStatus;
  thumbnailUrl?: string | null;
}

export interface ProjectSummary {
  id: ID;
  name: string;
  status: ProjectStatus;
  style: KitchenStyle;
  shape: KitchenShape;
  totalCost: number;
  currency: string;
  itemCount: number;
  thumbnailUrl?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export class ProjectModel implements KitchenProject {
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
  status: ProjectStatus;
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
   * Check if the project is editable
   */
  isEditable(): boolean {
    return this.status === 'draft' || this.status === 'in_progress';
  }

  /**
   * Check if the project is a draft
   */
  isDraft(): boolean {
    return this.status === 'draft';
  }

  /**
   * Check if the project is in progress
   */
  isInProgress(): boolean {
    return this.status === 'in_progress';
  }

  /**
   * Check if the project is completed
   */
  isCompleted(): boolean {
    return this.status === 'completed';
  }

  /**
   * Check if the project is archived
   */
  isArchived(): boolean {
    return this.status === 'archived';
  }

  /**
   * Get the total number of items in the project
   */
  getTotalItemCount(): number {
    const applianceCount = this.appliances.reduce((sum, a) => sum + a.quantity, 0);
    const furnitureCount = this.furniture.reduce((sum, f) => sum + f.quantity, 0);
    return applianceCount + furnitureCount;
  }

  /**
   * Get the total cost of the project
   */
  getTotalCost(): number {
    const applianceCost = this.appliances.reduce((sum, a) => sum + a.price * a.quantity, 0);
    const furnitureCost = this.furniture.reduce((sum, f) => sum + f.price * f.quantity, 0);
    return applianceCost + furnitureCost;
  }

  /**
   * Get the budget utilization percentage
   */
  getBudgetUtilization(): number | null {
    if (!this.budget || this.budget === 0) return null;
    return (this.getTotalCost() / this.budget) * 100;
  }

  /**
   * Check if the project is over budget
   */
  isOverBudget(): boolean {
    if (!this.budget) return false;
    return this.getTotalCost() > this.budget;
  }

  /**
   * Get the floor area in square units
   */
  getFloorArea(): number {
    return this.dimensions.width * this.dimensions.length;
  }

  /**
   * Get a project summary
   */
  getSummary(): ProjectSummary {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      style: this.style,
      shape: this.shape,
      totalCost: this.getTotalCost(),
      currency: this.currency || 'EUR',
      itemCount: this.getTotalItemCount(),
      thumbnailUrl: this.thumbnailUrl,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Get unique brands used in the project
   */
  getUniqueBrands(): string[] {
    const brands = new Set<string>();
    this.appliances.forEach((a) => brands.add(a.brand));
    this.furniture.forEach((f) => brands.add(f.brand));
    return Array.from(brands);
  }

  /**
   * Get unique categories used in the project
   */
  getUniqueCategories(): string[] {
    const categories = new Set<string>();
    this.appliances.forEach((a) => categories.add(a.category));
    this.furniture.forEach((f) => categories.add(f.category));
    return Array.from(categories);
  }

  /**
   * Clone the project with a new ID
   */
  clone(newId: ID, newUserId?: ID): ProjectModel {
    const now = new Date();
    return new ProjectModel({
      ...this.toJSON(),
      id: newId,
      userId: newUserId || this.userId,
      name: `${this.name} (Copy)`,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  /**
   * Check if the project has 3D model data
   */
  has3DModel(): boolean {
    return !!this.modelData;
  }

  /**
   * Add an appliance to the project
   */
  addAppliance(appliance: ApplianceSelection): void {
    this.appliances.push(appliance);
  }

  /**
   * Remove an appliance from the project
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
   * Add furniture to the project
   */
  addFurniture(furniture: FurnitureSelection): void {
    this.furniture.push(furniture);
  }

  /**
   * Remove furniture from the project
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
   * Create a new ProjectModel from input data
   */
  static create(input: ProjectCreateInput, id: ID): ProjectModel {
    const now = new Date();
    return new ProjectModel({
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

export default ProjectModel;
