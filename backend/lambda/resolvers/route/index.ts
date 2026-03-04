/**
 * Route Resolver Lambda
 * Handles active route GraphQL operations
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
import { formatError, NotFoundError, ConflictError, ValidationError } from '../../shared/src/errors';
import { ActiveRoute, GeoPoint, SafetyState, Course } from '../../shared/src/types';
import { validateGeoPoint } from '../../shared/src/validation';
import { calculateDistance } from '../../shared/src/geolocation';

const ACTIVE_ROUTES_TABLE = process.env.ACTIVE_ROUTES_TABLE!;
const ROUTE_HISTORY_TABLE = process.env.ROUTE_HISTORY_TABLE!;
const COURSES_TABLE = process.env.COURSES_TABLE!;
const USERS_TABLE = process.env.USERS_TABLE!;

export const handler = async (event: AppSyncResolverEvent<any>) => {
  console.log('Route Resolver:', JSON.stringify(event, null, 2));

  const { fieldName, arguments: args } = parseEvent(event);

  try {
    switch (fieldName) {
      case 'getActiveRoute':
        return await getActiveRoute(args.id);
      case 'getUserActiveRoute':
        return await getUserActiveRoute(event);
      case 'startRoute':
        return await startRoute(event, args.input);
      case 'updateRouteLocation':
        return await updateRouteLocation(event, args.input);
      case 'pauseRoute':
        return await pauseRoute(event, args.id);
      case 'resumeRoute':
        return await resumeRoute(event, args.id);
      case 'completeRoute':
        return await completeRoute(event, args.id);
      case 'cancelRoute':
        return await cancelRoute(event, args.id);
      default:
        throw new Error(`Unknown field: ${fieldName}`);
    }
  } catch (error) {
    throw formatError(error);
  }
};

async function getActiveRoute(id: string): Promise<ActiveRoute | null> {
  const route = await getItem<ActiveRoute>(ACTIVE_ROUTES_TABLE, { id });
  if (!route) {
    throw new NotFoundError('Active route');
  }
  return route;
}

async function getUserActiveRoute(
  event: AppSyncResolverEvent<any>
): Promise<ActiveRoute | null> {
  const userId = getUserId(event);

  const result = await queryItems<ActiveRoute>(ACTIVE_ROUTES_TABLE, {
    IndexName: 'user-index',
    KeyConditionExpression: 'userId = :userId',
    FilterExpression: '#status IN (:active, :paused, :preparing)',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':userId': userId,
      ':active': 'ACTIVE',
      ':paused': 'PAUSED',
      ':preparing': 'PREPARING',
    },
  });

  return result.items[0] || null;
}

async function startRoute(
  event: AppSyncResolverEvent<any>,
  input: {
    courseId?: string;
    startPoint: GeoPoint;
    enableLocationPinging?: boolean;
    enableAwol?: boolean;
    awolTimeoutMinutes?: number;
  }
): Promise<ActiveRoute> {
  const userId = getUserId(event);
  validateGeoPoint(input.startPoint);

  // Check for existing active route
  const existingRoute = await getUserActiveRoute(event);
  if (existingRoute) {
    throw new ConflictError('You already have an active route. Complete or cancel it first.');
  }

  const now = new Date().toISOString();
  const routeId = uuidv4();

  // Get course details if courseId provided
  let course: Course | null = null;
  let endPoint: GeoPoint | undefined;

  if (input.courseId) {
    course = await getItem<Course>(COURSES_TABLE, { id: input.courseId });
    if (!course) {
      throw new NotFoundError('Course');
    }
    endPoint = course.waypoints[course.waypoints.length - 1];
  }

  // Calculate AWOL deadline
  const awolTimeoutMinutes = input.awolTimeoutMinutes || 30;
  const awolDeadline = input.enableAwol
    ? new Date(Date.now() + awolTimeoutMinutes * 60 * 1000).toISOString()
    : undefined;

  const safetyState: SafetyState = {
    isLocationPinging: input.enableLocationPinging || false,
    isAwolActive: input.enableAwol || false,
    awolDeadline,
    isOffline: false,
    breadcrumbCount: 0,
    lastServerContact: now,
  };

  const activeRoute: ActiveRoute = {
    id: routeId,
    userId,
    courseId: input.courseId,
    status: 'ACTIVE',
    startPoint: input.startPoint,
    endPoint,
    currentLocation: input.startPoint,
    distanceCoveredMeters: 0,
    elevationGainMeters: 0,
    elapsedSeconds: 0,
    estimatedSecondsRemaining: course?.estimatedMinutes ? course.estimatedMinutes * 60 : undefined,
    safetyState,
    startedAt: now,
    lastUpdated: now,
    // TTL for 24 hours after route start
    ttl: Math.floor(Date.now() / 1000) + 86400,
  };

  await putItem(ACTIVE_ROUTES_TABLE, activeRoute);
  return activeRoute;
}

async function updateRouteLocation(
  event: AppSyncResolverEvent<any>,
  input: { routeId: string; location: GeoPoint }
): Promise<ActiveRoute> {
  const userId = getUserId(event);
  validateGeoPoint(input.location);

  const route = await getItem<ActiveRoute>(ACTIVE_ROUTES_TABLE, { id: input.routeId });
  if (!route) {
    throw new NotFoundError('Active route');
  }
  if (route.userId !== userId) {
    throw new NotFoundError('Active route');
  }
  if (route.status !== 'ACTIVE') {
    throw new ValidationError('Route is not active');
  }

  const now = new Date().toISOString();

  // Calculate distance delta
  const distanceDelta = calculateDistance(route.currentLocation, input.location);
  
  // Calculate elapsed time
  const startTime = new Date(route.startedAt).getTime();
  const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

  // Calculate elevation gain
  let elevationGainDelta = 0;
  if (input.location.altitude && route.currentLocation.altitude) {
    const altDiff = input.location.altitude - route.currentLocation.altitude;
    if (altDiff > 0) {
      elevationGainDelta = altDiff;
    }
  }

  // Update AWOL deadline if active
  let updatedSafetyState = { ...route.safetyState };
  if (route.safetyState.isAwolActive && route.safetyState.awolDeadline) {
    // Extend deadline by 30 minutes on each update
    updatedSafetyState.awolDeadline = new Date(
      Date.now() + 30 * 60 * 1000
    ).toISOString();
  }
  updatedSafetyState.lastServerContact = now;
  updatedSafetyState.lastKnownLocation = input.location;

  const updates: Partial<ActiveRoute> = {
    currentLocation: input.location,
    distanceCoveredMeters: route.distanceCoveredMeters + distanceDelta,
    elevationGainMeters: route.elevationGainMeters + elevationGainDelta,
    elapsedSeconds,
    safetyState: updatedSafetyState,
    lastUpdated: now,
  };

  const updatedRoute = await updateItem<ActiveRoute>(
    ACTIVE_ROUTES_TABLE,
    { id: input.routeId },
    updates
  );

  return updatedRoute;
}

async function pauseRoute(
  event: AppSyncResolverEvent<any>,
  id: string
): Promise<ActiveRoute> {
  const userId = getUserId(event);

  const route = await getItem<ActiveRoute>(ACTIVE_ROUTES_TABLE, { id });
  if (!route || route.userId !== userId) {
    throw new NotFoundError('Active route');
  }
  if (route.status !== 'ACTIVE') {
    throw new ValidationError('Route must be active to pause');
  }

  const updatedRoute = await updateItem<ActiveRoute>(
    ACTIVE_ROUTES_TABLE,
    { id },
    { status: 'PAUSED' }
  );

  return updatedRoute;
}

async function resumeRoute(
  event: AppSyncResolverEvent<any>,
  id: string
): Promise<ActiveRoute> {
  const userId = getUserId(event);

  const route = await getItem<ActiveRoute>(ACTIVE_ROUTES_TABLE, { id });
  if (!route || route.userId !== userId) {
    throw new NotFoundError('Active route');
  }
  if (route.status !== 'PAUSED') {
    throw new ValidationError('Route must be paused to resume');
  }

  const now = new Date().toISOString();
  const updatedSafetyState = { ...route.safetyState, lastServerContact: now };

  // Extend AWOL deadline
  if (route.safetyState.isAwolActive) {
    updatedSafetyState.awolDeadline = new Date(
      Date.now() + 30 * 60 * 1000
    ).toISOString();
  }

  const updatedRoute = await updateItem<ActiveRoute>(
    ACTIVE_ROUTES_TABLE,
    { id },
    { status: 'ACTIVE', safetyState: updatedSafetyState }
  );

  return updatedRoute;
}

async function completeRoute(
  event: AppSyncResolverEvent<any>,
  id: string
): Promise<ActiveRoute> {
  const userId = getUserId(event);
  const now = new Date().toISOString();

  const route = await getItem<ActiveRoute>(ACTIVE_ROUTES_TABLE, { id });
  if (!route || route.userId !== userId) {
    throw new NotFoundError('Active route');
  }
  if (route.status === 'COMPLETED' || route.status === 'CANCELLED') {
    throw new ValidationError('Route is already finished');
  }

  // Update route status
  const updatedRoute = await updateItem<ActiveRoute>(
    ACTIVE_ROUTES_TABLE,
    { id },
    {
      status: 'COMPLETED',
      completedAt: now,
      safetyState: { ...route.safetyState, isAwolActive: false, isLocationPinging: false },
    }
  );

  // Save to route history
  await putItem(ROUTE_HISTORY_TABLE, {
    userId,
    completedAt: now,
    routeId: id,
    courseId: route.courseId,
    distanceCoveredMeters: route.distanceCoveredMeters,
    elevationGainMeters: route.elevationGainMeters,
    elapsedSeconds: route.elapsedSeconds,
    startedAt: route.startedAt,
  });

  return updatedRoute;
}

async function cancelRoute(
  event: AppSyncResolverEvent<any>,
  id: string
): Promise<ActiveRoute> {
  const userId = getUserId(event);
  const now = new Date().toISOString();

  const route = await getItem<ActiveRoute>(ACTIVE_ROUTES_TABLE, { id });
  if (!route || route.userId !== userId) {
    throw new NotFoundError('Active route');
  }
  if (route.status === 'COMPLETED' || route.status === 'CANCELLED') {
    throw new ValidationError('Route is already finished');
  }

  const updatedRoute = await updateItem<ActiveRoute>(
    ACTIVE_ROUTES_TABLE,
    { id },
    {
      status: 'CANCELLED',
      completedAt: now,
      safetyState: { ...route.safetyState, isAwolActive: false, isLocationPinging: false },
    }
  );

  return updatedRoute;
}
