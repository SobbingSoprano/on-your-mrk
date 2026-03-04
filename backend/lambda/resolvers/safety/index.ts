/**
 * Safety Resolver Lambda
 * Handles safety-related GraphQL operations
 */

import { AppSyncResolverEvent } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import {
  getItem,
  putItem,
  updateItem,
  deleteItem,
  queryItems,
} from '../../shared/src/dynamodb';
import { getUserId, parseEvent } from '../../shared/src/response';
import { formatError, NotFoundError, ValidationError } from '../../shared/src/errors';
import {
  TrustedContact,
  GeoPoint,
  User,
  Breadcrumb,
  ParkingLocation,
  EmergencyAlert,
} from '../../shared/src/types';
import { validateGeoPoint, validateRequired, validateEmail, validatePhone } from '../../shared/src/validation';

const USERS_TABLE = process.env.USERS_TABLE!;
const TRUSTED_CONTACTS_TABLE = process.env.TRUSTED_CONTACTS_TABLE!;
const ACTIVE_ROUTES_TABLE = process.env.ACTIVE_ROUTES_TABLE!;
const BREADCRUMBS_TABLE = process.env.BREADCRUMBS_TABLE!;
const EMERGENCY_ALERTS_TABLE = process.env.EMERGENCY_ALERTS_TABLE!;
const PARKING_LOCATIONS_TABLE = process.env.PARKING_LOCATIONS_TABLE!;
const EMERGENCY_TOPIC_ARN = process.env.EMERGENCY_TOPIC_ARN!;
const LOCATION_PING_TOPIC_ARN = process.env.LOCATION_PING_TOPIC_ARN!;

const snsClient = new SNSClient({});

export const handler = async (event: AppSyncResolverEvent<any>) => {
  console.log('Safety Resolver:', JSON.stringify(event, null, 2));

  const { fieldName, arguments: args } = parseEvent(event);

  try {
    switch (fieldName) {
      case 'getTrustedContacts':
        return await getTrustedContacts(event);
      case 'addTrustedContact':
        return await addTrustedContact(event, args.input);
      case 'removeTrustedContact':
        return await removeTrustedContact(event, args.contactId);
      case 'triggerEmergency':
        return await triggerEmergency(event, args.input);
      case 'sendLocationPing':
        return await sendLocationPing(event, args.input);
      case 'updateAwolStatus':
        return await updateAwolStatus(event, args.input);
      case 'saveBreadcrumb':
        return await saveBreadcrumb(event, args.input);
      case 'saveParkingLocation':
        return await saveParkingLocation(event, args.input);
      case 'clearParkingLocation':
        return await clearParkingLocation(event);
      default:
        throw new Error(`Unknown field: ${fieldName}`);
    }
  } catch (error) {
    throw formatError(error);
  }
};

async function getTrustedContacts(
  event: AppSyncResolverEvent<any>
): Promise<TrustedContact[]> {
  const userId = getUserId(event);

  const result = await queryItems<TrustedContact>(TRUSTED_CONTACTS_TABLE, {
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
  });

  return result.items;
}

async function addTrustedContact(
  event: AppSyncResolverEvent<any>,
  input: {
    name: string;
    phone?: string;
    email?: string;
    notifyOnEmergency: boolean;
    notifyOnAwol: boolean;
    notifyOnLocationPing: boolean;
  }
): Promise<TrustedContact> {
  const userId = getUserId(event);

  validateRequired(input, ['name']);
  if (!input.phone && !input.email) {
    throw new ValidationError('Either phone or email is required');
  }
  if (input.email) {
    validateEmail(input.email);
  }
  if (input.phone) {
    validatePhone(input.phone);
  }

  const now = new Date().toISOString();
  const contactId = uuidv4();

  const contact: TrustedContact = {
    id: contactId,
    userId,
    name: input.name,
    phone: input.phone,
    email: input.email,
    notifyOnEmergency: input.notifyOnEmergency,
    notifyOnAwol: input.notifyOnAwol,
    notifyOnLocationPing: input.notifyOnLocationPing,
    createdAt: now,
  };

  await putItem(TRUSTED_CONTACTS_TABLE, contact);
  return contact;
}

async function removeTrustedContact(
  event: AppSyncResolverEvent<any>,
  contactId: string
): Promise<boolean> {
  const userId = getUserId(event);
  await deleteItem(TRUSTED_CONTACTS_TABLE, { userId, id: contactId });
  return true;
}

async function triggerEmergency(
  event: AppSyncResolverEvent<any>,
  input: { location: GeoPoint; message?: string }
): Promise<{ success: boolean; alertsSent: number; timestamp: string }> {
  const userId = getUserId(event);
  validateGeoPoint(input.location);

  const now = new Date().toISOString();

  // Get user info
  const user = await getItem<User>(USERS_TABLE, { id: userId });
  if (!user) {
    throw new NotFoundError('User');
  }

  // Get trusted contacts configured for emergency
  const contactsResult = await queryItems<TrustedContact>(TRUSTED_CONTACTS_TABLE, {
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
  });
  const emergencyContacts = contactsResult.items.filter((c) => c.notifyOnEmergency);

  // Create emergency alert record
  const alertId = uuidv4();
  const alert: EmergencyAlert = {
    id: alertId,
    userId,
    userName: user.displayName,
    location: input.location,
    message: input.message || user.safetySettings?.emergencyMessage || 'Emergency alert triggered',
    timestamp: now,
    contactsNotified: emergencyContacts.length,
  };
  await putItem(EMERGENCY_ALERTS_TABLE, alert);

  // Publish to SNS for notification processing
  await snsClient.send(
    new PublishCommand({
      TopicArn: EMERGENCY_TOPIC_ARN,
      Message: JSON.stringify({
        type: 'EMERGENCY',
        alertId,
        userId,
        userName: user.displayName,
        location: input.location,
        message: alert.message,
        contacts: emergencyContacts,
        timestamp: now,
      }),
      Subject: `EMERGENCY: ${user.displayName}`,
    })
  );

  return {
    success: true,
    alertsSent: emergencyContacts.length,
    timestamp: now,
  };
}

