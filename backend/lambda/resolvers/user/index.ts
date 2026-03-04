/**
 * User Resolver Lambda
 * Handles user-related GraphQL operations
 */

import { AppSyncResolverEvent } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import {
  getItem,
  putItem,
  updateItem,
  queryItems,
} from '../../shared/src/dynamodb';
import { getUserId, parseEvent } from '../../shared/src/response';
import { formatError, NotFoundError, ValidationError } from '../../shared/src/errors';
import { User, SafetySettings, UserProfile } from '../../shared/src/types';
import { validateRequired, validateEmail } from '../../shared/src/validation';

const USERS_TABLE = process.env.USERS_TABLE!;

export const handler = async (event: AppSyncResolverEvent<any>) => {
  console.log('User Resolver:', JSON.stringify(event, null, 2));

  const { fieldName, arguments: args } = parseEvent(event);

  try {
    switch (fieldName) {
      case 'getUser':
        return await getUser(args.id);
      case 'getCurrentUser':
        return await getCurrentUser(event);
      case 'updateUserProfile':
        return await updateUserProfile(event, args.input);
      case 'updateSafetySettings':
        return await updateSafetySettings(event, args.input);
      default:
        throw new Error(`Unknown field: ${fieldName}`);
    }
  } catch (error) {
    throw formatError(error);
  }
};

async function getUser(id: string): Promise<User | null> {
  const user = await getItem<User>(USERS_TABLE, { id });
  if (!user) {
    throw new NotFoundError('User');
  }
  return user;
}

async function getCurrentUser(event: AppSyncResolverEvent<any>): Promise<User> {
  const userId = getUserId(event);
  const user = await getItem<User>(USERS_TABLE, { id: userId });

  if (!user) {
    // Create new user from Cognito identity
    const identity = event.identity as any;
    const newUser = await createUserFromCognito(userId, identity);
    return newUser;
  }

  return user;
}

async function createUserFromCognito(
  userId: string,
  identity: any
): Promise<User> {
  const now = new Date().toISOString();

  const newUser: User = {
    id: userId,
    email: identity.claims?.email || identity.username,
    displayName: identity.claims?.given_name || identity.username || 'User',
    profile: {
      firstName: identity.claims?.given_name,
      lastName: identity.claims?.family_name,
      fitnessLevel: 'BEGINNER',
    },
    safetySettings: getDefaultSafetySettings(),
    stats: {
      totalDistanceMeters: 0,
      totalTimeSeconds: 0,
      totalRoutes: 0,
      totalCoursesCreated: 0,
      averagePaceMinPerKm: 0,
    },
    createdAt: now,
    updatedAt: now,
  };

  await putItem(USERS_TABLE, newUser);
  return newUser;
}

function getDefaultSafetySettings(): SafetySettings {
  return {
    locationPingingEnabled: false,
    locationPingIntervalSeconds: 60,
    awolEnabled: true,
    awolTimeoutMinutes: 30,
    breadcrumbsEnabled: true,
    breadcrumbIntervalMeters: 50,
    autoOfflineBreadcrumbs: true,
    emergencyButtonEnabled: true,
    emergencyMessage: undefined,
  };
}

async function updateUserProfile(
  event: AppSyncResolverEvent<any>,
  input: Partial<UserProfile>
): Promise<User> {
  const userId = getUserId(event);
  
  // Build update for nested profile object
  const user = await getItem<User>(USERS_TABLE, { id: userId });
  if (!user) {
    throw new NotFoundError('User');
  }

  const updatedProfile = {
    ...user.profile,
    ...input,
  };

  const updatedUser = await updateItem<User>(
    USERS_TABLE,
    { id: userId },
    { profile: updatedProfile }
  );

  return updatedUser;
}

async function updateSafetySettings(
  event: AppSyncResolverEvent<any>,
  input: Partial<SafetySettings>
): Promise<User> {
  const userId = getUserId(event);

  const user = await getItem<User>(USERS_TABLE, { id: userId });
  if (!user) {
    throw new NotFoundError('User');
  }

  // Validate safety settings
  if (input.awolTimeoutMinutes !== undefined && input.awolTimeoutMinutes < 5) {
    throw new ValidationError('AWOL timeout must be at least 5 minutes');
  }
  if (input.locationPingIntervalSeconds !== undefined && input.locationPingIntervalSeconds < 30) {
    throw new ValidationError('Location ping interval must be at least 30 seconds');
  }

  const updatedSettings = {
    ...user.safetySettings,
    ...input,
  };

  const updatedUser = await updateItem<User>(
    USERS_TABLE,
    { id: userId },
    { safetySettings: updatedSettings }
  );

  return updatedUser;
}
