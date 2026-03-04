/**
 * AWOL Monitor Lambda Function (TypeScript)
 * 
 * Runs on a schedule (EventBridge) to check for users
 * who have activated AWOL monitoring and have not returned 
 * within the specified timeout.
 */

import { ScheduledEvent } from 'aws-lambda';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { scanItems, getItem, updateItem, queryItems } from '../../shared/src/dynamodb';
import { ActiveRoute, User, TrustedContact } from '../../shared/src/types';

const ACTIVE_ROUTES_TABLE = process.env.ACTIVE_ROUTES_TABLE!;
const USERS_TABLE = process.env.USERS_TABLE!;
const TRUSTED_CONTACTS_TABLE = process.env.TRUSTED_CONTACTS_TABLE!;
const AWOL_TOPIC_ARN = process.env.AWOL_TOPIC_ARN!;

const snsClient = new SNSClient({});

export const handler = async (event: ScheduledEvent): Promise<any> => {
  console.log('AWOL Monitor running:', new Date().toISOString());

  try {
    // Find all active routes with AWOL enabled that are past deadline
    const awolRoutes = await findAwolRoutes();
    console.log(`Found ${awolRoutes.length} routes past AWOL deadline`);

    // Process each AWOL route
    const results = await Promise.allSettled(
      awolRoutes.map((route) => processAwolRoute(route))
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failedCount = results.filter((r) => r.status === 'rejected').length;

    console.log(`AWOL processing complete: ${successCount} success, ${failedCount} failed`);

    return {
      processed: awolRoutes.length,
      success: successCount,
      failed: failedCount,
    };
  } catch (error) {
    console.error('AWOL Monitor error:', error);
    throw error;
  }
};

async function findAwolRoutes(): Promise<ActiveRoute[]> {
  const now = new Date().toISOString();

  // Scan for active routes where:
  // - Status is ACTIVE or PAUSED
  // - AWOL is enabled
  // - AWOL deadline has passed
  // - Alert has not already been sent
  const result = await scanItems<ActiveRoute & { awolAlertSent?: boolean }>(ACTIVE_ROUTES_TABLE, {
    FilterExpression:
      '(#status = :active OR #status = :paused) AND ' +
      'safetyState.isAwolActive = :true AND ' +
      'safetyState.awolDeadline < :now AND ' +
      'attribute_not_exists(awolAlertSent)',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':active': 'ACTIVE',
      ':paused': 'PAUSED',
      ':true': true,
      ':now': now,
    },
  });

  return result.items;
}

async function processAwolRoute(route: ActiveRoute): Promise<void> {
  console.log(`Processing AWOL for route ${route.id}, user ${route.userId}`);

  // Get user info
  const user = await getItem<User>(USERS_TABLE, { id: route.userId });
  if (!user) {
    console.error(`User not found for route ${route.id}`);
    return;
  }

  // Get trusted contacts configured for AWOL alerts
  const contactsResult = await queryItems<TrustedContact>(TRUSTED_CONTACTS_TABLE, {
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': route.userId },
  });
  const awolContacts = contactsResult.items.filter((c) => c.notifyOnAwol);

  if (awolContacts.length === 0) {
    console.warn(`No AWOL contacts configured for user ${route.userId}`);
    // Still mark as sent to avoid repeated processing
    await markAwolAlertSent(route.id);
    return;
  }

  // Determine last known location
  const lastLocation =
    route.safetyState?.lastKnownLocation || route.currentLocation;

  // Send AWOL alert via SNS
  await snsClient.send(
    new PublishCommand({
      TopicArn: AWOL_TOPIC_ARN,
      Message: JSON.stringify({
        type: 'AWOL',
        userId: route.userId,
        userName: user.displayName,
        routeId: route.id,
        lastLocation,
        lastContact: route.safetyState?.lastServerContact,
        awolDeadline: route.safetyState?.awolDeadline,
        startedAt: route.startedAt,
        contacts: awolContacts,
        timestamp: new Date().toISOString(),
      }),
      Subject: `AWOL Alert: ${user.displayName} may need help`,
    })
  );

  console.log(`AWOL alert sent for user ${route.userId} to ${awolContacts.length} contacts`);

  // Mark alert as sent to avoid duplicate alerts
  await markAwolAlertSent(route.id);
}

async function markAwolAlertSent(routeId: string): Promise<void> {
  await updateItem(
    ACTIVE_ROUTES_TABLE,
    { id: routeId },
    { awolAlertSent: true, awolAlertSentAt: new Date().toISOString() }
  );
}
