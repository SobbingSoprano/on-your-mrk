/**
 * Custom Error Classes
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, code: string, statusCode: number = 400) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
  }
}

export class ServiceError extends AppError {
  constructor(message = 'Internal service error') {
    super(message, 'SERVICE_ERROR', 500);
  }
}

/**
 * Format error for AppSync response
 */
export function formatError(error: unknown): Error {
  if (error instanceof AppError) {
    return error;
  }
  if (error instanceof Error) {
    console.error('Unhandled error:', error);
    return new ServiceError(error.message);
  }
  console.error('Unknown error:', error);
  return new ServiceError('An unexpected error occurred');
}
