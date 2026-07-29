import type { Request } from 'express';

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  authUser?: AuthUser;
}

export type FilterOperator = 'eq' | 'neq' | 'ilike' | 'in';

export interface DataFilter {
  column: string;
  operator: FilterOperator;
  value: unknown;
}

export interface RealtimeEvent {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
}

