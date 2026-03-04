/**
 * Geolocation Utilities
 */

import { GeoPoint } from './types';

const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculate distance between two points using Haversine formula
 */
export function calculateDistance(
  point1: GeoPoint,
  point2: GeoPoint
): number {
  const lat1Rad = toRadians(point1.latitude);
  const lat2Rad = toRadians(point2.latitude);
  const deltaLat = toRadians(point2.latitude - point1.latitude);
  const deltaLon = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculate bearing between two points
 */
export function calculateBearing(
  from: GeoPoint,
  to: GeoPoint
): number {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  const bearing = toDegrees(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

/**
 * Calculate total distance of a route
 */
export function calculateRouteDistance(points: GeoPoint[]): number {
  if (points.length < 2) return 0;

  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += calculateDistance(points[i], points[i + 1]);
  }
  return total;
}

/**
 * Calculate elevation gain from a route
 */
export function calculateElevationGain(points: GeoPoint[]): number {
  if (points.length < 2) return 0;

  let gain = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i].altitude ?? 0;
    const next = points[i + 1].altitude ?? 0;
    if (next > current) {
      gain += next - current;
    }
  }
  return gain;
}

/**
 * Generate a geohash for a point (simplified 4-char precision)
 * Used for geo-based DynamoDB queries
 */
export function generateGeohash(point: GeoPoint, precision = 4): string {
  const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let minLat = -90, maxLat = 90;
  let minLon = -180, maxLon = 180;
  let hash = '';
  let bit = 0;
  let ch = 0;
  let isEven = true;

  while (hash.length < precision) {
    if (isEven) {
      const mid = (minLon + maxLon) / 2;
      if (point.longitude >= mid) {
        ch |= (1 << (4 - bit));
        minLon = mid;
      } else {
        maxLon = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (point.latitude >= mid) {
        ch |= (1 << (4 - bit));
        minLat = mid;
      } else {
        maxLat = mid;
      }
    }

    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      hash += base32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return hash;
}

/**
 * Check if point is within radius of center
 */
export function isWithinRadius(
  point: GeoPoint,
  center: GeoPoint,
  radiusMeters: number
): boolean {
  return calculateDistance(point, center) <= radiusMeters;
}

/**
 * Get the compass direction from bearing
 */
export function bearingToDirection(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

// Helper functions
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}
