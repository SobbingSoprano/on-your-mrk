/**
 * dis'Course' Resolver Lambda
 * Handles collaborative course session operations
 */

import { AppSyncResolverEvent } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import {
  getItem,
  putItem,
  updateItem,
  queryItems,
} from '../../shared/src/dynamodb';
import { getUserId, parseEvent, paginatedResponse } from '../../shared/src/response';
import {
  formatError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from '../../shared/src/errors';
import {
  DiscourseSession,
  DiscourseParticipant,
  DiscourseSegment,
  Course,
  User,
  GeoPoint,
} from '../../shared/src/types';
import { validateRequired } from '../../shared/src/validation';
import { calculateDistance, calculateRouteDistance } from '../../shared/src/geolocation';

const DISCOURSE_SESSIONS_TABLE = process.env.DISCOURSE_SESSIONS_TABLE!;
const COURSES_TABLE = process.env.COURSES_TABLE!;
const USERS_TABLE = process.env.USERS_TABLE!;

export const handler = async (event: AppSyncResolverEvent<any>) => {
  console.log('dis\'Course\' Resolver:', JSON.stringify(event, null, 2));

  const { fieldName, arguments: args } = parseEvent(event);

  try {
    switch (fieldName) {
      case 'getDiscourseSession':
        return await getDiscourseSession(args.id);
      case 'listDiscourseSessions':
        return await listDiscourseSessions(event, args.filter);
      case 'createDiscourseSession':
        return await createDiscourseSession(event, args.input);
      case 'joinDiscourseSession':
        return await joinDiscourseSession(event, args.sessionId);
      case 'leaveDiscourseSession':
        return await leaveDiscourseSession(event, args.sessionId);
      case 'startDiscourseSession':
        return await startDiscourseSession(event, args.sessionId);
      case 'updateSegmentStatus':
        return await updateSegmentStatus(event, args.input);
      case 'endDiscourseSession':
        return await endDiscourseSession(event, args.sessionId);
      default:
        throw new Error(`Unknown field: ${fieldName}`);
    }
  } catch (error) {
    throw formatError(error);
  }
};

async function getDiscourseSession(id: string): Promise<DiscourseSession | null> {
  const session = await getItem<DiscourseSession>(DISCOURSE_SESSIONS_TABLE, { id });
  if (!session) {
    throw new NotFoundError('Session');
  }
  return session;
}

async function listDiscourseSessions(
  event: AppSyncResolverEvent<any>,
  filter?: { status?: string; hostUserId?: string; participantUserId?: string }
): Promise<DiscourseSession[]> {
  const userId = getUserId(event);

  // Build filter expression
  const conditions: string[] = [];
  const expressionValues: Record<string, any> = {};

  if (filter?.status) {
    conditions.push('#status = :status');
    expressionValues[':status'] = filter.status;
  }
  if (filter?.hostUserId) {
    conditions.push('hostUserId = :hostUserId');
    expressionValues[':hostUserId'] = filter.hostUserId;
  }

  const result = await queryItems<DiscourseSession>(DISCOURSE_SESSIONS_TABLE, {
    IndexName: 'host-index',
    KeyConditionExpression: 'hostUserId = :userId',
    ExpressionAttributeValues: { ':userId': filter?.hostUserId || userId },
  });

  return result.items;
}

async function createDiscourseSession(
  event: AppSyncResolverEvent<any>,
  input: {
    name: string;
    courseId: string;
    scheduledStartTime: string;
    segmentCount: number;
  }
): Promise<DiscourseSession> {
  const userId = getUserId(event);

  validateRequired(input, ['name', 'courseId', 'scheduledStartTime', 'segmentCount']);

  if (input.segmentCount < 2 || input.segmentCount > 10) {
    throw new ValidationError('Segment count must be between 2 and 10');
  }

  // Get course
  const course = await getItem<Course>(COURSES_TABLE, { id: input.courseId });
  if (!course) {
    throw new NotFoundError('Course');
  }
  if (!course.isCollaborative && course.creatorId !== userId) {
    throw new ForbiddenError('Course does not allow collaboration');
  }

  // Get user info
  const user = await getItem<User>(USERS_TABLE, { id: userId });
  if (!user) {
    throw new NotFoundError('User');
  }

  const now = new Date().toISOString();
  const sessionId = uuidv4();

  // Divide course into segments
  const segments = divideRouteIntoSegments(course.waypoints, input.segmentCount);

  // Create host as first participant
  const hostParticipant: DiscourseParticipant = {
    userId,
    displayName: user.displayName,
    profileImageUrl: user.profileImageUrl,
    status: 'WAITING',
    assignedSegmentIndex: 0, // Host gets first segment by default
    isVoiceMuted: false,
    joinedAt: now,
  };

  const session: DiscourseSession = {
    id: sessionId,
    hostUserId: userId,
    name: input.name,
    courseId: input.courseId,
    participants: [hostParticipant],
    segments,
    status: 'PLANNING',
    scheduledStartTime: input.scheduledStartTime,
    createdAt: now,
  };

  await putItem(DISCOURSE_SESSIONS_TABLE, session);
  return session;
}

function divideRouteIntoSegments(
  waypoints: GeoPoint[],
  segmentCount: number
): DiscourseSegment[] {
  if (waypoints.length < 2) {
    throw new ValidationError('Course must have at least 2 waypoints');
  }

  const totalDistance = calculateRouteDistance(waypoints);
  const segmentDistance = totalDistance / segmentCount;

  const segments: DiscourseSegment[] = [];
  let currentDistance = 0;
  let segmentStartIndex = 0;

  for (let i = 0; i < segmentCount; i++) {
    const targetDistance = (i + 1) * segmentDistance;

    // Find the waypoint that crosses the target distance
    let segmentEndIndex = segmentStartIndex;
    let distanceToHere = currentDistance;

    for (let j = segmentStartIndex; j < waypoints.length - 1; j++) {
      const legDistance = calculateDistance(waypoints[j], waypoints[j + 1]);
      distanceToHere += legDistance;
      segmentEndIndex = j + 1;

      if (distanceToHere >= targetDistance || j === waypoints.length - 2) {
        break;
      }
    }

    segments.push({
      index: i,
      startPoint: waypoints[segmentStartIndex],
      endPoint: waypoints[segmentEndIndex],
      distanceMeters: distanceToHere - currentDistance,
      status: 'PENDING',
    });

    currentDistance = distanceToHere;
    segmentStartIndex = segmentEndIndex;
  }

  return segments;
}

async function joinDiscourseSession(
  event: AppSyncResolverEvent<any>,
  sessionId: string
): Promise<DiscourseSession> {
  const userId = getUserId(event);

  const session = await getItem<DiscourseSession>(DISCOURSE_SESSIONS_TABLE, { id: sessionId });
  if (!session) {
    throw new NotFoundError('Session');
  }
  if (session.status !== 'PLANNING' && session.status !== 'WAITING') {
    throw new ValidationError('Cannot join a session that has already started');
  }

  // Check if user is already a participant
  if (session.participants.some((p) => p.userId === userId)) {
    throw new ConflictError('You are already a participant');
  }

  // Check if session is full
  if (session.participants.length >= session.segments.length) {
    throw new ConflictError('Session is full');
  }

  // Get user info
  const user = await getItem<User>(USERS_TABLE, { id: userId });
  if (!user) {
    throw new NotFoundError('User');
  }

  const now = new Date().toISOString();

  // Assign to next available segment
  const assignedIndex = session.participants.length;

  const newParticipant: DiscourseParticipant = {
    userId,
    displayName: user.displayName,
    profileImageUrl: user.profileImageUrl,
    status: 'WAITING',
    assignedSegmentIndex: assignedIndex,
    isVoiceMuted: false,
    joinedAt: now,
  };

  const updatedParticipants = [...session.participants, newParticipant];
  const updatedSegments = session.segments.map((seg, i) =>
    i === assignedIndex ? { ...seg, assignedUserId: userId } : seg
  );

  const updatedSession = await updateItem<DiscourseSession>(
    DISCOURSE_SESSIONS_TABLE,
    { id: sessionId },
    {
      participants: updatedParticipants,
      segments: updatedSegments,
      status: updatedParticipants.length === updatedSegments.length ? 'WAITING' : 'PLANNING',
    }
  );

  return updatedSession;
}

async function leaveDiscourseSession(
  event: AppSyncResolverEvent<any>,
  sessionId: string
): Promise<boolean> {
  const userId = getUserId(event);

  const session = await getItem<DiscourseSession>(DISCOURSE_SESSIONS_TABLE, { id: sessionId });
  if (!session) {
    throw new NotFoundError('Session');
  }
  if (session.status === 'ACTIVE') {
    throw new ValidationError('Cannot leave an active session');
  }
  if (session.hostUserId === userId) {
    throw new ValidationError('Host cannot leave. Cancel the session instead.');
  }

  const updatedParticipants = session.participants.filter((p) => p.userId !== userId);
  const updatedSegments = session.segments.map((seg) =>
    seg.assignedUserId === userId ? { ...seg, assignedUserId: undefined } : seg
  );

  await updateItem(
    DISCOURSE_SESSIONS_TABLE,
    { id: sessionId },
    {
      participants: updatedParticipants,
      segments: updatedSegments,
      status: 'PLANNING',
    }
  );

  return true;
}

async function startDiscourseSession(
  event: AppSyncResolverEvent<any>,
  sessionId: string
): Promise<DiscourseSession> {
  const userId = getUserId(event);

  const session = await getItem<DiscourseSession>(DISCOURSE_SESSIONS_TABLE, { id: sessionId });
  if (!session) {
    throw new NotFoundError('Session');
  }
  if (session.hostUserId !== userId) {
    throw new ForbiddenError('Only the host can start the session');
  }
  if (session.status !== 'WAITING') {
    throw new ValidationError('Session must be in WAITING status to start');
  }
  if (session.participants.length < 2) {
    throw new ValidationError('Need at least 2 participants to start');
  }

  const now = new Date().toISOString();

  // Start the first segment
  const updatedSegments = session.segments.map((seg, i) =>
    i === 0 ? { ...seg, status: 'ACTIVE' as const, startedAt: now } : seg
  );

  // Update first participant status
  const updatedParticipants = session.participants.map((p, i) =>
    i === 0 ? { ...p, status: 'RUNNING' as const } : { ...p, status: 'WAITING' as const }
  );

  const updatedSession = await updateItem<DiscourseSession>(
    DISCOURSE_SESSIONS_TABLE,
    { id: sessionId },
    {
      status: 'ACTIVE',
      actualStartTime: now,
      segments: updatedSegments,
      participants: updatedParticipants,
      // Generate voice chat channel ID
      voiceChatChannelId: `discourse-${sessionId}`,
    }
  );

  return updatedSession;
}

async function updateSegmentStatus(
  event: AppSyncResolverEvent<any>,
  input: { sessionId: string; segmentIndex: number; status: string }
): Promise<DiscourseSession> {
  const userId = getUserId(event);

  const session = await getItem<DiscourseSession>(DISCOURSE_SESSIONS_TABLE, { id: input.sessionId });
  if (!session) {
    throw new NotFoundError('Session');
  }
  if (session.status !== 'ACTIVE') {
    throw new ValidationError('Session is not active');
  }

  const segment = session.segments[input.segmentIndex];
  if (!segment) {
    throw new NotFoundError('Segment');
  }
  if (segment.assignedUserId !== userId) {
    throw new ForbiddenError('You are not assigned to this segment');
  }

  const now = new Date().toISOString();

  // Update segment status
  const updatedSegments = [...session.segments];
  updatedSegments[input.segmentIndex] = {
    ...segment,
    status: input.status as any,
    completedAt: input.status === 'COMPLETED' ? now : undefined,
  };

  // If segment completed, start next segment
  if (input.status === 'COMPLETED' && input.segmentIndex < session.segments.length - 1) {
    updatedSegments[input.segmentIndex + 1] = {
      ...updatedSegments[input.segmentIndex + 1],
      status: 'ACTIVE',
      startedAt: now,
    };
  }

  // Update participant statuses
  const updatedParticipants = session.participants.map((p) => {
    if (p.assignedSegmentIndex === input.segmentIndex && input.status === 'COMPLETED') {
      return { ...p, status: 'COMPLETED' as const };
    }
    if (p.assignedSegmentIndex === input.segmentIndex + 1 && input.status === 'COMPLETED') {
      return { ...p, status: 'RUNNING' as const };
    }
    return p;
  });

  // Check if all segments completed
  const allCompleted = updatedSegments.every((s) => s.status === 'COMPLETED');

  const updatedSession = await updateItem<DiscourseSession>(
    DISCOURSE_SESSIONS_TABLE,
    { id: input.sessionId },
    {
      segments: updatedSegments,
      participants: updatedParticipants,
      status: allCompleted ? 'COMPLETED' : 'ACTIVE',
      completedAt: allCompleted ? now : undefined,
    }
  );

  return updatedSession;
}

async function endDiscourseSession(
  event: AppSyncResolverEvent<any>,
  sessionId: string
): Promise<DiscourseSession> {
  const userId = getUserId(event);

  const session = await getItem<DiscourseSession>(DISCOURSE_SESSIONS_TABLE, { id: sessionId });
  if (!session) {
    throw new NotFoundError('Session');
  }
  if (session.hostUserId !== userId) {
    throw new ForbiddenError('Only the host can end the session');
  }

  const now = new Date().toISOString();

  const updatedSession = await updateItem<DiscourseSession>(
    DISCOURSE_SESSIONS_TABLE,
    { id: sessionId },
    {
      status: session.status === 'COMPLETED' ? 'COMPLETED' : 'CANCELLED',
      completedAt: now,
    }
  );

  return updatedSession;
}
