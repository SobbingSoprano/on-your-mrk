/**
 * Course Resolver Lambda
 * Handles course-related GraphQL operations
 */

import { AppSyncResolverEvent } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import {
  getItem,
  putItem,
  updateItem,
  deleteItem,
  queryItems,
  scanItems,
} from '../../shared/src/dynamodb';
import { getUserId, parseEvent, paginatedResponse } from '../../shared/src/response';
import { formatError, NotFoundError, ForbiddenError, ValidationError } from '../../shared/src/errors';
import { Course, GeoPoint, TrafficRating, CourseStats } from '../../shared/src/types';
import {
  validateRequired,
  validateGeoPoint,
  validateArrayLength,
  validateEnum,
} from '../../shared/src/validation';
import {
  calculateRouteDistance,
  calculateElevationGain,
  generateGeohash,
  isWithinRadius,
} from '../../shared/src/geolocation';

const COURSES_TABLE = process.env.COURSES_TABLE!;

export const handler = async (event: AppSyncResolverEvent<any>) => {
  console.log('Course Resolver:', JSON.stringify(event, null, 2));

  const { fieldName, arguments: args } = parseEvent(event);

  try {
    switch (fieldName) {
      case 'getCourse':
        return await getCourse(args.id);
      case 'listCourses':
        return await listCourses(args.filter, args.limit, args.nextToken);
      case 'searchCourses':
        return await searchCourses(args.query, args.location, args.radiusMeters);
      case 'getNearbyCourses':
        return await getNearbyCourses(args.location, args.radiusMeters);
      case 'createCourse':
        return await createCourse(event, args.input);
      case 'updateCourse':
        return await updateCourse(event, args.id, args.input);
      case 'deleteCourse':
        return await deleteCourse(event, args.id);
      default:
        throw new Error(`Unknown field: ${fieldName}`);
    }
  } catch (error) {
    throw formatError(error);
  }
};

async function getCourse(id: string): Promise<Course | null> {
  const course = await getItem<Course>(COURSES_TABLE, { id });
  if (!course) {
    throw new NotFoundError('Course');
  }
  return course;
}

async function listCourses(
  filter: any,
  limit: number = 20,
  nextToken?: string
) {
  let filterExpression: string | undefined;
  const expressionValues: Record<string, any> = {};
  const expressionNames: Record<string, string> = {};

  const conditions: string[] = ['isPublic = :isPublic'];
  expressionValues[':isPublic'] = true;

  if (filter) {
    if (filter.difficulty) {
      conditions.push('difficulty = :difficulty');
      expressionValues[':difficulty'] = filter.difficulty;
    }
    if (filter.minDistanceMeters) {
      conditions.push('distanceMeters >= :minDist');
      expressionValues[':minDist'] = filter.minDistanceMeters;
    }
    if (filter.maxDistanceMeters) {
      conditions.push('distanceMeters <= :maxDist');
      expressionValues[':maxDist'] = filter.maxDistanceMeters;
    }
    if (filter.isCollaborative !== undefined) {
      conditions.push('isCollaborative = :isCollab');
      expressionValues[':isCollab'] = filter.isCollaborative;
    }
    if (filter.creatorId) {
      conditions.push('creatorId = :creatorId');
      expressionValues[':creatorId'] = filter.creatorId;
    }
  }

  filterExpression = conditions.join(' AND ');

  const result = await scanItems<Course>(COURSES_TABLE, {
    FilterExpression: filterExpression,
    ExpressionAttributeValues: expressionValues,
    Limit: limit,
    ExclusiveStartKey: nextToken ? JSON.parse(nextToken) : undefined,
  });

  return paginatedResponse(result.items, result.nextToken);
}

async function searchCourses(
  query: string,
  location?: GeoPoint,
  radiusMeters?: number
) {
  // Simple text-based search (would use OpenSearch in production)
  const lowercaseQuery = query.toLowerCase();

  const result = await scanItems<Course>(COURSES_TABLE, {
    FilterExpression: 'isPublic = :isPublic',
    ExpressionAttributeValues: { ':isPublic': true },
  });

  let filtered = result.items.filter(
    (course) =>
      course.name.toLowerCase().includes(lowercaseQuery) ||
      course.description?.toLowerCase().includes(lowercaseQuery) ||
      course.tags?.some((tag) => tag.toLowerCase().includes(lowercaseQuery))
  );

  // Filter by location if provided
  if (location && radiusMeters) {
    validateGeoPoint(location);
    const center: GeoPoint = location;
    filtered = filtered.filter((course) => {
      if (course.waypoints.length === 0) return false;
      return isWithinRadius(course.waypoints[0], center, radiusMeters);
    });
  }

  return paginatedResponse(filtered.slice(0, 20));
}

