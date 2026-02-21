import { Request, Response } from 'express';
import { RoleRepository } from '../../repositories/role-repository';
import { asyncHandler } from '../middleware/error-middleware';
import { prisma } from '../../database/client';
const roleRepository = new RoleRepository(prisma);

/**
 * Role Controller
 * Handles all role-related HTTP requests (Admin only)
 */
export class RoleController {
  /**
   * GET /roles
   * Get all roles
   */
  getAll = asyncHandler(async (_req: Request, res: Response) => {
    const roles = await roleRepository.findAll();
    res.status(200).json({ success: true, data: roles });
  });

  /**
   * GET /roles/:id
   * Get a role by ID
   */
  getById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const role = await roleRepository.findById(id);
    if (!role) {
      res.status(404).json({ success: false, error: 'Role not found' });
      return;
    }
    res.status(200).json({ success: true, data: role });
  });

  /**
   * POST /roles
   * Create a new role
   */
  create = asyncHandler(async (req: Request, res: Response) => {
    const { name, description, permissionIds } = req.body;
    const role = await roleRepository.create({ name, description, permissionIds });
    res.status(201).json({ success: true, data: role, message: 'Role created successfully' });
  });

  /**
   * PUT /roles/:id
   * Update a role
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { name, description, permissionIds } = req.body;
    const role = await roleRepository.update(id, { name, description, permissionIds });
    res.status(200).json({ success: true, data: role, message: 'Role updated successfully' });
  });

  /**
   * DELETE /roles/:id
   * Delete a role
   */
  delete = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    await roleRepository.delete(id);
    res.status(200).json({ success: true, message: 'Role deleted successfully' });
  });

  /**
   * GET /roles/:id/permissions
   * Get permissions for a role
   */
  getPermissions = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const permissions = await roleRepository.getPermissions(id);
    res.status(200).json({ success: true, data: permissions });
  });

  /**
   * PUT /roles/:id/permissions
   * Set permissions for a role
   */
  setPermissions = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { permissionIds } = req.body;
    await roleRepository.setPermissions(id, permissionIds);
    res.status(200).json({ success: true, message: 'Permissions updated successfully' });
  });

  /**
   * POST /roles/:id/permissions/:permissionId
   * Add a permission to a role
   */
  addPermission = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const permissionId = req.params.permissionId as string;
    await roleRepository.addPermission(id, permissionId);
    res.status(200).json({ success: true, message: 'Permission added successfully' });
  });

  /**
   * DELETE /roles/:id/permissions/:permissionId
   * Remove a permission from a role
   */
  removePermission = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const permissionId = req.params.permissionId as string;
    await roleRepository.removePermission(id, permissionId);
    res.status(200).json({ success: true, message: 'Permission removed successfully' });
  });

  /**
   * GET /roles/:id/users
   * Get users with a specific role
   */
  getUsers = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userIds = await roleRepository.getUsersWithRole(id);
    res.status(200).json({ success: true, data: userIds });
  });

  /**
   * POST /users/:userId/roles/:roleId
   * Assign a role to a user
   */
  assignToUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId as string;
    const roleId = req.params.roleId as string;
    await roleRepository.assignToUser(userId, roleId);
    res.status(200).json({ success: true, message: 'Role assigned successfully' });
  });

  /**
   * DELETE /users/:userId/roles/:roleId
   * Remove a role from a user
   */
  removeFromUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId as string;
    const roleId = req.params.roleId as string;
    await roleRepository.removeFromUser(userId, roleId);
    res.status(200).json({ success: true, message: 'Role removed successfully' });
  });

  /**
   * GET /users/:userId/roles
   * Get roles for a user
   */
  getUserRoles = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId as string;
    const roles = await roleRepository.getUserRoles(userId);
    res.status(200).json({ success: true, data: roles });
  });

  /**
   * GET /users/:userId/permissions
   * Get all permissions for a user (through their roles)
   */
  getUserPermissions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId as string;
    const permissions = await roleRepository.getUserPermissions(userId);
    res.status(200).json({ success: true, data: permissions });
  });
}

export const roleController = new RoleController();
export default roleController;
