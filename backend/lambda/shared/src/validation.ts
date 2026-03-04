/**
 * Input Validation Utilities
 */

import { ValidationError } from './errors';
import { GeoPoint } from './types';

/**
 * Validate required fields exist
 */
export function validateRequired(
  obj: Record<string, any>,
  fields: string[]
): void {
  const missing = fields.filter(
    (field) => obj[field] === undefined || obj[field] === null
  );
  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
  }
}

/**
 * Validate a GeoPoint
 */
export function validateGeoPoint(point: GeoPoint, fieldName = 'location'): void {
  if (!point) {
    throw new ValidationError(`${fieldName} is required`);
  }
  if (typeof point.latitude !== 'number' || point.latitude < -90 || point.latitude > 90) {
    throw new ValidationError(`${fieldName}.latitude must be between -90 and 90`);
  }
  if (typeof point.longitude !== 'number' || point.longitude < -180 || point.longitude > 180) {
    throw new ValidationError(`${fieldName}.longitude must be between -180 and 180`);
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format');
  }
}

/**
 * Validate phone number format
 */
export function validatePhone(phone: string): void {
  // Basic phone validation - allows various formats
  const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
  if (!phoneRegex.test(phone)) {
    throw new ValidationError('Invalid phone number format');
  }
}

/**
 * Validate rating (1-5)
 */
export function validateRating(rating: number): void {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new ValidationError('Rating must be an integer between 1 and 5');
  }
}

/**
 * Validate array has minimum items
 */
export function validateArrayLength(
  arr: any[],
  min: number,
  fieldName: string
): void {
  if (!Array.isArray(arr) || arr.length < min) {
    throw new ValidationError(`${fieldName} must have at least ${min} item(s)`);
  }
}

/**
 * Validate string length
 */
export function validateStringLength(
  str: string,
  min: number,
  max: number,
  fieldName: string
): void {
  if (typeof str !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  if (str.length < min || str.length > max) {
    throw new ValidationError(
      `${fieldName} must be between ${min} and ${max} characters`
    );
  }
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: string,
  validValues: readonly T[],
  fieldName: string
): asserts value is T {
  if (!validValues.includes(value as T)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${validValues.join(', ')}`
    );
  }
}
