/**
 * Emergency Alert Lambda Function (TypeScript)
 * Handles emergency button triggers and notifies trusted contacts
 */

import { AppSyncResolverEvent } from 'aws-lambda';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { v4 as uuidv4 } from 'uuid';
import { getItem, putItem, queryItems } from '../../shared/src/dynamodb';
import { User, TrustedContact, GeoPoint, EmergencyAlert } from '../../shared/src/types';
import { NotFoundError } from '../../shared/src/errors';

const USERS_TABLE = process.env.USERS_TABLE!;
const TRUSTED_CONTACTS_TABLE = process.env.TRUSTED_CONTACTS_TABLE!;
const EMERGENCY_ALERTS_TABLE = process.env.EMERGENCY_ALERTS_TABLE!;
const EMERGENCY_TOPIC_ARN = process.env.EMERGENCY_TOPIC_ARN!;

const snsClient = new SNSClient({});

interface EmergencyInput {
  userId: string;
  location: GeoPoint;
  message?: string;
}

export const handler = async (event: AppSyncResolverEvent<{ input: EmergencyInput }>) => {
  console.log('Emergency alert triggered:', JSON.stringify(event, null, 2));

  const { userId, location, message } = event.arguments.input;
  const timestamp = new Date().toISOString();

  try {
    // Get user information
    const user = await getItem<User>(USERS_TABLE, { id: userId });
    if (!user) {
      throw new NotFoundError('User');
    }

    // Get trusted contacts
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
      location,
      message: message || user.safetySettings?.emergencyMessage || 'Emergency alert triggered',
      timestamp,
      contactsNotified: emergencyContacts.length,
    };
    await putItem(EMERGENCY_ALERTS_TABLE, alert);

    // Send notifications via SNS
    await snsClient.send(
      new PublishCommand({
        TopicArn: EMERGENCY_TOPIC_ARN,
        Message: JSON.stringify({
          type: 'EMERGENCY',
          alertId,
          userId,
          userName: user.displayName,
          location,
          message: alert.message,
          contacts: emergencyContacts,
          timestamp,
        }),
        Subject: `EMERGENCY: ${user.displayName}`,
      })
    );

    console.log(`Emergency alert sent to ${emergencyContacts.length} contacts`);

    return {
      success: true,
      alertsSent: emergencyContacts.length,
      timestamp,
    };
  } catch (error) {
    console.error('Emergency alert failed:', error);
    throw error;
  }
};
