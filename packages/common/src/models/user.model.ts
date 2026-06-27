/**
 * User Model Class
 * Provides methods for working with user data
 */

import {
  User,
  UserRole,
  UserStatus,
  UserCredentials,
  UserRegistration,
  UserProfile,
} from '../types';

export interface UserCreateInput {
  email: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  status?: UserStatus;
  avatar?: string | null;
  phone?: string | null;
  language?: string;
  timezone?: string;
}

export interface UserUpdateInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  status?: UserStatus;
  avatar?: string | null;
  phone?: string | null;
  language?: string;
  timezone?: string;
}

export class UserModel implements User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string | null;
  phone?: string | null;
  language: string;
  timezone: string;
  emailVerified: boolean;
  lastLoginAt?: Date | null;
  metadata?: Record<string, string | number | boolean | null | undefined>;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;

  constructor(data: User) {
    this.id = data.id;
    this.email = data.email;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.role = data.role;
    this.status = data.status;
    this.avatar = data.avatar;
    this.phone = data.phone;
    this.language = data.language;
    this.timezone = data.timezone;
    this.emailVerified = data.emailVerified;
    this.lastLoginAt = data.lastLoginAt;
    this.metadata = data.metadata;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.deletedAt = data.deletedAt;
  }

  /**
   * Get the full name of the user
   */
  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Get the user's initials
   */
  getInitials(): string {
    return `${this.firstName.charAt(0)}${this.lastName.charAt(0)}`.toUpperCase();
  }

  /**
   * Check if the user is active
   */
  isActive(): boolean {
    return this.status === 'active';
  }

  /**
   * Check if the user is an admin
   */
  isAdmin(): boolean {
    return this.role === 'admin';
  }

  /**
   * Check if the user is a partner
   */
  isPartner(): boolean {
    return this.role === 'partner';
  }

  /**
   * Check if the user is a designer
   */
  isDesigner(): boolean {
    return this.role === 'designer';
  }

  /**
   * Check if the user's email is verified
   */
  hasVerifiedEmail(): boolean {
    return this.emailVerified;
  }

  /**
   * Check if the user can perform administrative actions
   */
  canManageUsers(): boolean {
    return this.role === 'admin';
  }

  /**
   * Get the user's profile data
   */
  toProfile(): UserProfile {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      avatar: this.avatar,
      phone: this.phone,
      language: this.language,
      timezone: this.timezone,
    };
  }

  /**
   * Convert to plain object
   */
  toJSON(): User {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      role: this.role,
      status: this.status,
      avatar: this.avatar,
      phone: this.phone,
      language: this.language,
      timezone: this.timezone,
      emailVerified: this.emailVerified,
      lastLoginAt: this.lastLoginAt,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
    };
  }

  /**
   * Create a new UserModel from registration data
   */
  static fromRegistration(registration: UserRegistration, id: string): UserModel {
    const now = new Date();
    return new UserModel({
      id,
      email: registration.email,
      firstName: registration.firstName,
      lastName: registration.lastName,
      role: 'user',
      status: 'pending',
      language: registration.language || 'en',
      timezone: registration.timezone || 'UTC',
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Validate user credentials format
   */
  static validateCredentials(credentials: UserCredentials): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(credentials.email) && credentials.password.length >= 8;
  }
}

export default UserModel;
