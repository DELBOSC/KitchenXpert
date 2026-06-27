/**
 * User Service
 * Handles user CRUD operations, profile management, and user queries
 */

import crypto from 'crypto';

import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = parseInt(process.env['BCRYPT_ROUNDS'] || '12', 10);

function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  return { valid: errors.length === 0, errors };
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  language: string;
  emailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpiresAt?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'user' | 'admin' | 'partner' | 'designer';

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  language?: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  language?: string;
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
  };
  display: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    measurementUnit: 'metric' | 'imperial';
  };
  privacy: {
    profileVisible: boolean;
    showEmail: boolean;
  };
}

export interface UserSearchParams {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  page?: number;
  limit?: number;
  sortBy?: keyof User;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedUsers {
  users: Omit<User, 'passwordHash'>[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByPasswordResetToken(hashedToken: string): Promise<User | null>;
  findByEmailVerificationToken(hashedToken: string): Promise<User | null>;
  create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User | null>;
  delete(id: string): Promise<boolean>;
  search(params: UserSearchParams): Promise<PaginatedUsers>;
  count(filters?: Partial<User>): Promise<number>;
}

export class UserService {
  constructor(private repository: UserRepository) {}

  /**
   * Create a new user
   */
  async createUser(data: CreateUserData): Promise<Omit<User, 'passwordHash'>> {
    // Check if user already exists
    const existingUser = await this.repository.findByEmail(data.email.toLowerCase());
    if (existingUser) {
      throw new UserServiceError('USER_EXISTS', 'A user with this email already exists');
    }

    // Validate password
    const passwordValidation = validatePasswordStrength(data.password);
    if (!passwordValidation.valid) {
      throw new UserServiceError('WEAK_PASSWORD', passwordValidation.errors.join(', '));
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    // Generate email verification token
    const token = crypto.randomBytes(32).toString('hex');
    const emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');

    // Create user
    const user = await this.repository.create({
      email: data.email.toLowerCase(),
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role || 'user',
      status: 'pending',
      language: data.language || 'fr',
      emailVerified: false,
      emailVerificationToken,
    });

    return this.sanitizeUser(user);
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await this.repository.findById(id);
    return user ? this.sanitizeUser(user) : null;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await this.repository.findByEmail(email.toLowerCase());
    return user ? this.sanitizeUser(user) : null;
  }

  /**
   * Get user with password hash (for authentication)
   */
  async getUserForAuth(email: string): Promise<User | null> {
    return this.repository.findByEmail(email.toLowerCase());
  }

  /**
   * Update user profile
   */
  async updateUser(id: string, data: UpdateUserData): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await this.repository.update(id, {
      ...data,
      updatedAt: new Date(),
    });

    return user ? this.sanitizeUser(user) : null;
  }

  /**
   * Update user password
   */
  async updatePassword(id: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.repository.findById(id);
    if (!user) {
      throw new UserServiceError('USER_NOT_FOUND', 'User not found');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new UserServiceError('INVALID_PASSWORD', 'Current password is incorrect');
    }

    // Validate new password
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new UserServiceError('WEAK_PASSWORD', passwordValidation.errors.join(', '));
    }

    // Hash and update password
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.repository.update(id, {
      passwordHash,
      updatedAt: new Date(),
    });

    return true;
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<string | null> {
    const user = await this.repository.findByEmail(email.toLowerCase());
    if (!user) {
      // Don't reveal if user exists
      return null;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.repository.update(user.id, {
      passwordResetToken: hashedToken,
      passwordResetExpiresAt: expiresAt,
    });

    return resetToken;
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    // Validate new password
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new UserServiceError('WEAK_PASSWORD', passwordValidation.errors.join(', '));
    }

    // Hash the incoming token to match against stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with matching reset token
    const user = await this.repository.findByPasswordResetToken(hashedToken);
    if (!user?.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw new UserServiceError('INVALID_TOKEN', 'Password reset token is invalid or expired');
    }

    // Hash and update password, clear reset fields
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.repository.update(user.id, {
      passwordHash,
      passwordResetToken: undefined,
      passwordResetExpiresAt: undefined,
      updatedAt: new Date(),
    });

    return true;
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string): Promise<boolean> {
    // Hash the incoming token to match against stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.repository.findByEmailVerificationToken(hashedToken);
    if (!user) {
      throw new UserServiceError('INVALID_TOKEN', 'Email verification token is invalid');
    }

    await this.repository.update(user.id, {
      emailVerified: true,
      emailVerificationToken: undefined,
      status: 'active',
      updatedAt: new Date(),
    });

    return true;
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    await this.repository.update(id, {
      lastLoginAt: new Date(),
    });
  }

  /**
   * Change user status
   */
  async changeUserStatus(
    id: string,
    status: UserStatus
  ): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await this.repository.update(id, {
      status,
      updatedAt: new Date(),
    });

    return user ? this.sanitizeUser(user) : null;
  }

  /**
   * Change user role
   */
  async changeUserRole(id: string, role: UserRole): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await this.repository.update(id, {
      role,
      updatedAt: new Date(),
    });

    return user ? this.sanitizeUser(user) : null;
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }

  /**
   * Search users with pagination
   */
  async searchUsers(params: UserSearchParams): Promise<PaginatedUsers> {
    return this.repository.search(params);
  }

  /**
   * Get user count
   */
  async getUserCount(filters?: Partial<User>): Promise<number> {
    return this.repository.count(filters);
  }

  /**
   * Remove sensitive fields from user object
   */
  private sanitizeUser(user: User): Omit<User, 'passwordHash'> {
    // Strip the password hash before returning to any caller.
    const { passwordHash: _passwordHash, ...sanitized } = user;
    return sanitized;
  }
}

export class UserServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'UserServiceError';
  }
}

export function createUserService(repository: UserRepository): UserService {
  return new UserService(repository);
}

export default UserService;
