/**
 * Review Resolver Lambda
 * Handles course review operations
 */

import { AppSyncResolverEvent } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import {
  getItem,
  putItem,
  updateItem,
  deleteItem,
  queryItems,
} from '../../shared/src/dynamodb';
import { getUserId, parseEvent, paginatedResponse } from '../../shared/src/response';
import { formatError, NotFoundError, ForbiddenError, ConflictError } from '../../shared/src/errors';
import { Review, Course } from '../../shared/src/types';
import { validateRequired, validateRating } from '../../shared/src/validation';

const REVIEWS_TABLE = process.env.REVIEWS_TABLE!;
const COURSES_TABLE = process.env.COURSES_TABLE!;

export const handler = async (event: AppSyncResolverEvent<any>) => {
  console.log('Review Resolver:', JSON.stringify(event, null, 2));

  const { fieldName, arguments: args } = parseEvent(event);

  try {
    switch (fieldName) {
      case 'getCourseReviews':
        return await getCourseReviews(args.courseId, args.limit, args.nextToken);
      case 'createReview':
        return await createReview(event, args.input);
      case 'updateReview':
        return await updateReview(event, args.id, args.input);
      case 'deleteReview':
        return await deleteReview(event, args.id);
      default:
        throw new Error(`Unknown field: ${fieldName}`);
    }
  } catch (error) {
    throw formatError(error);
  }
};

async function getCourseReviews(
  courseId: string,
  limit: number = 20,
  nextToken?: string
) {
  const result = await queryItems<Review>(REVIEWS_TABLE, {
    KeyConditionExpression: 'courseId = :courseId',
    ExpressionAttributeValues: { ':courseId': courseId },
    Limit: limit,
    ScanIndexForward: false, // Newest first
    ExclusiveStartKey: nextToken ? JSON.parse(nextToken) : undefined,
  });

  return paginatedResponse(result.items, result.nextToken);
}

async function createReview(
  event: AppSyncResolverEvent<any>,
  input: {
    courseId: string;
    rating: number;
    title?: string;
    comment?: string;
    difficultyAccuracy?: number;
    trafficAccuracy?: number;
  }
): Promise<Review> {
  const userId = getUserId(event);

  validateRequired(input, ['courseId', 'rating']);
  validateRating(input.rating);
  if (input.difficultyAccuracy) validateRating(input.difficultyAccuracy);
  if (input.trafficAccuracy) validateRating(input.trafficAccuracy);

  // Check course exists
  const course = await getItem<Course>(COURSES_TABLE, { id: input.courseId });
  if (!course) {
    throw new NotFoundError('Course');
  }

  // Check user hasn't already reviewed this course
  const existingReviews = await queryItems<Review>(REVIEWS_TABLE, {
    KeyConditionExpression: 'courseId = :courseId',
    FilterExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':courseId': input.courseId,
      ':userId': userId,
    },
  });

  if (existingReviews.items.length > 0) {
    throw new ConflictError('You have already reviewed this course');
  }

  const now = new Date().toISOString();
  const reviewId = uuidv4();

  const review: Review = {
    id: reviewId,
    courseId: input.courseId,
    userId,
    rating: input.rating,
    title: input.title,
    comment: input.comment,
    difficultyAccuracy: input.difficultyAccuracy,
    trafficAccuracy: input.trafficAccuracy,
    createdAt: now,
    updatedAt: now,
  };

  await putItem(REVIEWS_TABLE, review);

  // Update course stats
  await updateCourseStats(input.courseId);

  return review;
}

async function updateReview(
  event: AppSyncResolverEvent<any>,
  id: string,
  input: {
    rating?: number;
    title?: string;
    comment?: string;
    difficultyAccuracy?: number;
    trafficAccuracy?: number;
  }
): Promise<Review> {
  const userId = getUserId(event);

  if (input.rating) validateRating(input.rating);
  if (input.difficultyAccuracy) validateRating(input.difficultyAccuracy);
  if (input.trafficAccuracy) validateRating(input.trafficAccuracy);

  // Need to find the review first to get the courseId (partition key)
  const reviewsByUser = await queryItems<Review>(REVIEWS_TABLE, {
    IndexName: 'user-index',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
  });

  const review = reviewsByUser.items.find((r) => r.id === id);
  if (!review) {
    throw new NotFoundError('Review');
  }
  if (review.userId !== userId) {
    throw new ForbiddenError('You can only update your own reviews');
  }

  const now = new Date().toISOString();

  const updatedReview = await updateItem<Review>(
    REVIEWS_TABLE,
    { courseId: review.courseId, id },
    { ...input, updatedAt: now }
  );

  // Update course stats if rating changed
  if (input.rating) {
    await updateCourseStats(review.courseId);
  }

  return updatedReview;
}

async function deleteReview(
  event: AppSyncResolverEvent<any>,
  id: string
): Promise<boolean> {
  const userId = getUserId(event);

  // Find the review
  const reviewsByUser = await queryItems<Review>(REVIEWS_TABLE, {
    IndexName: 'user-index',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
  });

  const review = reviewsByUser.items.find((r) => r.id === id);
  if (!review) {
    throw new NotFoundError('Review');
  }
  if (review.userId !== userId) {
    throw new ForbiddenError('You can only delete your own reviews');
  }

  await deleteItem(REVIEWS_TABLE, { courseId: review.courseId, id });

  // Update course stats
  await updateCourseStats(review.courseId);

  return true;
}

async function updateCourseStats(courseId: string): Promise<void> {
  // Get all reviews for the course
  const result = await queryItems<Review>(REVIEWS_TABLE, {
    KeyConditionExpression: 'courseId = :courseId',
    ExpressionAttributeValues: { ':courseId': courseId },
  });

  const reviews = result.items;
  const reviewCount = reviews.length;

  if (reviewCount === 0) {
    await updateItem(
      COURSES_TABLE,
      { id: courseId },
      {
        stats: {
          completionCount: 0,
          averageRating: 0,
          reviewCount: 0,
          averageCompletionMinutes: 0,
          favoriteCount: 0,
        },
      }
    );
    return;
  }

  const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
  const averageRating = Math.round((totalRating / reviewCount) * 10) / 10;

  // Get existing course to preserve other stats
  const course = await getItem<Course>(COURSES_TABLE, { id: courseId });
  if (course) {
    await updateItem(
      COURSES_TABLE,
      { id: courseId },
      {
        stats: {
          ...course.stats,
          averageRating,
          reviewCount,
        },
      }
    );
  }
}
