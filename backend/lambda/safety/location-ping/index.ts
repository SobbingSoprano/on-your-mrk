/**
 * Location Ping Lambda Function
 * Sends periodic location updates to trusted contacts
 */

import { AppSyncResolverEvent } from 'aws-lambda';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { getItem, queryItems } from '../../shared/src/dynamodb';
import { User, TrustedContact, GeoPoint } from '../../shared/src/types';
import { NotFoundError } from '../../shared/src/errors';

const USERS_TABLE = process.env.USERS_TABLE!;
const TRUSTED_CONTACTS_TABLE = process.env.TRUSTED_CONTACTS_TABLE!;
const LOCATION_PING_TOPIC_ARN = process.env.LOCATION_PING_TOPIC_ARN!;

const snsClient = new SNSClient({});

interface LocationPingInput {
  userId: string;
  location: GeoPoint;
  routeId?: string;
}

export const handler = async (event: AppSyncResolverEvent<{ input: LocationPingInput }>) => {
  console.log('Location ping:', JSON.stringify(event, null, 2));

  const { userId, location, routeId } = event.arguments.input;
  const timestamp = new Date().toISOString();

  try {
    // Get user information
    const user = await getItem<User>(USERS_TABLE, { id: userId });
    if (!user) {
      throw new NotFoundError('User');
    }

    // Get trusted contacts configured for location pings
    const contactsResult = await queryItems<TrustedContact>(TRUSTED_CONTACTS_TABLE, {
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
    });
    const pingContacts = contactsResult.items.filter((c) => c.notifyOnLocationPing);

    if (pingContacts.length === 0) {
      console.log('No contacts configured for location pings');
      return { success: true, contactsNotified: 0 };
    }

    // Send location ping via SNS
    await snsClient.send(
      new PublishCommand({
        TopicArn: LOCATION_PING_TOPIC_ARN,
        Message: JSON.stringify({
          type: 'LOCATION_PING',
          userId,
          userName: user.displayName,
          location,
          routeId,
          contacts: pingContacts,
          timestamp,
        }),
      })
    );

    console.log(`Location ping sent to ${pingContacts.length} contacts`);

    return {
      success: true,
      contactsNotified: pingContacts.length,
      timestamp,
    };
  } catch (error) {
    console.error('Location ping failed:', error);
    throw error;
  }
};
