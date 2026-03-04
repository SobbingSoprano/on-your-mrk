/**
 * Navigation Service Lambda
 * Provides route calculation and turn-by-turn navigation
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GeoPoint } from '../../shared/src/types';
import {
  calculateDistance,
  calculateBearing,
  bearingToDirection,
} from '../../shared/src/geolocation';

const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || '';

// Mapbox API response types
interface MapboxDirectionsResponse {
  routes: Array<{
    geometry: {
      coordinates: Array<[number, number, number?]>;
    };
    distance: number;
    duration: number;
    legs: Array<{
      steps: Array<{
        maneuver: { type: string; modifier?: string };
        name: string;
        distance: number;
        duration: number;
        voiceInstructions?: Array<{ announcement: string }>;
      }>;
    }>;
  }>;
}

interface RouteRequest {
  waypoints: GeoPoint[];
  profile?: 'walking' | 'cycling';
}

interface NavigationInstruction {
  maneuver: string;
  modifier?: string;
  streetName: string;
  distanceMeters: number;
  durationSeconds: number;
  spokenInstruction: string;
}

interface RouteResponse {
  routePath: GeoPoint[];
  distanceMeters: number;
  durationSeconds: number;
  instructions: NavigationInstruction[];
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Navigation service request:', JSON.stringify(event, null, 2));

  try {
    const body = JSON.parse(event.body || '{}') as RouteRequest;

    if (!body.waypoints || body.waypoints.length < 2) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'At least 2 waypoints required' }),
      };
    }

    const route = await calculateRoute(body.waypoints, body.profile || 'walking');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(route),
    };
  } catch (error) {
    console.error('Navigation error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to calculate route' }),
    };
  }
};

async function calculateRoute(
  waypoints: GeoPoint[],
  profile: string
): Promise<RouteResponse> {
  // Format coordinates for Mapbox API
  const coordinates = waypoints
    .map((wp) => `${wp.longitude},${wp.latitude}`)
    .join(';');

  const mapboxUrl = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}`;
  const params = new URLSearchParams({
    access_token: MAPBOX_ACCESS_TOKEN,
    geometries: 'geojson',
    steps: 'true',
    voice_instructions: 'true',
    banner_instructions: 'true',
    overview: 'full',
  });

  const response = await fetch(`${mapboxUrl}?${params}`);

  if (!response.ok) {
    // Fallback to simple straight-line route if Mapbox fails
    console.warn('Mapbox API failed, using fallback route');
    return createFallbackRoute(waypoints);
  }

  const data = (await response.json()) as MapboxDirectionsResponse;

  if (!data.routes || data.routes.length === 0) {
    return createFallbackRoute(waypoints);
  }

  const route = data.routes[0];

  // Extract route path from GeoJSON geometry
  const routePath: GeoPoint[] = route.geometry.coordinates.map(
    ([lon, lat, alt]: [number, number, number?]) => ({
      latitude: lat,
      longitude: lon,
      altitude: alt,
    })
  );

  // Extract navigation instructions
  const instructions: NavigationInstruction[] = [];
  for (const leg of route.legs) {
    for (const step of leg.steps) {
      instructions.push({
        maneuver: step.maneuver.type,
        modifier: step.maneuver.modifier,
        streetName: step.name || 'Unknown',
        distanceMeters: step.distance,
        durationSeconds: step.duration,
        spokenInstruction:
          step.voiceInstructions?.[0]?.announcement ||
          generateSpokenInstruction(step),
      });
    }
  }

  return {
    routePath,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    instructions,
  };
}

function createFallbackRoute(waypoints: GeoPoint[]): RouteResponse {
  // Create simple point-to-point route without external API
  const instructions: NavigationInstruction[] = [];
  let totalDistance = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    const distance = calculateDistance(from, to);
    const bearing = calculateBearing(from, to);
    const direction = bearingToDirection(bearing);

    totalDistance += distance;

    instructions.push({
      maneuver: i === 0 ? 'depart' : 'turn',
      streetName: `Waypoint ${i + 1}`,
      distanceMeters: distance,
      durationSeconds: Math.round(distance / 1.4), // ~5 km/h walking pace
      spokenInstruction: `Head ${direction} for ${Math.round(distance)} meters`,
    });
  }

  // Add arrival instruction
  instructions.push({
    maneuver: 'arrive',
    streetName: 'Destination',
    distanceMeters: 0,
    durationSeconds: 0,
    spokenInstruction: 'You have arrived at your destination',
  });

  return {
    routePath: waypoints,
    distanceMeters: totalDistance,
    durationSeconds: Math.round(totalDistance / 1.4),
    instructions,
  };
}

function generateSpokenInstruction(step: any): string {
  const maneuver = step.maneuver;
  const distance = Math.round(step.distance);
  const streetName = step.name || 'the path';

  switch (maneuver.type) {
    case 'depart':
      return `Head ${maneuver.modifier || 'forward'} on ${streetName}`;
    case 'arrive':
      return `You have arrived at your destination`;
    case 'turn':
      return `Turn ${maneuver.modifier} onto ${streetName}`;
    case 'continue':
      return `Continue on ${streetName} for ${distance} meters`;
    case 'new name':
      return `Continue onto ${streetName}`;
    case 'merge':
      return `Merge ${maneuver.modifier} onto ${streetName}`;
    case 'fork':
      return `Keep ${maneuver.modifier} at the fork onto ${streetName}`;
    case 'roundabout':
      return `Enter the roundabout and take exit onto ${streetName}`;
    default:
      return `In ${distance} meters, ${maneuver.type} onto ${streetName}`;
  }
}