async function sendLocationPing(
  event: AppSyncResolverEvent<any>,
  input: { location: GeoPoint; routeId?: string }
): Promise<boolean> {
  const userId = getUserId(event);
  validateGeoPoint(input.location);

  const now = new Date().toISOString();

  // Get user info
  const user = await getItem<User>(USERS_TABLE, { id: userId });
  if (!user) {
    throw new NotFoundError('User');
  }

  // Get contacts configured for location pings
  const contactsResult = await queryItems<TrustedContact>(TRUSTED_CONTACTS_TABLE, {
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
  });
  const pingContacts = contactsResult.items.filter((c) => c.notifyOnLocationPing);

  if (pingContacts.length === 0) {
    return true; // No contacts to ping
  }

  // Publish to SNS
  await snsClient.send(
    new PublishCommand({
      TopicArn: LOCATION_PING_TOPIC_ARN,
      Message: JSON.stringify({
        type: 'LOCATION_PING',
        userId,
        userName: user.displayName,
        location: input.location,
        routeId: input.routeId,
        contacts: pingContacts,
        timestamp: now,
      }),
    })
  );

  return true;
}

async function updateAwolStatus(
  event: AppSyncResolverEvent<any>,
  input: { routeId: string; isActive: boolean; timeoutMinutes?: number }
): Promise<boolean> {
  const userId = getUserId(event);

  const route = await getItem<any>(ACTIVE_ROUTES_TABLE, { id: input.routeId });
  if (!route || route.userId !== userId) {
    throw new NotFoundError('Active route');
  }

  const now = new Date().toISOString();
  const timeoutMinutes = input.timeoutMinutes || 30;
  const awolDeadline = input.isActive
    ? new Date(Date.now() + timeoutMinutes * 60 * 1000).toISOString()
    : undefined;

  await updateItem(
    ACTIVE_ROUTES_TABLE,
    { id: input.routeId },
    {
      safetyState: {
        ...route.safetyState,
        isAwolActive: input.isActive,
        awolDeadline,
        lastServerContact: now,
      },
      awolStatus: input.isActive ? 'ENABLED' : 'DISABLED',
      awolDeadline,
    }
  );

  return true;
}

async function saveBreadcrumb(
  event: AppSyncResolverEvent<any>,
  input: {
    routeId: string;
    location: GeoPoint;
    sequenceNumber: number;
    isOffline: boolean;
  }
): Promise<Breadcrumb> {
  const userId = getUserId(event);
  validateGeoPoint(input.location);

  // Verify route belongs to user
  const route = await getItem<any>(ACTIVE_ROUTES_TABLE, { id: input.routeId });
  if (!route || route.userId !== userId) {
    throw new NotFoundError('Active route');
  }

  const now = new Date().toISOString();
  const breadcrumbId = uuidv4();

  const breadcrumb: Breadcrumb = {
    id: breadcrumbId,
    routeId: input.routeId,
    latitude: input.location.latitude,
    longitude: input.location.longitude,
    altitude: input.location.altitude,
    sequenceNumber: input.sequenceNumber,
    isOffline: input.isOffline,
    timestamp: now,
    // TTL for 7 days
    ttl: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
  };

  await putItem(BREADCRUMBS_TABLE, breadcrumb);

  // Update route safety state
  await updateItem(
    ACTIVE_ROUTES_TABLE,
    { id: input.routeId },
    {
      safetyState: {
        ...route.safetyState,
        breadcrumbCount: (route.safetyState?.breadcrumbCount || 0) + 1,
        lastKnownLocation: input.location,
        lastServerContact: now,
      },
    }
  );

  return breadcrumb;
}

async function saveParkingLocation(
  event: AppSyncResolverEvent<any>,
  input: { location: GeoPoint; address?: string; notes?: string }
): Promise<ParkingLocation> {
  const userId = getUserId(event);
  validateGeoPoint(input.location);

  const now = new Date().toISOString();

  const parking: ParkingLocation = {
    id: uuidv4(),
    userId,
    location: input.location,
    address: input.address,
    notes: input.notes,
    savedAt: now,
    // TTL for 24 hours
    ttl: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
  };

  await putItem(PARKING_LOCATIONS_TABLE, parking);
  return parking;
}

async function clearParkingLocation(
  event: AppSyncResolverEvent<any>
): Promise<boolean> {
  const userId = getUserId(event);
  await deleteItem(PARKING_LOCATIONS_TABLE, { userId });
  return true;
}
