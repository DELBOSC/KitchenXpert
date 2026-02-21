/**
 * Project Service
 * Handles kitchen project CRUD, collaboration, and project lifecycle
 */

export interface KitchenProject {
  id: string;
  userId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  dimensions: RoomDimensions;
  style?: KitchenStyle;
  budget?: ProjectBudget;
  items: ProjectItem[];
  collaborators: ProjectCollaborator[];
  thumbnail?: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export type ProjectStatus = 'draft' | 'in_progress' | 'review' | 'completed' | 'archived';

export type ProjectVisibility = 'private' | 'shared' | 'public';

export interface RoomDimensions {
  width: number;
  height: number;
  depth: number;
  unit: 'cm' | 'inch';
  shape: 'rectangular' | 'l-shaped' | 'u-shaped' | 'galley' | 'custom';
  customPath?: { x: number; y: number }[];
}

export interface KitchenStyle {
  name: string;
  primaryColor?: string;
  secondaryColor?: string;
  cabinetStyle?: string;
  countertopMaterial?: string;
  floorMaterial?: string;
}

export interface ProjectBudget {
  total: number;
  currency: string;
  breakdown?: {
    cabinets?: number;
    appliances?: number;
    countertops?: number;
    installation?: number;
    other?: number;
  };
}

export interface ProjectItem {
  id: string;
  productId?: string;
  type: ItemType;
  name: string;
  category: string;
  position: Position3D;
  rotation: Rotation3D;
  dimensions: ItemDimensions;
  material?: string;
  color?: string;
  price?: number;
  quantity: number;
  customProperties?: Record<string, unknown>;
}

export type ItemType = 'cabinet' | 'appliance' | 'countertop' | 'sink' | 'faucet' | 'lighting' | 'accessory' | 'custom';

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface Rotation3D {
  x: number;
  y: number;
  z: number;
}

export interface ItemDimensions {
  width: number;
  height: number;
  depth: number;
}

export interface ProjectCollaborator {
  userId: string;
  email: string;
  name: string;
  role: CollaboratorRole;
  addedAt: Date;
  lastAccessAt?: Date;
}

export type CollaboratorRole = 'viewer' | 'editor' | 'owner';

export interface CreateProjectData {
  userId: string;
  name: string;
  description?: string;
  dimensions: RoomDimensions;
  style?: KitchenStyle;
  budget?: ProjectBudget;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
  dimensions?: RoomDimensions;
  style?: KitchenStyle;
  budget?: ProjectBudget;
}

export interface ProjectSearchParams {
  userId?: string;
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: keyof KitchenProject;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedProjects {
  projects: KitchenProject[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProjectRepository {
  findById(id: string): Promise<KitchenProject | null>;
  findByUserId(userId: string, params?: ProjectSearchParams): Promise<PaginatedProjects>;
  create(data: Omit<KitchenProject, 'id' | 'createdAt' | 'updatedAt'>): Promise<KitchenProject>;
  update(id: string, data: Partial<KitchenProject>): Promise<KitchenProject | null>;
  delete(id: string): Promise<boolean>;
  search(params: ProjectSearchParams): Promise<PaginatedProjects>;
  addItem(projectId: string, item: Omit<ProjectItem, 'id'>): Promise<ProjectItem>;
  updateItem(projectId: string, itemId: string, data: Partial<ProjectItem>): Promise<ProjectItem | null>;
  removeItem(projectId: string, itemId: string): Promise<boolean>;
  addCollaborator(projectId: string, collaborator: ProjectCollaborator): Promise<boolean>;
  removeCollaborator(projectId: string, userId: string): Promise<boolean>;
}

export class ProjectService {
  constructor(private repository: ProjectRepository) {}

  /**
   * Create a new project
   */
  async createProject(data: CreateProjectData): Promise<KitchenProject> {
    const project = await this.repository.create({
      userId: data.userId,
      name: data.name,
      description: data.description,
      status: 'draft',
      visibility: 'private',
      dimensions: data.dimensions,
      style: data.style,
      budget: data.budget,
      items: [],
      collaborators: [],
    });

    return project;
  }

  /**
   * Get project by ID
   */
  async getProjectById(id: string): Promise<KitchenProject | null> {
    return this.repository.findById(id);
  }

  /**
   * Get project with access check
   */
  async getProjectWithAccess(id: string, userId: string): Promise<KitchenProject | null> {
    const project = await this.repository.findById(id);

    if (!project) {
      return null;
    }

    // Check access
    if (!this.hasAccess(project, userId)) {
      throw new ProjectServiceError('ACCESS_DENIED', 'You do not have access to this project');
    }

    return project;
  }

  /**
   * Update project
   */
  async updateProject(
    id: string,
    userId: string,
    data: UpdateProjectData
  ): Promise<KitchenProject | null> {
    const project = await this.getProjectWithAccess(id, userId);

    if (!project) {
      return null;
    }

    // Check edit permission
    if (!this.canEdit(project, userId)) {
      throw new ProjectServiceError('EDIT_DENIED', 'You do not have permission to edit this project');
    }

    return this.repository.update(id, {
      ...data,
      updatedAt: new Date(),
    });
  }

  /**
   * Delete project
   */
  async deleteProject(id: string, userId: string): Promise<boolean> {
    const project = await this.repository.findById(id);

    if (!project) {
      return false;
    }

    // Only owner can delete
    if (project.userId !== userId) {
      throw new ProjectServiceError('DELETE_DENIED', 'Only the project owner can delete the project');
    }

    return this.repository.delete(id);
  }

  /**
   * Get user's projects
   */
  async getUserProjects(userId: string, params?: ProjectSearchParams): Promise<PaginatedProjects> {
    return this.repository.findByUserId(userId, params);
  }

  /**
   * Search projects
   */
  async searchProjects(params: ProjectSearchParams): Promise<PaginatedProjects> {
    return this.repository.search(params);
  }

  /**
   * Add item to project
   */
  async addItem(
    projectId: string,
    userId: string,
    item: Omit<ProjectItem, 'id'>
  ): Promise<ProjectItem> {
    const project = await this.getProjectWithAccess(projectId, userId);

    if (!project) {
      throw new ProjectServiceError('PROJECT_NOT_FOUND', 'Project not found');
    }

    if (!this.canEdit(project, userId)) {
      throw new ProjectServiceError('EDIT_DENIED', 'You do not have permission to edit this project');
    }

    const newItem = await this.repository.addItem(projectId, item);

    // Update project timestamp
    await this.repository.update(projectId, { updatedAt: new Date() });

    return newItem;
  }

  /**
   * Update item in project
   */
  async updateItem(
    projectId: string,
    itemId: string,
    userId: string,
    data: Partial<ProjectItem>
  ): Promise<ProjectItem | null> {
    const project = await this.getProjectWithAccess(projectId, userId);

    if (!project) {
      throw new ProjectServiceError('PROJECT_NOT_FOUND', 'Project not found');
    }

    if (!this.canEdit(project, userId)) {
      throw new ProjectServiceError('EDIT_DENIED', 'You do not have permission to edit this project');
    }

    const updatedItem = await this.repository.updateItem(projectId, itemId, data);

    // Update project timestamp
    await this.repository.update(projectId, { updatedAt: new Date() });

    return updatedItem;
  }

  /**
   * Remove item from project
   */
  async removeItem(projectId: string, itemId: string, userId: string): Promise<boolean> {
    const project = await this.getProjectWithAccess(projectId, userId);

    if (!project) {
      throw new ProjectServiceError('PROJECT_NOT_FOUND', 'Project not found');
    }

    if (!this.canEdit(project, userId)) {
      throw new ProjectServiceError('EDIT_DENIED', 'You do not have permission to edit this project');
    }

    const result = await this.repository.removeItem(projectId, itemId);

    // Update project timestamp
    await this.repository.update(projectId, { updatedAt: new Date() });

    return result;
  }

  /**
   * Add collaborator to project
   */
  async addCollaborator(
    projectId: string,
    ownerId: string,
    collaborator: Omit<ProjectCollaborator, 'addedAt'>
  ): Promise<boolean> {
    const project = await this.repository.findById(projectId);

    if (!project) {
      throw new ProjectServiceError('PROJECT_NOT_FOUND', 'Project not found');
    }

    // Only owner can add collaborators
    if (project.userId !== ownerId) {
      throw new ProjectServiceError('ACCESS_DENIED', 'Only the project owner can add collaborators');
    }

    // Check if already a collaborator
    if (project.collaborators.some(c => c.userId === collaborator.userId)) {
      throw new ProjectServiceError('ALREADY_COLLABORATOR', 'User is already a collaborator');
    }

    return this.repository.addCollaborator(projectId, {
      ...collaborator,
      addedAt: new Date(),
    });
  }

  /**
   * Remove collaborator from project
   */
  async removeCollaborator(projectId: string, ownerId: string, collaboratorUserId: string): Promise<boolean> {
    const project = await this.repository.findById(projectId);

    if (!project) {
      throw new ProjectServiceError('PROJECT_NOT_FOUND', 'Project not found');
    }

    // Only owner can remove collaborators
    if (project.userId !== ownerId) {
      throw new ProjectServiceError('ACCESS_DENIED', 'Only the project owner can remove collaborators');
    }

    return this.repository.removeCollaborator(projectId, collaboratorUserId);
  }

  /**
   * Change project status
   */
  async changeStatus(projectId: string, userId: string, status: ProjectStatus): Promise<KitchenProject | null> {
    const project = await this.getProjectWithAccess(projectId, userId);

    if (!project) {
      return null;
    }

    if (!this.canEdit(project, userId)) {
      throw new ProjectServiceError('EDIT_DENIED', 'You do not have permission to edit this project');
    }

    return this.repository.update(projectId, {
      status,
      updatedAt: new Date(),
    });
  }

  /**
   * Change project visibility
   */
  async changeVisibility(
    projectId: string,
    userId: string,
    visibility: ProjectVisibility
  ): Promise<KitchenProject | null> {
    const project = await this.repository.findById(projectId);

    if (!project) {
      return null;
    }

    // Only owner can change visibility
    if (project.userId !== userId) {
      throw new ProjectServiceError('ACCESS_DENIED', 'Only the project owner can change visibility');
    }

    const updateData: Partial<KitchenProject> = {
      visibility,
      updatedAt: new Date(),
    };

    // Set publishedAt when making public for the first time
    if (visibility === 'public' && !project.publishedAt) {
      updateData.publishedAt = new Date();
    }

    return this.repository.update(projectId, updateData);
  }

  /**
   * Duplicate project
   */
  async duplicateProject(projectId: string, userId: string, newName?: string): Promise<KitchenProject> {
    const project = await this.getProjectWithAccess(projectId, userId);

    if (!project) {
      throw new ProjectServiceError('PROJECT_NOT_FOUND', 'Project not found');
    }

    // Create duplicate
    return this.repository.create({
      userId,
      name: newName || `${project.name} (Copy)`,
      description: project.description,
      status: 'draft',
      visibility: 'private',
      dimensions: { ...project.dimensions },
      style: project.style ? { ...project.style } : undefined,
      budget: project.budget ? { ...project.budget } : undefined,
      items: project.items.map(item => ({ ...item, id: undefined as unknown as string })),
      collaborators: [],
    });
  }

  /**
   * Calculate project total
   */
  calculateProjectTotal(project: KitchenProject): number {
    return project.items.reduce((total, item) => {
      return total + (item.price || 0) * item.quantity;
    }, 0);
  }

  /**
   * Check if user has access to project
   */
  private hasAccess(project: KitchenProject, userId: string): boolean {
    // Owner always has access
    if (project.userId === userId) {
      return true;
    }

    // Public projects are accessible to all
    if (project.visibility === 'public') {
      return true;
    }

    // Check if user is a collaborator
    return project.collaborators.some(c => c.userId === userId);
  }

  /**
   * Check if user can edit project
   */
  private canEdit(project: KitchenProject, userId: string): boolean {
    // Owner can always edit
    if (project.userId === userId) {
      return true;
    }

    // Check collaborator role
    const collaborator = project.collaborators.find(c => c.userId === userId);
    return collaborator?.role === 'editor' || collaborator?.role === 'owner';
  }
}

export class ProjectServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'ProjectServiceError';
  }
}

export function createProjectService(repository: ProjectRepository): ProjectService {
  return new ProjectService(repository);
}

export default ProjectService;
