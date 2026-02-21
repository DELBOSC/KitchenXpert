import { BaseEntity, ID, Metadata } from './base.types';

export type UserRole = 'admin' | 'user' | 'partner' | 'designer' | 'manager';

export type UserStatus = 'pending' | 'active' | 'suspended' | 'deleted';

export interface User extends BaseEntity {
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
  metadata?: Metadata;
}

export interface UserCredentials {
  email: string;
  password: string;
}

export interface UserRegistration {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  language?: string;
  timezone?: string;
}

export interface UserProfile {
  id: ID;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  phone?: string | null;
  language: string;
  timezone: string;
}

export interface UserPermission {
  userId: ID;
  resource: string;
  actions: string[];
}
