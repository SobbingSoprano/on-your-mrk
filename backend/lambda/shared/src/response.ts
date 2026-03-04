/**
 * Response Utilities for AppSync Lambda Resolvers
 */

import { AppSyncResolverEvent } from 'aws-lambda';
import { UnauthorizedError } from './errors';

export interface AppSyncContext<TArgs = any> {
  fieldName: string;
  arguments: TArgs;
  identity: {
    sub: string;
    username: string;
    claims: Record<string, any>;
  } | null;
  source: any;
}

/**
 * Parse AppSync event into a typed context
 */
export function parseEvent<TArgs = any>(
  event: AppSyncResolverEvent<TArgs>
): AppSyncContext<TArgs> {
  return {
    fieldName: event.info.fieldName,
    arguments: event.arguments,
    identity: event.identity
      ? {
          sub: (event.identity as any).sub || (event.identity as any).username,
          username: (event.identity as any).username,
          claims: (event.identity as any).claims || {},
        }
      : null,
    source: event.source,
  };
}

/**
 * Get the authenticated user ID from the event
 */
export function getUserId(event: AppSyncResolverEvent<any>): string {
  const identity = event.identity as any;
  if (!identity?.sub && !identity?.username) {
    throw new UnauthorizedError('User not authenticated');
  }
  return identity.sub || identity.username;
}

/**
 * Create a paginated response
 */
export function paginatedResponse<T>(
  items: T[],
  nextToken?: string
): { items: T[]; nextToken?: string } {
  return {
    items,
    nextToken: nextToken || undefined,
  };
}