async function getNearbyCourses(
  location: GeoPoint,
  radiusMeters: number
): Promise<Course[]> {
  validateGeoPoint(location);

  // Generate geohash prefix for area
  const geohash = generateGeohash(location, 4);

  // Query by geohash prefix
  const result = await queryItems<Course>(COURSES_TABLE, {
    IndexName: 'geohash-index',
    KeyConditionExpression: 'begins_with(geohash, :prefix)',
    FilterExpression: 'isPublic = :isPublic',
    ExpressionAttributeValues: {
      ':prefix': geohash.substring(0, 3),
      ':isPublic': true,
    },
  });

  // Filter by exact distance
  const nearby = result.items.filter((course) => {
    if (course.waypoints.length === 0) return false;
    return isWithinRadius(course.waypoints[0], location, radiusMeters);
  });

  return nearby.slice(0, 50);
}

async function createCourse(
  event: AppSyncResolverEvent<any>,
  input: any
): Promise<Course> {
  const userId = getUserId(event);

  // Validate input
  validateRequired(input, ['name', 'waypoints', 'difficulty']);
  validateArrayLength(input.waypoints, 2, 'waypoints');
  input.waypoints.forEach((wp: GeoPoint, i: number) => validateGeoPoint(wp, `waypoints[${i}]`));
  validateEnum(
    input.difficulty,
    ['EASY', 'MODERATE', 'HARD', 'EXPERT'] as const,
    'difficulty'
  );

  const now = new Date().toISOString();
  const courseId = uuidv4();

  // Calculate route metrics
  const distanceMeters = calculateRouteDistance(input.waypoints);
  const elevationGainMeters = calculateElevationGain(input.waypoints);
  const estimatedMinutes = Math.round((distanceMeters / 1000) * 12); // ~5 km/h pace

  // Generate geohash from first waypoint
  const geohash = generateGeohash(input.waypoints[0]);

  const course: Course = {
    id: courseId,
    creatorId: userId,
    name: input.name,
    description: input.description,
    waypoints: input.waypoints,
    routePath: input.waypoints, // Would be expanded by routing service
    distanceMeters,
    elevationGainMeters,
    estimatedMinutes,
    difficulty: input.difficulty,
    trafficRating: {
      pedestrianTraffic: 'MODERATE',
      vehicleTraffic: 'LOW',
      lastUpdated: now,
    },
    stats: {
      completionCount: 0,
      averageRating: 0,
      reviewCount: 0,
      averageCompletionMinutes: estimatedMinutes,
      favoriteCount: 0,
    },
    tags: input.tags || [],
    isPublic: input.isPublic ?? true,
    isCollaborative: input.isCollaborative ?? false,
    shapeDescription: input.shapeDescription,
    geohash,
    createdAt: now,
    updatedAt: now,
  };

  await putItem(COURSES_TABLE, course);
  return course;
}

async function updateCourse(
  event: AppSyncResolverEvent<any>,
  id: string,
  input: any
): Promise<Course> {
  const userId = getUserId(event);

  const course = await getItem<Course>(COURSES_TABLE, { id });
  if (!course) {
    throw new NotFoundError('Course');
  }
  if (course.creatorId !== userId) {
    throw new ForbiddenError('You can only update your own courses');
  }

  // Recalculate metrics if waypoints changed
  let recalculatedFields: Partial<Course> = {};
  if (input.waypoints) {
    validateArrayLength(input.waypoints, 2, 'waypoints');
    input.waypoints.forEach((wp: GeoPoint, i: number) => validateGeoPoint(wp, `waypoints[${i}]`));
    
    recalculatedFields = {
      distanceMeters: calculateRouteDistance(input.waypoints),
      elevationGainMeters: calculateElevationGain(input.waypoints),
      estimatedMinutes: Math.round((calculateRouteDistance(input.waypoints) / 1000) * 12),
      geohash: generateGeohash(input.waypoints[0]),
      routePath: input.waypoints,
    };
  }

  const updatedCourse = await updateItem<Course>(
    COURSES_TABLE,
    { id },
    { ...input, ...recalculatedFields }
  );

  return updatedCourse;
}

async function deleteCourse(
  event: AppSyncResolverEvent<any>,
  id: string
): Promise<boolean> {
  const userId = getUserId(event);

  const course = await getItem<Course>(COURSES_TABLE, { id });
  if (!course) {
    throw new NotFoundError('Course');
  }
  if (course.creatorId !== userId) {
    throw new ForbiddenError('You can only delete your own courses');
  }

  await deleteItem(COURSES_TABLE, { id });
  return true;
}
